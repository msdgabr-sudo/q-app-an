package com.qiblalabs.nativebridge;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;

/**
 * Authenticated, user-initiated foreground precise-location permission and
 * Android Location-service settings bridge. It never reads coordinates.
 */
public final class LocationSettingsActivity extends Activity {
    private static final int REQ_PRECISE_LOCATION = 4101;
    private static final String PREFS = "qiblaastro_location_permission";
    private static final String KEY_REQUESTED_ONCE = "precise_requested_once";
    private boolean settingsLaunched = false;
    private boolean leftForSettings = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent() == null ? null : getIntent().getData();
        if (!expected(data) || !NativeBridgeToken.valid(this, data.getQueryParameter("token"))) {
            finish();
            return;
        }
        continueLocationFlow();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (settingsLaunched) leftForSettings = true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (settingsLaunched && leftForSettings) returnToLauncher();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_PRECISE_LOCATION) return;
        if (NativeLocationState.hasPrecisePermission(this)) {
            continueLocationFlow();
        } else {
            returnToLauncher();
        }
    }

    private boolean expected(Uri data) {
        return data != null
                && "qiblaastro".equals(data.getScheme())
                && "location-settings".equals(data.getHost());
    }

    private void continueLocationFlow() {
        if (!NativeLocationState.hasPrecisePermission(this)) {
            requestPreciseLocation();
            return;
        }
        if (NativeLocationState.isEnabled(this)) {
            returnToLauncher();
            return;
        }
        openLocationSettings();
    }

    private void requestPreciseLocation() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        boolean requestedOnce = prefs.getBoolean(KEY_REQUESTED_ONCE, false);
        boolean canExplain = shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION);
        if (requestedOnce && !canExplain) {
            openApplicationSettings();
            return;
        }
        prefs.edit().putBoolean(KEY_REQUESTED_ONCE, true).apply();
        requestPermissions(
                new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION},
                REQ_PRECISE_LOCATION
        );
    }

    private void openLocationSettings() {
        try {
            settingsLaunched = true;
            startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
        } catch (ActivityNotFoundException | SecurityException ignored) {
            settingsLaunched = false;
            returnToLauncher();
        }
    }

    private void openApplicationSettings() {
        try {
            settingsLaunched = true;
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getPackageName(), null));
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException ignored) {
            settingsLaunched = false;
            returnToLauncher();
        }
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
