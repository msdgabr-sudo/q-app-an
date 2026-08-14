package com.qiblalabs.nativebridge;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.Calendar;
import java.util.TimeZone;

public final class PrayerNativeScheduler {
    public static final String PREFS = "qiblaastro_prayer_native";
    public static final String[] IDS = {"fajr","dhuhr","asr","maghrib","isha"};
    static final int BASE_REQ = 8400;
    static final int PRE_REQ = 8450;
    private PrayerNativeScheduler() {}

    public static void reschedule(Context context) {
        cancelAll(context);
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean("enabled", false)) return;
        String tzId = p.getString("timezone", TimeZone.getDefault().getID());
        TimeZone tz = TimeZone.getTimeZone(tzId == null ? TimeZone.getDefault().getID() : tzId);
        long now = System.currentTimeMillis();
        int advance = Math.max(0, Math.min(30, p.getInt("advance", 0)));
        for (int i=0;i<IDS.length;i++) {
            String id = IDS[i];
            String mode = p.getString("mode_"+id, "off");
            if ("off".equals(mode)) continue;
            int minute = p.getInt("time_"+id, -1);
            if (minute < 0 || minute >= 1440) continue;
            long actual = nextOccurrence(now, minute, tz);
            scheduleOne(context, BASE_REQ+i, id, mode, false, actual);
            if (advance > 0) {
                long pre = actual - advance*60_000L;
                if (pre > now + 5000L) scheduleOne(context, PRE_REQ+i, id, "notification", true, pre);
            }
        }
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

    private static void scheduleOne(Context context, int requestCode, String id, String mode, boolean pre, long at) {
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(am==null)return;
        Intent in=new Intent(context, PrayerNotificationReceiver.class)
                .setAction("com.qiblalabs.PRAYER_NATIVE_"+(pre?"PRE_":"")+id)
                .putExtra("prayer",id).putExtra("mode",mode).putExtra("pre",pre);
        PendingIntent pi=PendingIntent.getBroadcast(context,requestCode,in,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
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
