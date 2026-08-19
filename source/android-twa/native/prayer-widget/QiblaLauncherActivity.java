package com.qiblalabs.nativebridge;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Adds the code5 capability marker plus per-install secret and confirmed Native state. */
public final class QiblaLauncherActivity extends LauncherActivity {
    private static final String NATIVE_BRIDGE_VERSION = "5";
    private static final String AZKAR_PREFS = "qiblaastro_azkar_native";
    private static final String AZKAR_ENABLED = "enabled";
    private static final String AZKAR_INTERVAL = "interval_minutes";
    private static final String AZKAR_PHRASE = "phrase_id";
    private static final String AZKAR_LAST_RESULT = "last_result";

    @Override
    protected Uri getLaunchingUrl() {
        Uri base = super.getLaunchingUrl();
        String token = NativeBridgeToken.getOrCreate(this);
        boolean nativeLocation = NativeLocationState.isEnabled(this);
        boolean notificationsReady = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        boolean nativeAdhan = notificationsReady && PrayerNativeScheduler.nativeActive(this);

        SharedPreferences azkar = getSharedPreferences(AZKAR_PREFS, MODE_PRIVATE);
        boolean azkarNotificationsReady = notificationsReady && appNotificationsEnabled();
        boolean azkarEnabled = azkar.getBoolean(AZKAR_ENABLED, false);
        int azkarInterval = Math.max(15, azkar.getInt(AZKAR_INTERVAL, 15));
        String azkarPhrase = safePhrase(azkar.getString(AZKAR_PHRASE, "subhanallah"));
        boolean azkarChannelReady = !azkarEnabled || azkarChannelAudible(azkarPhrase);
        boolean nativeAzkar = azkarEnabled && azkarNotificationsReady && azkarChannelReady;
        String azkarResult = azkar.getString(AZKAR_LAST_RESULT, "");
        String azkarIssue = "";
        if (azkarEnabled && !azkarNotificationsReady) azkarIssue = "notifications-disabled";
        else if (azkarEnabled && !azkarChannelReady) azkarIssue = "channel-muted";
        if (azkarResult != null && !azkarResult.isEmpty()) azkar.edit().remove(AZKAR_LAST_RESULT).apply();

        StringBuilder fragment = new StringBuilder()
                .append("nativeToken=").append(Uri.encode(token))
                .append("&nativeLocation=").append(nativeLocation ? "1" : "0")
                .append("&nativeAdhan=").append(nativeAdhan ? "1" : "0")
                .append("&nativeAzkar=").append(nativeAzkar ? "1" : "0")
                .append("&azkarInterval=").append(azkarInterval)
                .append("&azkarPhrase=").append(Uri.encode(azkarPhrase));
        if (azkarResult != null && !azkarResult.isEmpty()) fragment.append("&azkarResult=").append(Uri.encode(azkarResult));
        if (!azkarIssue.isEmpty()) fragment.append("&azkarIssue=").append(Uri.encode(azkarIssue));

        // Keep the capability marker in the query rather than the fragment so the web
        // can distinguish code5 before invoking any code5-only custom-scheme route.
        return base.buildUpon()
                .appendQueryParameter("nativeBridge", NATIVE_BRIDGE_VERSION)
                .fragment(fragment.toString())
                .build();
    }

    private boolean appNotificationsEnabled() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return true;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return manager == null || manager.areNotificationsEnabled();
    }

    private boolean azkarChannelAudible(String phrase) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return false;
        NotificationChannel channel = manager.getNotificationChannel("azkar_" + safePhrase(phrase) + "_v2");
        return channel != null
                && channel.getImportance() >= NotificationManager.IMPORTANCE_DEFAULT
                && channel.getSound() != null;
    }

    private String safePhrase(String value) {
        if (value == null) return "subhanallah";
        switch (value) {
            case "alhamdulillah":
            case "allahuakbar":
            case "lailahaillallah":
            case "astaghfirullah":
            case "astaghfirullahalazim":
            case "subhanallahwabihamdih":
            case "lahawla":
            case "hasbiyallah":
            case "salat":
            case "subhanallah": return value;
            default: return "subhanallah";
        }
    }
}
