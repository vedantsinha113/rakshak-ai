package com.rakshak.ai;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.speech.tts.TextToSpeech;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.Locale;

public class FallDetectionService extends Service implements SensorEventListener, TextToSpeech.OnInitListener {

    private SensorManager sensorManager;

    private long lastUpdate = 0L;
    private float lastX = 0f, lastY = 0f, lastZ = 0f;

    // ✅ false detect kam: threshold increase
    private static final float THRESHOLD = 25f;

    // ✅ spam band: minimum 60 sec gap
    private static final long ALERT_COOLDOWN_MS = 60000L;
    private long lastAlertTime = 0L;

    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    public void onCreate() {
        super.onCreate();

        startAsForeground();

        tts = new TextToSpeech(this, this);

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        Sensor accel = sensorManager != null ? sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) : null;
        if (accel != null) {
            sensorManager.registerListener(this, accel, SensorManager.SENSOR_DELAY_GAME);
        }
    }

    @Override
    public int onStartCommand(android.content.Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try { if (sensorManager != null) sensorManager.unregisterListener(this); } catch (Exception ignored) {}
        try {
            if (tts != null) { tts.stop(); tts.shutdown(); }
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(android.content.Intent intent) {
        return null;
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    public void onSensorChanged(SensorEvent event) {
        long now = System.currentTimeMillis();

        // ✅ If emergency already active, do nothing (until user resets in app)
        if (EmergencyDispatcher.isEmergencyActive(this)) return;

        // ✅ Sampling throttle
        if (now - lastUpdate < 120) return;

        long dt = Math.max(1, now - lastUpdate);
        lastUpdate = now;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];

        float jerk = Math.abs((x + y + z) - (lastX + lastY + lastZ)) / (float) dt * 1000f;

        lastX = x;
        lastY = y;
        lastZ = z;

        // ✅ threshold + cooldown
        if (jerk > THRESHOLD && (now - lastAlertTime) > ALERT_COOLDOWN_MS) {
            lastAlertTime = now;
            handleEmergency();
        }
    }

    private void handleEmergency() {
        // Mark emergency active so it won't repeat until reset
        EmergencyDispatcher.setEmergencyActive(this, "ROAD_ACCIDENT");

        speakNow("Accident detected. Sending alert to guardian.");

        Location loc = getLastKnownLocationSafe(this);

        EmergencyDispatcher.sendTelegram(this, "FALL/CRASH DETECTED", loc);

        // ✅ FIX: this method exists
        EmergencyDispatcher.showEmergencyNotification(this, "ROAD_ACCIDENT");
    }

    private void startAsForeground() {
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
                .setContentText("Monitoring falls in background")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .build();

        startForeground(1, notification);
    }

    private static Location getLastKnownLocationSafe(Context ctx) {
        try {
            LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return null;

            Location gps = null;
            Location net = null;

            try { gps = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER); } catch (Exception ignored) {}
            try { net = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER); } catch (Exception ignored) {}

            if (gps != null) return gps;
            return net;
        } catch (Exception e) {
            return null;
        }
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
}