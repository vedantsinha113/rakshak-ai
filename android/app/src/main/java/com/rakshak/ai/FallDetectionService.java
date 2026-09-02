package com.rakshak.ai;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.Locale;

public class FallDetectionService extends Service implements SensorEventListener, TextToSpeech.OnInitListener {

    private static final String TAG = "RakshakGuard";

    // -------- FALL detection (2-stage) --------
    private static final float FREE_FALL_G = 0.55f;
    private static final float IMPACT_G = 2.70f;
    private static final long FREEFALL_WINDOW_MS = 900;

    private boolean inFreeFall = false;
    private long freeFallStart = 0L;

    // -------- Emergency control --------
    private boolean pendingDispatch = false;
    private boolean alertSent = false;
    private int countdown = 0;
    private static final int COUNTDOWN_SECONDS = 10;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable tickRunnable;

    // -------- Sensors --------
    private SensorManager sensorManager;

    // -------- Location cache --------
    private LocationManager locationManager;
    private volatile Location lastLocation = null;

    private final LocationListener locationListener = new LocationListener() {
        @Override public void onLocationChanged(Location location) { lastLocation = location; }
        @Override public void onProviderEnabled(String provider) {}
        @Override public void onProviderDisabled(String provider) {}
        @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    };

    // -------- Audio gating (stable) --------
    private AudioManager audioManager;
    private boolean musicStable = false;
    private int musicOnStreak = 0;
    private int musicOffStreak = 0;

    // -------- Voice --------
    private SpeechRecognizer speechRecognizer;
    private Intent recognizerIntent;

    private boolean voiceEnabled = false;
    private boolean listeningNow = false;
    private long ignoreVoiceUntil = 0L;

    // -------- TTS --------
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    public void onCreate() {
        super.onCreate();

        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);

        startAsForeground(statusText());

        tts = new TextToSpeech(this, this);

        // Accelerometer
        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        Sensor accel = sensorManager != null ? sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) : null;
        if (accel != null) sensorManager.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME);

        // Location
        startLocationUpdatesSafe();

        // Voice
        setupSpeechRecognizer();

        // Periodic control loop (stable, no fast flapping)
        handler.postDelayed(new Runnable() {
            @Override public void run() {
                updateMusicStable();
                updateVoiceState();
                startAsForeground(statusText());
                handler.postDelayed(this, 2000);
            }
        }, 2000);

        // initial
        updateMusicStable();
        updateVoiceState();

        Log.d(TAG, "Service started");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try { if (sensorManager != null) sensorManager.unregisterListener(this); } catch (Exception ignored) {}
        try { if (locationManager != null) locationManager.removeUpdates(locationListener); } catch (Exception ignored) {}

        try {
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
                speechRecognizer.cancel();
                speechRecognizer.destroy();
            }
        } catch (Exception ignored) {}

        try { if (tts != null) { tts.stop(); tts.shutdown(); } } catch (Exception ignored) {}
        try { if (tickRunnable != null) handler.removeCallbacks(tickRunnable); } catch (Exception ignored) {}

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ------------------ LOCATION ------------------
    private void startLocationUpdatesSafe() {
        try {
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) return;

            boolean fine =
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                            == PackageManager.PERMISSION_GRANTED;
            boolean coarse =
                    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                            == PackageManager.PERMISSION_GRANTED;

            if (!fine && !coarse) return;

            try { lastLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER); } catch (Exception ignored) {}
            if (lastLocation == null) {
                try { lastLocation = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER); } catch (Exception ignored) {}
            }

            try { locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 3000, 0, locationListener); } catch (Exception ignored) {}
            try { locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000, 0, locationListener); } catch (Exception ignored) {}

        } catch (Exception ignored) {}
    }

    private Location getBestLocation() {
        return lastLocation;
    }

    // ------------------ FALL DETECTION ------------------
    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (EmergencyDispatcher.isEmergencyActive(this) || pendingDispatch) return;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];

        float g = (float) Math.sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH;
        long now = System.currentTimeMillis();

        if (!inFreeFall && g < FREE_FALL_G) {
            inFreeFall = true;
            freeFallStart = now;
            return;
        }

        if (inFreeFall && (now - freeFallStart > FREEFALL_WINDOW_MS)) {
            inFreeFall = false;
            return;
        }

        if (inFreeFall && g > IMPACT_G) {
            inFreeFall = false;
            startEmergencyCountdown("ROAD_ACCIDENT");
        }
    }

    // ------------------ MUSIC STABILITY ------------------
    private void updateMusicStable() {
        boolean musicNow = false;

        try {
            if (audioManager != null) {
                int mode = audioManager.getMode();
                if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION) {
                    musicNow = true;
                } else {
                    musicNow = audioManager.isMusicActive();
                }
            }
        } catch (Exception ignored) {}

        if (musicNow) {
            musicOnStreak++;
            musicOffStreak = 0;
        } else {
            musicOffStreak++;
            musicOnStreak = 0;
        }

        // MORE stable thresholds to avoid flicker:
        // OFF voice only if music true 3 times (~6 sec)
        // ON voice only if music false 4 times (~8 sec)
        if (!musicStable && musicOnStreak >= 3) musicStable = true;
        else if (musicStable && musicOffStreak >= 4) musicStable = false;
    }

    // ------------------ VOICE gating ------------------
    private boolean shouldListenNow() {
        boolean emergencyOrPending = pendingDispatch || EmergencyDispatcher.isEmergencyActive(this);
        if (emergencyOrPending) return true; // allow cancel voice

        // OFF only when music stable
        return !musicStable;
    }

    private void updateVoiceState() {
        // Permission check
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            voiceEnabled = false;
            stopListening();
            return;
        }

        boolean should = shouldListenNow();

        if (should && !voiceEnabled) {
            voiceEnabled = true;
            maybeStartListening(1500);
        } else if (!should && voiceEnabled) {
            voiceEnabled = false;
            stopListening();
        } else {
            // watchdog restart (slow) if enabled but not currently listening
            if (voiceEnabled && !listeningNow) maybeStartListening(4000);
        }
    }

    // ------------------ VOICE recognition ------------------
    private void setupSpeechRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Log.e(TAG, "Speech recognition not available");
            return;
        }

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);

        recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);

        // Long silence windows => fewer restarts => fewer beeps
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 5000);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3500);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}

            @Override
            public void onError(int error) {
                listeningNow = false;
                Log.w(TAG, "Speech error: " + error);

                if (voiceEnabled) {
                    // big backoff => fewer beeps
                    long delay = 4500;
                    if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) delay = 2500;
                    maybeStartListening(delay);
                }
            }

            @Override
            public void onResults(Bundle results) {
                listeningNow = false;

                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String text = (matches != null && matches.size() > 0) ? matches.get(0) : "";

                float conf = 0.5f;
                try {
                    float[] confs = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
                    if (confs != null && confs.length > 0) conf = confs[0];
                } catch (Exception ignored) {}

                handleVoiceText(text, conf);

                if (voiceEnabled) maybeStartListening(3500);
            }

            @Override public void onPartialResults(Bundle partialResults) {}
            @Override public void onEvent(int eventType, Bundle params) {}
        });
    }

    private void maybeStartListening(long delayMs) {
        handler.postDelayed(() -> {
            if (!voiceEnabled) return;
            if (speechRecognizer == null) return;
            if (listeningNow) return;
            if (System.currentTimeMillis() < ignoreVoiceUntil) return;

            try {
                listeningNow = true;
                speechRecognizer.startListening(recognizerIntent);
            } catch (Exception e) {
                listeningNow = false;
            }
        }, delayMs);
    }

    private void stopListening() {
        listeningNow = false;
        try { if (speechRecognizer != null) speechRecognizer.stopListening(); } catch (Exception ignored) {}
        try { if (speechRecognizer != null) speechRecognizer.cancel(); } catch (Exception ignored) {}
    }

    private String normalize(String raw) {
        if (raw == null) return "";
        String t = raw.toLowerCase(Locale.ROOT).trim();
        t = t.replaceAll("[^a-z\\s']", " ");
        t = t.replaceAll("\\s+", " ").trim();
        return t;
    }

    private void handleVoiceText(String raw, float confidence) {
        long now = System.currentTimeMillis();
        if (now < ignoreVoiceUntil) return;

        String t = normalize(raw);
        if (t.isEmpty()) return;

        boolean emergencyOrPending = pendingDispatch || EmergencyDispatcher.isEmergencyActive(this);

        if (isSafeCommand(t, emergencyOrPending)) {
            if (confidence < 0.35f) return;
            cancelEmergencyByVoice();
            return;
        }

        if (emergencyOrPending) return;

        String detectedType = detectEmergencyType(t);
        if (!"NONE".equals(detectedType)) {
            if (confidence < 0.30f) return;
            startEmergencyCountdown(detectedType);
        }
    }

    private boolean isSafeCommand(String t, boolean emergencyOrPending) {
        if (t.equals("i am safe") || t.equals("im safe") || t.equals("i'm safe")) return true;
        if (t.equals("cancel emergency") || t.equals("stop emergency")) return true;

        if (t.contains("main thik hu") || t.contains("mai thik hu") || t.contains("main theek hu") || t.contains("mai theek hu")) return true;

        if (emergencyOrPending) {
            if (t.equals("cancel") || t.equals("stop") || t.equals("safe")) return true;
        }
        return false;
    }

    private String detectEmergencyType(String t) {
        if (t.contains("heart attack") || t.contains("chest pain") || t.contains("heart pain")) return "HEART_ATTACK";
        if (t.contains("stroke") || t.contains("cannot speak") || t.contains("cant speak")) return "STROKE";
        if (t.contains("vomit") || t.contains("vomiting") || t.contains("dizzy") || t.contains("dizziness") || t.contains("chakkar")) return "UNKNOWN";
        if (t.contains("bleeding") || t.contains("blood")) return "BLEEDING";
        if (t.contains("burn")) return "BURN";
        if (t.contains("fracture") || t.contains("broken")) return "FRACTURE";
        if (t.contains("unconscious") || t.contains("passed out")) return "UNCONSCIOUS";
        if (t.contains("choking") || t.contains("cannot breathe") || t.contains("cant breathe")) return "CHOKING";

        if (t.contains("accident") || t.contains("crash") || t.contains("collision")) return "ROAD_ACCIDENT";
        if (t.contains("help") || t.contains("emergency") || t.contains("bachao")) return "ROAD_ACCIDENT";

        return "NONE";
    }

    // ------------------ EMERGENCY COUNTDOWN (10s) ------------------
    private void startEmergencyCountdown(String emergencyType) {
        pendingDispatch = true;
        alertSent = false;
        countdown = COUNTDOWN_SECONDS;

        EmergencyDispatcher.setEmergencyActive(this, emergencyType);

        speakAndPauseMic("Emergency detected. Alert will be sent in ten seconds.", 1800);

        startAsForeground("EMERGENCY: sending alert in " + countdown + "s");

        tickRunnable = new Runnable() {
            @Override
            public void run() {
                countdown--;
                if (countdown <= 0) {
                    pendingDispatch = false;
                    dispatchEmergency(emergencyType);
                    return;
                }
                startAsForeground("EMERGENCY: sending alert in " + countdown + "s");
                handler.postDelayed(this, 1000);
            }
        };

        handler.postDelayed(tickRunnable, 1000);
    }

    private void dispatchEmergency(String emergencyType) {
        startAsForeground("EMERGENCY active (alert sent)");

        Location loc = getBestLocation();
        EmergencyDispatcher.sendTelegram(this, "EMERGENCY: " + emergencyType, loc);
        alertSent = true;

        EmergencyDispatcher.showEmergencyNotification(this, emergencyType);

        speakAndPauseMic("Alert sent to guardian.", 1500);
    }

    private void cancelEmergencyByVoice() {
        if (pendingDispatch && tickRunnable != null) {
            handler.removeCallbacks(tickRunnable);
            pendingDispatch = false;
        }

        if (alertSent) {
            Location loc = getBestLocation();
            EmergencyDispatcher.sendTelegram(this, "✅ UPDATE: USER IS SAFE", loc);
        }

        alertSent = false;

        EmergencyDispatcher.clearEmergency(this);
        startAsForeground(statusText());

        speakAndPauseMic("Emergency cancelled.", 1200);
    }

    private String statusText() {
        if (pendingDispatch || EmergencyDispatcher.isEmergencyActive(this)) return "Emergency mode (voice ON)";
        if (musicStable) return "Monitoring • Voice OFF (music playing)";
        return "Monitoring • Voice ON";
    }

    private void startAsForeground(String text) {
        final String channelId = "rakshak_monitoring";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Rakshak Monitoring",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, channelId)
                .setContentTitle("Rakshak AI running")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .build();

        startForeground(1, notification);
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            try {
                tts.setLanguage(new Locale("en", "IN"));
                ttsReady = true;
            } catch (Exception ignored) {
                ttsReady = false;
            }
        }
    }

    private void speakNow(String text) {
        try {
            if (ttsReady && tts != null) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "rakshak_tts");
            }
        } catch (Exception ignored) {}
    }

    private void speakAndPauseMic(String text, long ms) {
        ignoreVoiceUntil = System.currentTimeMillis() + ms;
        stopListening();
        speakNow(text);
        handler.postDelayed(this::updateVoiceState, ms);
    }
}