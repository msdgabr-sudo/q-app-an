package com.qiblalabs.nativebridge;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;
import java.util.TimeZone;

public final class PrayerNativeScheduler {
    public static final String PREFS = "qiblaastro_prayer_native";
    public static final String[] IDS = {"fajr","dhuhr","asr","maghrib","isha"};
    static final String KEY_PLAN = "plan_v1";
    static final String KEY_NATIVE_ACTIVE = "native_active_v1";
    static final int BASE_REQ = 8400;
    static final int PRE_REQ = 8450;
    private PrayerNativeScheduler() {}

    public static boolean canScheduleExactAlarms(Context context) {
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(am==null)return false;
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
    }

    public static boolean nativeActive(Context context) {
        SharedPreferences p=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        if(!p.getBoolean("enabled",false) || !p.getBoolean(KEY_NATIVE_ACTIVE,false))return false;
        return canScheduleExactAlarms(context);
    }

    public static boolean reschedule(Context context) {
        cancelAll(context);
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean("enabled", false)) {
            p.edit().putBoolean(KEY_NATIVE_ACTIVE,false).apply();
            return true;
        }
        if (!canScheduleExactAlarms(context)) {
            p.edit().putBoolean(KEY_NATIVE_ACTIVE,false).apply();
            return false;
        }
        String tzId = p.getString("timezone", TimeZone.getDefault().getID());
        TimeZone tz = TimeZone.getTimeZone(tzId == null ? TimeZone.getDefault().getID() : tzId);
        long now = System.currentTimeMillis();
        int advance = Math.max(0, Math.min(30, p.getInt("advance", 0)));
        String plan = p.getString(KEY_PLAN, "");
        boolean dateStamped = plan != null && !plan.isEmpty();
        boolean hasEnabledPrayer=false;
        boolean scheduled=true;
        int scheduledPrayerCount=0;
        for (int i=0;i<IDS.length;i++) {
            String id = IDS[i];
            String mode = p.getString("mode_"+id, "off");
            if ("off".equals(mode)) continue;
            hasEnabledPrayer=true;
            long actual;
            if (dateStamped) {
                actual = nextPlannedOccurrence(plan, i, now, tz);
                if (actual <= 0L) continue;
            } else {
                int minute = p.getInt("time_"+id, -1);
                if (minute < 0 || minute >= 1440) continue;
                actual = nextOccurrence(now, minute, tz);
            }
            if(scheduleOne(context, BASE_REQ+i, id, mode, false, actual))scheduledPrayerCount++;else scheduled=false;
            if (advance > 0) {
                long pre = actual - advance*60_000L;
                if (pre > now + 5000L && !scheduleOne(context, PRE_REQ+i, id, "notification", true, pre))scheduled=false;
            }
        }
        boolean active=hasEnabledPrayer&&scheduled&&scheduledPrayerCount>0;
        p.edit().putBoolean(KEY_NATIVE_ACTIVE,active).apply();
        return active;
    }

    private static long nextPlannedOccurrence(String plan, int prayerIndex, long now, TimeZone tz) {
        long best = Long.MAX_VALUE;
        String[] days = plan.split("\\|");
        for (String day : days) {
            String[] pair = day.split(":", 2);
            if (pair.length != 2) continue;
            String[] ymd = pair[0].split("-");
            String[] mins = pair[1].split(",");
            if (ymd.length != 3 || mins.length != IDS.length || prayerIndex < 0 || prayerIndex >= mins.length) continue;
            try {
                int year = Integer.parseInt(ymd[0]);
                int month = Integer.parseInt(ymd[1]);
                int date = Integer.parseInt(ymd[2]);
                int minute = Integer.parseInt(mins[prayerIndex]);
                if (minute < 0 || minute >= 1440) continue;
                Calendar c = Calendar.getInstance(tz);
                c.clear();
                c.setLenient(false);
                c.set(year, month-1, date, minute/60, minute%60, 0);
                long candidate = c.getTimeInMillis();
                if (candidate > now && candidate < best) best = candidate;
            } catch (Exception ignored) {}
        }
        return best == Long.MAX_VALUE ? -1L : best;
    }

    private static long nextOccurrence(long baseMillis, int minuteOfDay, TimeZone tz) {
        Calendar c = Calendar.getInstance(tz);
        c.setTimeInMillis(baseMillis);
        c.set(Calendar.HOUR_OF_DAY, minuteOfDay/60);
        c.set(Calendar.MINUTE, minuteOfDay%60);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= baseMillis) c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    private static boolean scheduleOne(Context context, int requestCode, String id, String mode, boolean pre, long at) {
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(am==null)return false;
        Intent in=new Intent(context, PrayerNotificationReceiver.class)
                .setAction("com.qiblalabs.PRAYER_NATIVE_"+(pre?"PRE_":"")+id)
                .putExtra("prayer",id).putExtra("mode",mode).putExtra("pre",pre);
        PendingIntent pi=PendingIntent.getBroadcast(context,requestCode,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        try {
            if(pre){
                // A pre-prayer reminder is informational and may be batched. Keeping it
                // inexact also avoids Android's idle exact-alarm rate limit interfering
                // with the exact prayer-time Adhan a few minutes later.
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            }else{
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
            }
            return true;
        } catch (SecurityException denied) {
            return false;
        }
    }

    public static void cancelAll(Context context) {
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(am==null)return;
        for(int i=0;i<IDS.length;i++){
            cancel(context,am,BASE_REQ+i,"com.qiblalabs.PRAYER_NATIVE_"+IDS[i]);
            cancel(context,am,PRE_REQ+i,"com.qiblalabs.PRAYER_NATIVE_PRE_"+IDS[i]);
        }
    }
    private static void cancel(Context context, AlarmManager am, int requestCode, String action){
        Intent in=new Intent(context,PrayerNotificationReceiver.class).setAction(action);
        PendingIntent pi=PendingIntent.getBroadcast(context,requestCode,in,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
        if(pi!=null)am.cancel(pi);
    }
}
