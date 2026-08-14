'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),sets=['values','values-en','values-fr','values-id','values-ur'];
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function stringNames(xml){return new Set([...xml.matchAll(/<string\s+name="([^"]+)"/g)].map(m=>m[1]));}
const azkarRequired=['azkar_channel_name','azkar_channel_description','azkar_notification_title','azkar_start_title','azkar_start_message','azkar_start_action','azkar_stop_title','azkar_stop_message','azkar_stop_action','azkar_cancel_action','azkar_permission_required','azkar_started_toast'];
for(const set of sets){const p=`android-twa/native/azkar-reminders/res/${set}/strings.xml`;assert(fs.existsSync(p),`${p} missing`);const n=stringNames(read(p));for(const k of azkarRequired)assert(n.has(k),`${set} missing ${k}`);}
const activity=read('android-twa/native/azkar-reminders/AzkarReminderActivity.java');
assert(activity.includes('NativeBridgeToken.valid'),'Azkar native bridge must require per-install token');
assert(activity.includes('POST_NOTIFICATIONS'),'Azkar Android 13 notification permission missing');
const prayerRequired=['prayer_channel_adhan','prayer_channel_notice','prayer_channel_description','prayer_notification_title','prayer_notification_now','prayer_notification_advance','prayer_name_fajr','prayer_name_dhuhr','prayer_name_asr','prayer_name_maghrib','prayer_name_isha'];
const widgetRequired=['widget_app_name','widget_city_unavailable','widget_refresh_required','widget_value_unavailable','widget_qibla_unavailable','widget_qibla_value'];
for(const set of sets){let p=`android-twa/native/prayer-widget/res/${set}/strings.xml`;assert(fs.existsSync(p),`${p} missing`);let n=stringNames(read(p));for(const k of prayerRequired)assert(n.has(k),`${set} missing ${k}`);p=`android-twa/native/widget/res/${set}/strings.xml`;n=stringNames(read(p));for(const k of widgetRequired)assert(n.has(k),`${set} missing ${k}`);}
const token=read('android-twa/native/prayer-widget/NativeBridgeToken.java');
const launcher=read('android-twa/native/prayer-widget/QiblaLauncherActivity.java');
const sync=read('android-twa/native/prayer-widget/PrayerWidgetSyncActivity.java');
const scheduler=read('android-twa/native/prayer-widget/PrayerNativeScheduler.java');
const receiver=read('android-twa/native/prayer-widget/PrayerNotificationReceiver.java');
const widget=read('android-twa/native/widget/QiblaWidgetProvider.java');
const apply=read('android-twa/apply_native_widget.ps1');
for(const t of ['SecureRandom','MODE_PRIVATE','candidate'])assert(token.includes(t),`token gate missing ${t}`);
assert(launcher.includes('.fragment("nativeToken="'),'native token must be put in URL fragment');
assert(!launcher.includes('appendQueryParameter("nativeToken"'),'native token must never enter HTTP query');
assert(sync.includes('NativeBridgeToken.valid'),'sync activity must reject unauthenticated data');
assert(sync.includes('MODE_PRIVATE'),'sync data must use app-private storage');
assert(scheduler.includes('setAndAllowWhileIdle'),'prayer scheduling must remain local and not require external push service');
assert(scheduler.includes('PRE_REQ')&&scheduler.includes('boolean pre'),'pre-prayer alert must be separate from prayer-time event');
for(const raw of ['adhan_mecca.mp3','adhan_ahmed_al_nufais.mp3','adhan_islam_sobhi.mp3','adhan_fajr.mp3'])assert(apply.includes(raw),`native Adhan package missing ${raw}`);
assert(receiver.includes('USAGE_ALARM')&&receiver.includes('rawForAdhan'),'selected local Adhan audio must play only through native prayer alarm channel');
assert(widget.includes('PrayerNativeScheduler.PREFS'),'widget must read authenticated app-private prayer store');
assert(!/android:name=["'](?:com\.qiblalabs\.)?WidgetDataActivity["']/.test(apply),'legacy WidgetDataActivity component must remain absent');
assert(apply.includes('QiblaWidgetProvider')&&apply.includes('PrayerWidgetSyncActivity'),'authenticated widget integration missing');
const webSync=read('js/presentation/prayer/schedule-sync.js');
assert(webSync.includes("TOKEN_KEY='qiblaastro:native-token'"),'web sync token storage missing');
assert(webSync.includes("root.location.hash"),'web bridge must capture token from non-HTTP fragment');
assert(webSync.includes('intent://prayer-sync?'),'web prayer sync intent missing');
const azWeb=read('js/azkar-native-reminders.js');
assert(azWeb.includes("token='+encodeURIComponent(token)"),'Azkar web bridge must send authenticated token');
assert(azWeb.includes('tokenFromHash'),'Azkar bridge must read token from fragment');
const bootstrap=read('js/presentation/bootstrap.js');
assert(bootstrap.includes('schedule-sync.js?v=20260814-nativebridge1'),'authenticated prayer sync loader version missing');
const sw=read('service-worker.js');
assert(/qiblaastro-v\d+\.\d+-/.test(sw),'versioned service-worker cache missing');
assert(sw.includes('./js/presentation/prayer/schedule-sync.js')&&sw.includes('./js/azkar-native-reminders.js'),'native web bridge files must remain in critical offline cache');
console.log('Native Android localization/security gate: PASS');
console.log('Prayer actual-time + separate pre-alert + local Adhan audio: PASS');
console.log('Prayer notifications AR/EN/FR/ID/UR: PASS');
console.log('Widget AR/EN/FR/ID/UR: PASS');
console.log('Per-install fragment token + MODE_PRIVATE store; legacy WidgetDataActivity absent: PASS');
