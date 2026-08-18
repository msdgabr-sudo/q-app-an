package com.qiblalabs.nativebridge;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import com.qiblalabs.widget.QiblaWidgetProvider;

/** Authenticated first-party bridge. No untrusted payload is accepted without the per-install token. */
public final class PrayerWidgetSyncActivity extends Activity {
    private static final int REQ_NOTIFICATIONS=8711;
    private boolean exactSettingsLaunched=false;
    private boolean exactSettingsPaused=false;

    @Override protected void onCreate(Bundle savedInstanceState){
        super.onCreate(savedInstanceState);
        continueActivation();
    }

    @Override protected void onPause(){
        super.onPause();
        if(exactSettingsLaunched)exactSettingsPaused=true;
    }

    @Override protected void onResume(){
        super.onResume();
        if(exactSettingsLaunched&&exactSettingsPaused){
            exactSettingsLaunched=false;
            exactSettingsPaused=false;
            if(PrayerNativeScheduler.canScheduleExactAlarms(this))completeActivation();
            else finish();
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        if(requestCode!=REQ_NOTIFICATIONS){finish();return;}
        if(grantResults!=null&&grantResults.length>0&&grantResults[0]==PackageManager.PERMISSION_GRANTED)continueActivation();
        else finish();
    }

    private void continueActivation(){
        Uri data=currentData();
        if(!authenticated(data)){finish();return;}
        boolean enabled="1".equals(data.getQueryParameter("notify"));
        boolean interactive="1".equals(data.getQueryParameter("interactive"));

        if(Build.VERSION.SDK_INT>=33&&enabled&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){
            if(!interactive){finish();return;}
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},REQ_NOTIFICATIONS);
            return;
        }

        if(Build.VERSION.SDK_INT>=31&&enabled&&!PrayerNativeScheduler.canScheduleExactAlarms(this)){
            if(!interactive){finish();return;}
            requestExactAlarmAccess();
            return;
        }

        completeActivation();
    }

    private void requestExactAlarmAccess(){
        try{
            exactSettingsLaunched=true;
            exactSettingsPaused=false;
            Intent settings=new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName()));
            startActivity(settings);
        }catch(Exception unavailable){
            exactSettingsLaunched=false;
            finish();
        }
    }

    private void completeActivation(){
        Uri data=currentData();
        if(!authenticated(data)){finish();return;}
        boolean applied=apply(data);
        boolean onboarding="1".equals(data.getQueryParameter("onboarding"));
        if(applied&&onboarding){
            restartIntoAuthenticatedLauncher();
            return;
        }
        finish();
    }

    private void restartIntoAuthenticatedLauncher(){
        Intent launch=new Intent(this,QiblaLauncherActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(launch);
        finish();
    }

    private Uri currentData(){return getIntent()!=null?getIntent().getData():null;}
    private boolean authenticated(Uri data){return expected(data)&&NativeBridgeToken.valid(this,data.getQueryParameter("token"));}
    private boolean expected(Uri d){return d!=null&&"qiblaastro".equals(d.getScheme())&&"prayer-sync".equals(d.getHost());}

    private boolean apply(Uri d){
        SharedPreferences prefs=getSharedPreferences(PrayerNativeScheduler.PREFS,Context.MODE_PRIVATE);
        SharedPreferences.Editor e=prefs.edit();
        e.putBoolean("enabled","1".equals(d.getQueryParameter("notify")));
        e.putString("city",safeText(d.getQueryParameter("city"),80));
        e.putString("timezone",safeZone(d.getQueryParameter("tz")));
        e.putString("hijri",safeText(d.getQueryParameter("hijri"),80));
        e.putString("qibla",safeQibla(d.getQueryParameter("qibla")));
        e.putInt("advance",boundedInt(d.getQueryParameter("advance"),0,30,0));
        e.putString("profile",safeProfile(d.getQueryParameter("profile")));
        e.putString(PrayerNativeScheduler.KEY_PLAN,safePlan(d.getQueryParameter("plan")));
        String[] ids={"fajr","dhuhr","asr","maghrib","isha"};
        for(String id:ids){
            e.putInt("time_"+id,boundedInt(d.getQueryParameter("t_"+id),0,1439,-1));
            e.putString("mode_"+id,safeMode(d.getQueryParameter("m_"+id)));
        }
        e.putLong("updated_at",System.currentTimeMillis());
        e.apply();
        boolean scheduled=PrayerNativeScheduler.reschedule(this);
        if(!"1".equals(d.getQueryParameter("notify")))scheduled=true;
        if(scheduled){
            AppWidgetManager awm=AppWidgetManager.getInstance(this);
            int[] idsWidget=awm.getAppWidgetIds(new ComponentName(this,QiblaWidgetProvider.class));
            if(idsWidget.length>0)new QiblaWidgetProvider().onUpdate(this,awm,idsWidget);
        }
        return scheduled;
    }

    private int boundedInt(String s,int min,int max,int fallback){try{int v=Integer.parseInt(s);return v<min||v>max?fallback:v;}catch(Exception x){return fallback;}}
    private String safeMode(String s){return "adhan".equals(s)||"notification".equals(s)?s:"off";}
    private String safeProfile(String s){return "calm".equals(s)||"deep".equals(s)?s:"makkah";}
    private String safeText(String s,int max){if(s==null)return "";s=s.replaceAll("[\\p{Cntrl}]","").trim();return s.length()>max?s.substring(0,max):s;}
    private String safeZone(String s){if(s==null||!s.matches("[A-Za-z0-9_+\\-/]{1,64}"))return java.util.TimeZone.getDefault().getID();return s;}
    private String safeQibla(String s){try{double v=Double.parseDouble(s);if(v<0||v>=360)return "";return String.format(java.util.Locale.US,"%.1f",v);}catch(Exception x){return "";}}
    private String safePlan(String raw){
        if(raw==null||raw.isEmpty()||raw.length()>16384)return "";
        String[] days=raw.split("\\|",-1);
        if(days.length<2||days.length>180)return "";
        StringBuilder out=new StringBuilder();
        String previous="";
        for(String day:days){
            String[] pair=day.split(":",2);
            if(pair.length!=2||!pair[0].matches("\\d{4}-\\d{2}-\\d{2}")||(!previous.isEmpty()&&pair[0].compareTo(previous)<=0))return "";
            String[] mins=pair[1].split(",",-1);
            if(mins.length!=5)return "";
            if(out.length()>0)out.append('|');
            out.append(pair[0]).append(':');
            for(int i=0;i<mins.length;i++){
                int minute=boundedInt(mins[i],0,1439,-1);
                if(minute<0)return "";
                if(i>0)out.append(',');
                out.append(minute);
            }
            previous=pair[0];
        }
        return out.toString();
    }
}
