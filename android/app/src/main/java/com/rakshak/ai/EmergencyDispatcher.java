package com.rakshak.ai;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class EmergencyDispatcher {

    private static String getToken(Context ctx) {
        return ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                .getString("rakshak_telegram_token", "");
    }

    private static String getChatId(Context ctx) {
        return ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                .getString("rakshak_telegram_chatid", "");
    }

    // ✅ Emergency state flags (React will read this)
    public static void setEmergencyActive(Context ctx, String type) {
        ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                .edit()
                .putString("rakshak_emergency_active", "1")
                .putString("rakshak_emergency_type", type)
                .putString("rakshak_emergency_ts", String.valueOf(System.currentTimeMillis()))
                .apply();
    }

    public static void clearEmergency(Context ctx) {
        ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                .edit()
                .putString("rakshak_emergency_active", "0")
                .remove("rakshak_emergency_type")
                .remove("rakshak_emergency_ts")
                .apply();
    }

    public static boolean isEmergencyActive(Context ctx) {
        String v = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                .getString("rakshak_emergency_active", "0");
        return "1".equals(v);
    }

    public static void sendTelegram(Context ctx, String event, Location loc) {
        final String token = getToken(ctx);
        final String chatId = getChatId(ctx);
        if (token == null || token.isEmpty() || chatId == null || chatId.isEmpty()) return;

        new Thread(() -> {
            try {
                String text = "🚨 RAKSHAK AI ALERT\n\n" +
                        "Event: " + event + "\n" +
                        "Status: User may be unresponsive\n";

                if (loc != null) {
                    text += "\n📍 Location:\nhttps://maps.google.com/?q=" + loc.getLatitude() + "," + loc.getLongitude();
                } else {
                    text += "\n📍 Location: Not available";
                }

                URL url = new URL("https://api.telegram.org/bot" + token + "/sendMessage");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);

                JSONObject body = new JSONObject();
                body.put("chat_id", chatId);
                body.put("text", text);

                OutputStream os = conn.getOutputStream();
                os.write(body.toString().getBytes());
                os.flush();
                os.close();

                conn.getInputStream().close();
                conn.disconnect();
            } catch (Exception ignored) {}
        }).start();
    }

    // ✅ Tap notification -> open MainActivity + React red mode (via stored flags)
    public static void showEmergencyNotification(Context ctx, String type) {
        final String channelId = "rakshak_emergency";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Rakshak Emergency",
                    NotificationManager.IMPORTANCE_HIGH
            );
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }

        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("rakshak_open_emergency", true);
        intent.putExtra("rakshak_emergency_type", type);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, intent, flags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("🚨 Rakshak AI: Emergency detected")
                .setContentText("Tap to open emergency screen")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);

        NotificationManagerCompat.from(ctx).notify(999, b.build());
    }
}