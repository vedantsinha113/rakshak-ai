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

    private static final int REQ_PERMS = 2001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleEmergencyIntent(getIntent());
        requestNeededPermissionsOrStart();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleEmergencyIntent(intent);
    }

    private void requestNeededPermissionsOrStart() {
        boolean needMic =
                ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED;

        boolean needLoc =
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED
                        && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED;

        boolean needNotif = false;
        if (Build.VERSION.SDK_INT >= 33) {
            needNotif =
                    ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                            != PackageManager.PERMISSION_GRANTED;
        }

        if (needMic || needLoc || needNotif) {
            if (Build.VERSION.SDK_INT >= 33) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{
                                Manifest.permission.RECORD_AUDIO,
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION,
                                Manifest.permission.POST_NOTIFICATIONS
                        },
                        REQ_PERMS
                );
            } else {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{
                                Manifest.permission.RECORD_AUDIO,
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        REQ_PERMS
                );
            }
            return;
        }

        startGuardService();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_PERMS) startGuardService();
    }

    private void startGuardService() {
        Intent i = new Intent(this, FallDetectionService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(i);
        else startService(i);
    }

    private void handleEmergencyIntent(Intent intent) {
        if (intent == null) return;

        boolean openEmergency = intent.getBooleanExtra("rakshak_open_emergency", false);
        String type = intent.getStringExtra("rakshak_emergency_type");

        if (openEmergency) {
            getSharedPreferences("CapacitorStorage", MODE_PRIVATE)
                    .edit()
                    .putString("rakshak_emergency_active", "1")
                    .putString("rakshak_emergency_type", type != null ? type : "ROAD_ACCIDENT")
                    .putString("rakshak_emergency_ts", String.valueOf(System.currentTimeMillis()))
                    .apply();
        }
    }
}