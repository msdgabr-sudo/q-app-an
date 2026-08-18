package com.qiblalabs.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.format.DateFormat;
import android.widget.RemoteViews;

import com.qiblalabs.R;
import com.qiblalabs.nativebridge.PrayerNativeScheduler;
import com.qiblalabs.nativebridge.PrayerNotificationReceiver;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * Responsive read-only QiblaAstro home-screen widget.
 *
 * Data ownership is intentionally unchanged: every value is read only from the
 * authenticated app-private prayer store. The widget never calculates Qibla,
 * prayer times, astronomy, location or any scientific value on its own.
 */
public final class QiblaWidgetProvider extends AppWidgetProvider {
    private static final int MODE_COMPACT = 0;
    private static final int MODE_MEDIUM = 1;
    private static final int MODE_LARGE = 2;

    private static final int COLOR_NEXT = 0xFF72E59E;
    private static final int COLOR_NORMAL = 0xFFDCE5EE;
    private static final int COLOR_MUTED = 0xFFAFC0D6;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) updateOne(context, manager, appWidgetId);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions);
        updateOne(context, manager, appWidgetId);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, QiblaWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids.length > 0) new QiblaWidgetProvider().onUpdate(context, manager, ids);
    }

    private void updateOne(Context context, AppWidgetManager manager, int appWidgetId) {
        manager.updateAppWidget(appWidgetId, buildViews(context, manager, appWidgetId));
    }

    private RemoteViews buildViews(Context context, AppWidgetManager manager, int appWidgetId) {
        int mode = modeForWidget(manager, appWidgetId);
        int layout = mode == MODE_COMPACT
                ? R.layout.qibla_widget_compact
                : mode == MODE_LARGE ? R.layout.qibla_widget_large : R.layout.qibla_widget;

        SharedPreferences prefs = context.getSharedPreferences(PrayerNativeScheduler.PREFS, Context.MODE_PRIVATE);
        int next = nextIndex(prefs);
        String unavailable = context.getString(R.string.widget_value_unavailable);
        String city = safeText(prefs.getString("city", ""), context.getString(R.string.widget_location_unavailable_short));
        String hijri = safeText(prefs.getString("hijri", ""), unavailable);
        String qibla = prefs.getString("qibla", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        views.setTextViewText(R.id.widget_city, city);
        views.setTextViewText(R.id.widget_next_prayer,
                next < 0 ? context.getString(R.string.widget_refresh_required)
                        : PrayerNotificationReceiver.prayerName(context, PrayerNativeScheduler.IDS[next]));
        views.setTextViewText(R.id.widget_prayer_time,
                next < 0 ? unavailable : timeText(context, prefs, PrayerNativeScheduler.IDS[next]));
        views.setTextViewText(R.id.widget_qibla,
                qibla == null || qibla.trim().isEmpty()
                        ? context.getString(R.string.widget_qibla_unavailable)
                        : context.getString(R.string.widget_qibla_degrees, qibla));
        views.setTextViewText(R.id.widget_hijri, hijri);

        if (mode != MODE_COMPACT) bindPrayerStrip(context, views, prefs, next);
        if (mode == MODE_LARGE) views.setTextViewText(R.id.widget_updated, lastUpdatedText(context, prefs));

        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context));
        return views;
    }

    private int modeForWidget(AppWidgetManager manager, int appWidgetId) {
        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        int width = options == null ? 250 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int height = options == null ? 110 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        if (width <= 0) width = 250;
        if (height <= 0) height = 110;
        if (width < 190) return MODE_COMPACT;
        if (height >= 170) return MODE_LARGE;
        return MODE_MEDIUM;
    }

    private void bindPrayerStrip(Context context, RemoteViews views, SharedPreferences prefs, int next) {
        int[] nameIds = {
                R.id.widget_fajr_name,
                R.id.widget_dhuhr_name,
                R.id.widget_asr_name,
                R.id.widget_maghrib_name,
                R.id.widget_isha_name
        };
        int[] timeIds = {
                R.id.widget_fajr_time,
                R.id.widget_dhuhr_time,
                R.id.widget_asr_time,
                R.id.widget_maghrib_time,
                R.id.widget_isha_time
        };
        for (int i = 0; i < PrayerNativeScheduler.IDS.length; i++) {
            String id = PrayerNativeScheduler.IDS[i];
            views.setTextViewText(nameIds[i], PrayerNotificationReceiver.prayerName(context, id));
            views.setTextViewText(timeIds[i], timeText(context, prefs, id));
            int nameColor = i == next ? COLOR_NEXT : COLOR_MUTED;
            int timeColor = i == next ? COLOR_NEXT : COLOR_NORMAL;
            views.setTextColor(nameIds[i], nameColor);
            views.setTextColor(timeIds[i], timeColor);
        }
    }

    private String timeText(Context context, SharedPreferences prefs, String id) {
        int minutes = prefs.getInt("time_" + id, -1);
        if (minutes < 0 || minutes > 1439) return context.getString(R.string.widget_value_unavailable);
        String zone = prefs.getString("timezone", TimeZone.getDefault().getID());
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone(zone));
        calendar.set(Calendar.HOUR_OF_DAY, minutes / 60);
        calendar.set(Calendar.MINUTE, minutes % 60);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return DateFormat.getTimeFormat(context).format(calendar.getTime());
    }

    private int nextIndex(SharedPreferences prefs) {
        String zone = prefs.getString("timezone", TimeZone.getDefault().getID());
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone(zone));
        int now = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE);
        int firstAvailable = -1;
        for (int i = 0; i < PrayerNativeScheduler.IDS.length; i++) {
            int minute = prefs.getInt("time_" + PrayerNativeScheduler.IDS[i], -1);
            if (minute < 0 || minute > 1439) continue;
            if (firstAvailable < 0) firstAvailable = i;
            if (minute >= now) return i;
        }
        return firstAvailable;
    }

    private String lastUpdatedText(Context context, SharedPreferences prefs) {
        long updatedAt = prefs.getLong("updated_at", 0L);
        if (updatedAt <= 0L) return context.getString(R.string.widget_refresh_required);
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(updatedAt);
        String time = DateFormat.getTimeFormat(context).format(calendar.getTime());
        return context.getString(R.string.widget_updated_value, time);
    }

    private String safeText(String value, String fallback) {
        if (value == null) return fallback;
        String clean = value.trim();
        return clean.isEmpty() ? fallback : clean;
    }

    private PendingIntent openAppIntent(Context context) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context,
                9031,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
