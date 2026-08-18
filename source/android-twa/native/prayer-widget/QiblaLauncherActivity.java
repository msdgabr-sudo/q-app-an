package com.qiblalabs.nativebridge;

import android.Manifest;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Adds a per-install secret and confirmed native Adhan ownership in the URL fragment only. */
public final class QiblaLauncherActivity extends LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri base = super.getLaunchingUrl();
        String token = NativeBridgeToken.getOrCreate(this);
        boolean notificationsReady = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        boolean nativeAdhan = notificationsReady && PrayerNativeScheduler.nativeActive(this);
        String fragment = "nativeToken=" + Uri.encode(token) + "&nativeAdhan=" + (nativeAdhan ? "1" : "0");
        return base.buildUpon().fragment(fragment).build();
    }
}
