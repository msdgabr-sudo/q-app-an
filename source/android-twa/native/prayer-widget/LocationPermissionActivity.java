package com.qiblalabs.nativebridge;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

/**
 * User-initiated foreground permission bridge for TWA geolocation delegation.
 * It requests Android foreground location permission only; it never reads or
 * stores coordinates and never performs Qibla/prayer/astronomy calculations.
 */
public final class LocationPermissionActivity extends Activity {
    private static final int REQUEST_LOCATION = 4105;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent() == null ? null : getIntent().getData();
        if (!expected(data) || !NativeBridgeToken.valid(this, data.getQueryParameter("token"))) {
            finish();
            return;
        }
        if (hasForegroundLocation()) {
            returnToLauncher();
            return;
        }
        requestPermissions(
                new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                REQUEST_LOCATION
        );
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION) returnToLauncher();
    }

    private boolean expected(Uri data) {
        return data != null
                && "qiblaastro".equals(data.getScheme())
                && "location-permission".equals(data.getHost());
    }

    private boolean hasForegroundLocation() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void returnToLauncher() {
        Intent intent = new Intent(this, QiblaLauncherActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            startActivity(intent);
        } finally {
            finish();
        }
    }
}
