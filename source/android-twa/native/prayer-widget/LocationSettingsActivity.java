package com.qiblalabs.nativebridge;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;

/**
 * Authenticated, user-initiated bridge to Android's Location settings.
 * It never enables Location itself and never reads or writes coordinates.
 */
public final class LocationSettingsActivity extends Activity {
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
        if (NativeLocationState.isEnabled(this)) {
            returnToLauncher();
            return;
        }
        openLocationSettings();
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

    private boolean expected(Uri data) {
        return data != null
                && "qiblaastro".equals(data.getScheme())
                && "location-settings".equals(data.getHost());
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
