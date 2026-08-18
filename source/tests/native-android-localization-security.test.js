'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),sets=['values','values-en','values-fr','values-id','values-ur'];
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function stringNames(xml){return new Set([...xml.matchAll(/<string\s+name="([^"]+)"/g)].map(m=>m[1]));}

// Existing localized native Azkar surface remains intact.
const azkarRequired=['azkar_channel_name','azkar_channel_description','azkar_notification_title','azkar_start_title','azkar_start_message','azkar_start_action','azkar_stop_title','azkar_stop_message','azkar_stop_action','azkar_cancel_action','azkar_permission_required','azkar_started_toast'];
for(const set of sets){const p=`android-twa/native/azkar-reminders/res/${set}/strings.xml`;assert(fs.existsSync(p),`${p} missing`);const n=stringNames(read(p));for(const k of azkarRequired)assert(n.has(k),`${set} missing ${k}`);}
const azActivity=read('android-twa/native/azkar-reminders/AzkarReminderActivity.java');
const azScheduler=read('android-twa/native/azkar-reminders/AzkarReminderScheduler.java');
assert(azActivity.includes('NativeBridgeToken.valid'));
assert(azActivity.includes('POST_NOTIFICATIONS'));
assert(azActivity.includes('MIN_INTERVAL_MINUTES = 5'));
assert(azActivity.includes('AzkarReminderScheduler.stop(this)'));
assert(azScheduler.includes('MIN_INTERVAL_MINUTES = 5'));
assert(azScheduler.includes('setAndAllowWhileIdle'));
assert(azScheduler.includes('PendingIntent.getBroadcast')&&azScheduler.includes('AzkarReminderReceiver.class'));

// Localized prayer and widget resources remain complete.
const prayerRequired=['prayer_channel_adhan','prayer_channel_notice','prayer_channel_description','prayer_notification_title','prayer_notification_now','prayer_notification_advance','prayer_name_fajr','prayer_name_dhuhr','prayer_name_asr','prayer_name_maghrib','prayer_name_isha'];
const widgetRequired=['widget_app_name','widget_city_unavailable','widget_refresh_required','widget_value_unavailable','widget_qibla_unavailable','widget_qibla_value'];
for(const set of sets){let p=`android-twa/native/prayer-widget/res/${set}/strings.xml`;assert(fs.existsSync(p),`${p} missing`);let n=stringNames(read(p));for(const k of prayerRequired)assert(n.has(k),`${set} missing ${k}`);p=`android-twa/native/widget/res/${set}/strings.xml`;n=stringNames(read(p));for(const k of widgetRequired)assert(n.has(k),`${set} missing ${k}`);}

const token=read('android-twa/native/prayer-widget/NativeBridgeToken.java');
const launcher=read('android-twa/native/prayer-widget/QiblaLauncherActivity.java');
const sync=read('android-twa/native/prayer-widget/PrayerWidgetSyncActivity.java');
const scheduler=read('android-twa/native/prayer-widget/PrayerNativeScheduler.java');
const receiver=read('android-twa/native/prayer-widget/PrayerNotificationReceiver.java');
const prayerBoot=read('android-twa/native/prayer-widget/PrayerBootReceiver.java');
const widget=read('android-twa/native/widget/QiblaWidgetProvider.java');
const apply=read('android-twa/apply_native_widget.ps1');
const mergedGate=read('android-twa/check_generated_permissions.py');

// Per-install authenticated bridge.
for(const t of ['SecureRandom','MODE_PRIVATE','candidate'])assert(token.includes(t),`token gate missing ${t}`);
assert(launcher.includes('nativeToken=')&&!launcher.includes('appendQueryParameter("nativeToken"'),'native token must remain fragment-only');
assert(launcher.includes('nativeAdhan=')&&launcher.includes('PrayerNativeScheduler.nativeActive(this)'),'launcher must report confirmed native scheduler ownership');
assert(sync.includes('NativeBridgeToken.valid'));
assert(sync.includes('MODE_PRIVATE'));
assert(sync.includes('safePlan(d.getQueryParameter("plan"))'));
assert(sync.includes('days.length<2||days.length>180'),'native plan horizon must be bounded to six months');
assert(sync.includes('raw.length()>16384'),'native plan payload must remain bounded');

// Permission lifecycle: runtime notifications + user-granted exact-alarm special access.
assert(sync.includes('POST_NOTIFICATIONS'));
assert(sync.includes('Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM'));
assert(sync.includes('PrayerNativeScheduler.canScheduleExactAlarms(this)'));
assert(sync.includes('if(!interactive){finish();return;}'),'automatic refresh must never open permission UI');
assert(sync.includes('boolean applied=apply(data);'));
assert(sync.includes('restartIntoAuthenticatedLauncher()'),'onboarding success must return through launcher with confirmed ownership');
assert(apply.includes('android.permission.SCHEDULE_EXACT_ALARM'));
assert(apply.includes('android.permission.POST_NOTIFICATIONS'));
assert(mergedGate.includes('android.permission.SCHEDULE_EXACT_ALARM'));
assert(mergedGate.includes('android.permission.USE_EXACT_ALARM'),'restricted USE_EXACT_ALARM must be explicitly rejected');

// Exact actual prayer event, independent informational pre-alert.
assert(scheduler.includes('AlarmManager.RTC_WAKEUP'));
assert(scheduler.includes('setExactAndAllowWhileIdle'),'actual prayer event must be exact even in idle');
assert(scheduler.includes('if(pre)')&&scheduler.includes('setAndAllowWhileIdle'),'pre-alert must remain inexact and separate');
assert(scheduler.includes('PendingIntent.getBroadcast')&&scheduler.includes('PrayerNotificationReceiver.class'));
assert(scheduler.includes('PRE_REQ')&&scheduler.includes('boolean pre'));
assert(scheduler.includes('KEY_PLAN = "plan_v1"'));
assert(scheduler.includes('KEY_NATIVE_ACTIVE = "native_active_v1"'));
assert(scheduler.includes('scheduledPrayerCount>0'),'exhausted dated plan must not remain falsely owned by Native');
assert(scheduler.includes('nextPlannedOccurrence(plan, i, now, tz)'));
assert(scheduler.includes('if (actual <= 0L) continue;'),'an exhausted date-stamped prayer must not replay stale daily minutes');
assert(receiver.includes('extends BroadcastReceiver'));
assert(receiver.includes('show(context,id,mode,pre);')&&receiver.includes('PrayerNativeScheduler.reschedule(context);'));
assert(receiver.includes('USAGE_ALARM')&&receiver.includes('rawNameForAdhan'));
assert(receiver.includes('"/raw/"+rawName'),'notification sound URI must use stable raw resource name rather than numeric resource id');
assert(receiver.includes('_v2'),'code4 must use a fresh notification channel contract after the native upgrade');
assert(prayerBoot.includes('ACTION_BOOT_COMPLETED')&&prayerBoot.includes('ACTION_MY_PACKAGE_REPLACED')&&prayerBoot.includes('ACTION_TIMEZONE_CHANGED')&&prayerBoot.includes('ACTION_TIME_CHANGED'));
assert(prayerBoot.includes('ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED'),'granting exact access must restore schedule');
for(const raw of ['adhan_mecca.mp3','adhan_ahmed_al_nufais.mp3','adhan_islam_sobhi.mp3','adhan_fajr.mp3'])assert(apply.includes(raw),`native Adhan package missing ${raw}`);

// Widget remains read-only over authenticated private prayer state.
assert(widget.includes('PrayerNativeScheduler.PREFS'));
assert(!/android:name=["'](?:com\.qiblalabs\.)?WidgetDataActivity["']/.test(apply),'legacy WidgetDataActivity must remain absent');
assert(apply.includes('QiblaWidgetProvider')&&apply.includes('PrayerWidgetSyncActivity'));

// Dated plan must reuse the approved prayer engine; no second calculation engine is introduced.
const plan=read('js/presentation/prayer/native-plan.js');
assert(plan.includes('QiblaPrayerMethods.calculate'));
assert(plan.includes('QiblaPrayerLocation.dateKey'));
assert(plan.includes('sameMinutes(first.times,current)'));
assert(plan.includes('MAX_DAYS=180'));
assert(plan.includes("cacheKey='',cachePlan=null"),'six-month plan must be cached between polling checks');

// Web/native bridge carries the long plan and confirms native ownership before suppressing Web audio.
const webSync=read('js/presentation/prayer/schedule-sync.js');
assert(webSync.includes("TOKEN_KEY='qiblaastro:native-token'"));
assert(webSync.includes("AUTO_KEY='qiblaastro:prayer-native-sync-enabled:v1'"));
assert(webSync.includes("OWNER_KEY='qiblaastro:prayer-native-owner:v1'"));
assert(webSync.includes("LAST_SYNC_KEY='qiblaastro:prayer-native-sync-last:v1'"));
assert(webSync.includes('PLAN_DAYS=180'));
assert(webSync.includes('QiblaPrayerNativePlan.build(PLAN_DAYS)'));
assert(webSync.includes("hp.get('nativeAdhan')"));
assert(webSync.includes('function installWebFallbackGuard()'));
assert(webSync.includes('if(nativeOwnerConfirmed())return;return webCheck(now,cache);'));
assert(webSync.includes("q.set('interactive',interactive?'1':'0')"));
assert(webSync.includes("q.set('onboarding',onboarding?'1':'0')"));
assert(webSync.includes('intent://prayer-sync?')&&webSync.includes('package=com.qiblalabs'));
assert(webSync.includes("maybeAutoSync('startup')")&&webSync.includes("maybeAutoSync('location-changed')")&&webSync.includes("maybeAutoSync('runtime-ready')"));
assert(webSync.includes('if(minute<0)return null'));

// Azkar bridge stays authenticated and independent of this prayer change.
const azWeb=read('js/azkar-native-reminders.js');
const azPage=read('pages/azkar.html');
const azHost=read('js/presentation/azkar/host.js');
assert(azWeb.includes("token='+encodeURIComponent(token)"));
assert(azWeb.includes('tokenFromHash')&&azWeb.includes('tokenFromStorage'));
assert(azWeb.includes('Math.max(5,n)'));
assert(azWeb.includes("'qiblaastro://azkar-reminder?token='"));
assert(azWeb.includes('topWin.location.href=uri'));
assert(azWeb.includes("'intent://azkar-reminder?token='"));
assert(!azWeb.includes('a.click()'));
assert(azHost.includes("TOKEN_KEY='qiblaastro:native-token'")&&azHost.includes('seedFrameContext(frame)'));
assert(azPage.includes('#azAudio .az-audio-status{display:none!important}'));

// Current early-core boot and service-worker release.
const bootstrap=read('js/presentation/bootstrap.js');
assert(bootstrap.includes('loadPrayerCore(loadPermissions);'));
assert(bootstrap.includes('native-plan.js?v=20260818-adhan-core2')&&bootstrap.includes('schedule-sync.js?v=20260818-adhan-core2'));
const sw=read('service-worker.js');
assert(sw.includes("qiblaastro-v6.19-adhan-exact-native"));
assert(sw.includes('./js/presentation/prayer/native-plan.js')&&sw.includes('./js/presentation/prayer/schedule-sync.js')&&sw.includes('./js/azkar-native-reminders.js'));

console.log('Native Android localization/security gate: PASS');
console.log('Prayer: exact RTC_WAKEUP Adhan + separate inexact pre-alert + stable local audio channel: PASS');
console.log('Prayer: POST_NOTIFICATIONS + user-granted SCHEDULE_EXACT_ALARM + confirmed native ownership: PASS');
console.log('Prayer: cached 180-day authoritative dated plan + reboot/time/exact-permission restoration: PASS');
console.log('Azkar and widget authenticated/localized contracts: PASS');
