'use strict';
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const permissions=read('js/presentation/permissions-onboarding.js');
const gnss=read('js/05-gnss.js');
const nav=read('js/06-navigation.js');
const index=read('index.html');
const sync=read('js/presentation/prayer/schedule-sync.js');
const runtime=read('js/runtime/trusted-location-dependent-sync.js');
const nativeActivity=read('android-twa/native/prayer-widget/PrayerWidgetSyncActivity.java');
const nativeScheduler=read('android-twa/native/prayer-widget/PrayerNativeScheduler.java');
const nativeReceiver=read('android-twa/native/prayer-widget/PrayerNotificationReceiver.java');
const twa=JSON.parse(read('android-twa/twa-manifest.json'));
const sw=read('service-worker.js');

// Android/TWA permission contract.
assert.strictEqual(twa.features&&twa.features.locationDelegation&&twa.features.locationDelegation.enabled,true,'TWA Android location delegation must stay enabled');
assert.strictEqual(twa.enableNotifications,true,'TWA notifications must stay enabled');
assert(nativeActivity.includes('POST_NOTIFICATIONS'),'Native prayer bridge must request Android 13+ notification permission');
assert(nativeActivity.includes('PrayerNativeScheduler.reschedule(this)'),'Native prayer bridge must persist and schedule received prayer data');

// First-run permission must never remain indefinitely disabled waiting for a GPS fix.
assert(permissions.includes('getLocationPermissionStatus'),'Permission flow must observe the browser/TWA geolocation permission state');
assert(permissions.includes('timer=root.setTimeout(settleFromPermission,10000)'),'Permission request needs an independent bounded safety timeout');
assert(permissions.includes('enableHighAccuracy:false'),'Permission prompting must be separate from the later trusted high-accuracy GNSS acquisition');
assert(permissions.includes('maximumAge:60000'),'Permission prompting may use a non-authoritative cached location only to settle the permission dialog');
assert(permissions.includes("finish('prompt')"),'An unresolved Android permission dialog must return control to the UI instead of hanging');
assert(permissions.includes("if(saved&&saved.location==='granted')permission='granted'"),'GNSS startup recovery must honor a granted permission even before onboarding is fully completed');

// Existing trusted GNSS engine remains authoritative; no replacement engine or fallback location.
assert(index.includes('function tryBrowserGPS()'),'Production inline trusted GNSS engine must remain present');
assert(permissions.includes("typeof root.tryBrowserGPS==='function'")&&permissions.includes('root.tryBrowserGPS()'),'Permissions cycle must reuse the existing production GNSS function');
assert(permissions.includes('trustedGnssReady()'),'Permissions cycle must wait for the existing trusted finite GNSS state');
assert(gnss.includes('gnssHasTrustedFix')&&gnss.includes("gnssSource='gps'"),'Trusted GNSS state contract must remain in the GNSS source');
assert(!/ipapi|ipinfo|geolocation-db|fetch\s*\(/i.test(gnss),'GNSS must not reintroduce IP/external location fallback');
assert(!nav.includes("gnssSource==='default'")&&!nav.includes('gnssSource==="default"'),'Retired GNSS source state must not survive in navigation');
assert(nav.includes("id==='compass'&&!gnssHasTrustedFix")&&nav.includes("if(!gnssHasTrustedFix)tryBrowserGPS()"),'Navigation recovery must use the authoritative trusted-fix state');
assert(nav.includes("&&gnssHasTrustedFix){updateQiblaFromPosition();}"),'Navigation must not publish Qibla before a trusted fix exists');
for(const forbidden of ['calcQibla(','refreshMdeclFromTrustedGnss(','calcPrayers(','sunPos(','moonPos(','AstroVerification']){
  assert(!permissions.includes(forbidden),`Permissions integration must not touch protected calculation token: ${forbidden}`);
}

// Prayer runtime must still be the only owner of prayer schedule calculation.
assert(runtime.includes('QiblaPrayerMethods.calculate'),'Prayer runtime must retain the approved prayer calculation engine');
assert(permissions.includes('prayerRuntimeReady()'),'Onboarding may inspect readiness but must not calculate prayer times');
assert(sync.includes('QiblaPrayerNativePlan.build(14)'),'Native prayer handoff must retain the validated dated plan');

// Adhan activation is a deliberate second user gesture after trusted location is ready.
assert(permissions.includes("btn.dataset.stage='adhan'"),'Onboarding must expose an explicit Adhan activation stage');
assert(permissions.includes("if(btn.dataset.stage==='adhan'){activateNativeAdhan();return;}"),'Adhan activation must run synchronously from the user button');
assert(permissions.includes('root.QiblaPrayerNativeSync.sync()===true'),'Adhan activation must reuse the authenticated published native prayer bridge');
assert(permissions.includes('adhanNativeRequested:true'),'Successful native handoff must persist the onboarding completion marker');
assert(nativeScheduler.includes('AlarmManager.RTC_WAKEUP')&&nativeScheduler.includes('setAndAllowWhileIdle'),'Native Adhan must remain scheduled for closed-app/Doze delivery');
assert(nativeScheduler.includes('PendingIntent.getBroadcast')&&nativeScheduler.includes('PrayerNotificationReceiver.class'),'Native Adhan delivery must remain BroadcastReceiver-based');
assert(nativeReceiver.includes('USAGE_ALARM')&&nativeReceiver.includes('rawForAdhan'),'Native receiver must retain local Adhan alarm audio');

// Service worker must refresh this exact integration without creating another GNSS engine.
assert(sw.includes("'./js/presentation/permissions-onboarding.js'"),'Permissions integration must stay in critical cache');
assert(sw.includes("PERMISSIONS_RELEASE='location-adhan-cycle-20260818'"),'Service worker must advertise the current permissions cycle release');
assert(!sw.includes("'./js/05-gnss.js'"),'Service worker must not activate the unused external GNSS implementation beside the production inline engine');

console.log('Permissions cycle: bounded Android location request -> trusted existing GNSS -> prayer runtime readiness: PASS');
console.log('Adhan cycle: explicit user activation -> authenticated native bridge -> RTC_WAKEUP BroadcastReceiver local Adhan: PASS');
console.log('Safety: retired GNSS state removed; no IP fallback and no Qibla/WMM/prayer/Falaki/raw-equation implementation added to onboarding: PASS');
