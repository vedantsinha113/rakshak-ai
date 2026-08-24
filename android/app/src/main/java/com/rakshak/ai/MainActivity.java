package com.rakshak.ai;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int REQ_NOTIF = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // If opened from emergency notification, set emergency flag for React
        handleEmergencyIntent(getIntent());

        // Android 13+ notification permission (needed to show foreground notif)
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        REQ_NOTIF
                );
                return; // service start after permission result
            }
        }

        startFallService();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleEmergencyIntent(intent);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIF) {
            startFallService();
        }
    }

    private void startFallService() {
        Intent i = new Intent(this, FallDetectionService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(i);
        } else {
            startService(i);
        }
    }

    private void handleEmergencyIntent(Intent intent) {
        if (intent == null) return;

        boolean openEmergency = intent.getBooleanExtra("rakshak_open_emergency", false);
        String type = intent.getStringExtra("rakshak_emergency_type");

        if (openEmergency) {
            // store into CapacitorStorage so React can read it
            getSharedPreferences("CapacitorStorage", MODE_PRIVATE)
                    .edit()
                    .putString("rakshak_emergency_active", "1")
                    .putString("rakshak_emergency_type", type != null ? type : "ROAD_ACCIDENT")
                    .putString("rakshak_emergency_ts", String.valueOf(System.currentTimeMillis()))
                    .apply();
        }
    }
}