package com.qiblalabs.nativebridge;

import android.Manifest;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Adds a per-install secret plus confirmed native Adhan/Location state in the URL fragment only. */
public final class QiblaLauncherActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri base = super.getLaunchingUrl();
        String token = NativeBridgeToken.getOrCreate(this);
        boolean locationPermission = NativeLocationState.hasPrecisePermission(this);
        boolean locationService = NativeLocationState.isEnabled(this);
        boolean nativeLocation = locationPermission && locationService;
        boolean notificationsReady = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        boolean nativeAdhan = notificationsReady && PrayerNativeScheduler.nativeActive(this);
        String fragment = "nativeToken=" + Uri.encode(token)
                + "&nativeLocation=" + (nativeLocation ? "1" : "0")
                + "&nativeLocationPermission=" + (locationPermission ? "1" : "0")
                + "&nativeLocationService=" + (locationService ? "1" : "0")
                + "&nativeAdhan=" + (nativeAdhan ? "1" : "0");
        return base.buildUpon().fragment(fragment).build();
    }
}
