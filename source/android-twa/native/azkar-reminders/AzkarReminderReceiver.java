package com.qiblalabs.azkar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.qiblalabs.R;

public final class AzkarReminderReceiver extends BroadcastReceiver {
    private static final int NOTIFICATION_ID = 7124;
    private static final String CHANNEL_SUFFIX = "_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!AzkarReminderScheduler.isEnabled(context)) return;
        String phraseId = AzkarReminderScheduler.phraseId(context);
        String phraseText = AzkarReminderScheduler.phraseText(context);
        String issue = channelIssue(context, phraseId);
        if (!issue.isEmpty()) {
            AzkarReminderScheduler.pauseForIssue(context, issue);
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            AzkarReminderScheduler.pauseForIssue(context, "scheduler-error");
            return;
        }

        String channelId = channelIdForPhrase(phraseId);
        Uri sound = soundUri(context, phraseId);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(context.getApplicationInfo().icon)
                .setContentTitle(context.getString(R.string.azkar_notification_title))
                .setContentText(phraseText)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(openAppIntent(context));
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && sound != null) builder.setSound(sound);
        manager.notify(NOTIFICATION_ID, builder.build());

        if (!AzkarReminderScheduler.scheduleNextFromDelivery(context)) {
            AzkarReminderScheduler.pauseForIssue(context, "scheduler-error");
        }
    }

    public static String channelIssue(Context context, String phraseId) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return "scheduler-error";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !manager.areNotificationsEnabled()) {
            return "notifications-disabled";
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return "";

        String id = channelIdForPhrase(phraseId);
        NotificationChannel existing = manager.getNotificationChannel(id);
        if (existing == null) {
            Uri sound = soundUri(context, phraseId);
            if (sound == null) return "audio-missing";
            NotificationChannel created = new NotificationChannel(
                    id,
                    context.getString(R.string.azkar_channel_name),
                    NotificationManager.IMPORTANCE_HIGH);
            created.setDescription(context.getString(R.string.azkar_channel_description));
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();
            created.setSound(sound, attrs);
            manager.createNotificationChannel(created);
            existing = manager.getNotificationChannel(id);
        }
        if (existing == null) return "channel-muted";
        if (existing.getImportance() < NotificationManager.IMPORTANCE_DEFAULT) return "channel-muted";
        if (existing.getSound() == null) return "channel-muted";
        return "";
    }

    public static String channelIdForPhrase(String phraseId) {
        return "azkar_" + AzkarReminderScheduler.sanitizePhrase(phraseId) + CHANNEL_SUFFIX;
    }

    public static String rawNameForPhrase(String phraseId) {
        switch (AzkarReminderScheduler.sanitizePhrase(phraseId)) {
            case "alhamdulillah": return "azkar_alhamdulillah";
            case "allahuakbar": return "azkar_allahuakbar";
            case "lailahaillallah": return "azkar_lailahaillallah";
            case "astaghfirullah": return "azkar_astaghfirullah";
            case "astaghfirullahalazim": return "azkar_astaghfirullahalazim";
            case "subhanallahwabihamdih": return "azkar_subhanallahwabihamdih";
            case "lahawla": return "azkar_lahawla";
            case "hasbiyallah": return "azkar_hasbiyallah";
            case "salat": return "azkar_salat";
            default: return "azkar_subhanallah";
        }
    }

    public static Uri soundUri(Context context, String phraseId) {
        String rawName = rawNameForPhrase(phraseId);
        int rawId = context.getResources().getIdentifier(rawName, "raw", context.getPackageName());
        if (rawId == 0) return null;
        // Keep the persisted channel URI stable by resource name instead of numeric resource ID.
        return Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + rawName);
    }

    private PendingIntent openAppIntent(Context context) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 7125, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
