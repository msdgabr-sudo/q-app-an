package com.qiblalabs.azkar;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;

public final class AzkarReminderScheduler {
    public static final String PREFS = "qiblaastro_azkar_native";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_INTERVAL = "interval_minutes";
    public static final String KEY_PHRASE = "phrase_id";
    public static final String KEY_TEXT = "phrase_text";
    public static final String KEY_NEXT_ELAPSED = "next_elapsed_realtime";
    public static final String KEY_LAST_RESULT = "last_result";
    public static final String KEY_NOTIFICATION_ASKED = "notification_permission_asked";
    static final int REQUEST_CODE = 7124;
    public static final int MIN_INTERVAL_MINUTES = 15;
    public static final int DEFAULT_INTERVAL_MINUTES = 15;
    private static final long MIN_FUTURE_MARGIN_MS = 5_000L;

    private AzkarReminderScheduler() {}

    public static boolean start(Context context, int intervalMinutes, String phraseId, String text) {
        int minutes = sanitizeInterval(intervalMinutes);
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit()
                .putBoolean(KEY_ENABLED, true)
                .putInt(KEY_INTERVAL, minutes)
                .putString(KEY_PHRASE, sanitizePhrase(phraseId))
                .putString(KEY_TEXT, text == null ? "ذكر الله" : text)
                .apply();
        boolean scheduled = scheduleAt(context, SystemClock.elapsedRealtime() + minutes * 60_000L);
        if (!scheduled) {
            p.edit().putBoolean(KEY_ENABLED, false).remove(KEY_NEXT_ELAPSED).apply();
        }
        return scheduled;
    }

    public static void stop(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putBoolean(KEY_ENABLED, false)
                .remove(KEY_NEXT_ELAPSED)
                .apply();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) alarmManager.cancel(pendingIntent(context));
    }

    public static void pauseForIssue(Context context, String result) {
        stop(context);
        markResult(context, result);
    }

    public static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false);
    }

    public static int intervalMinutes(Context context) {
        return sanitizeInterval(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getInt(KEY_INTERVAL, DEFAULT_INTERVAL_MINUTES));
    }

    public static String phraseId(Context context) {
        return sanitizePhrase(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_PHRASE, "subhanallah"));
    }

    public static String phraseText(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_TEXT, "ذكر الله");
    }

    public static boolean restore(Context context) {
        if (!isEnabled(context)) return false;
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = SystemClock.elapsedRealtime();
        long target = nextFutureTarget(
                p.getLong(KEY_NEXT_ELAPSED, 0L),
                now,
                intervalMinutes(context));
        return scheduleAt(context, target);
    }

    public static boolean restartAfterBoot(Context context) {
        if (!isEnabled(context)) return false;
        return scheduleAt(context, SystemClock.elapsedRealtime() + intervalMinutes(context) * 60_000L);
    }

    public static boolean scheduleNextFromDelivery(Context context) {
        if (!isEnabled(context)) return false;
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = SystemClock.elapsedRealtime();
        long intervalMs = intervalMinutes(context) * 60_000L;
        long previousTarget = p.getLong(KEY_NEXT_ELAPSED, 0L);
        long candidate = previousTarget > 0L ? previousTarget + intervalMs : now + intervalMs;
        candidate = nextFutureTarget(candidate, now, intervalMinutes(context));
        return scheduleAt(context, candidate);
    }

    static long nextFutureTarget(long candidate, long now, int intervalMinutes) {
        long intervalMs = sanitizeInterval(intervalMinutes) * 60_000L;
        if (candidate <= 0L) candidate = now + intervalMs;
        long minimum = now + MIN_FUTURE_MARGIN_MS;
        if (candidate >= minimum) return candidate;
        long behind = minimum - candidate;
        long steps = (behind + intervalMs - 1L) / intervalMs;
        return candidate + steps * intervalMs;
    }

    private static boolean scheduleAt(Context context, long triggerElapsedRealtime) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;
        try {
            alarmManager.setAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerElapsedRealtime,
                    pendingIntent(context));
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putLong(KEY_NEXT_ELAPSED, triggerElapsedRealtime)
                    .apply();
            return true;
        } catch (RuntimeException failure) {
            return false;
        }
    }

    private static PendingIntent pendingIntent(Context context) {
        Intent intent = new Intent(context, AzkarReminderReceiver.class)
                .setAction("com.qiblalabs.AZKAR_REMINDER");
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static void markResult(Context context, String result) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(KEY_LAST_RESULT, result == null ? "" : result)
                .apply();
    }

    public static int sanitizeInterval(int value) {
        return Math.max(MIN_INTERVAL_MINUTES, Math.min(1440, value));
    }

    public static String sanitizePhrase(String value) {
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
