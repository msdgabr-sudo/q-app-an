'use strict';
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const sync=read('js/presentation/prayer/schedule-sync.js');
const permissions=read('js/presentation/permissions-onboarding.js');
const activity=read('android-twa/native/prayer-widget/PrayerWidgetSyncActivity.java');
const applyNative=read('android-twa/apply_native_widget.ps1');

assert(sync.includes("function directUri(q){return 'qiblaastro://prayer-sync?'+q.toString();}"),'web bridge must use the registered qiblaastro://prayer-sync scheme');
assert(sync.includes('function openDirectBridge(q)'),'web bridge must centralize the direct native handoff');
assert(sync.includes('if(!openDirectBridge(q))finish(false);'),'onboarding must fail closed when direct handoff cannot launch');
assert(!sync.includes('intent://prayer-sync'),'package-scoped intent fallback can redirect Chrome/TWA to Google Play');
assert(!sync.includes('package=com.qiblalabs'),'web bridge must not contain a Play-routable package fallback');
assert(!/play\.google\.com|market:\/\//i.test(sync),'web bridge must contain no Play Store URL');

assert(applyNative.includes('android:scheme="qiblaastro" android:host="prayer-sync"'),'generated Android manifest must register qiblaastro://prayer-sync');
assert(applyNative.includes('PrayerWidgetSyncActivity'),'generated Android manifest must register PrayerWidgetSyncActivity');
assert(activity.includes('"qiblaastro".equals(d.getScheme())&&"prayer-sync".equals(d.getHost())'),'native receiver must validate the same scheme and host');
assert(activity.includes('NativeBridgeToken.valid'),'native receiver must retain per-install token authentication');
assert(activity.includes('restartIntoAuthenticatedLauncher()'),'successful onboarding must still return through authenticated launcher');

assert(permissions.includes('root.QiblaPrayerNativeSync.activate()'),'permissions onboarding must keep using the native prayer bridge');
assert(permissions.includes('if(!confirmed){failNativeAdhanActivation(btn);return;}'),'failed handoff must remain visible instead of claiming success');

console.log('Prayer sync no-Play redirect: PASS');
console.log('Handoff: qiblaastro://prayer-sync -> authenticated PrayerWidgetSyncActivity -> QiblaLauncherActivity: PASS');
