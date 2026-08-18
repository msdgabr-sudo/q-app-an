'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const read=p=>fs.readFileSync(p,'utf8');

const permissions=read('js/presentation/permissions-onboarding.js');
const gnss=read('js/05-gnss.js');
const nav=read('js/06-navigation.js');
const bootstrap=read('js/presentation/bootstrap.js');
const index=read('index.html');
const sync=read('js/presentation/prayer/schedule-sync.js');
const adhanUi=read('js/presentation/prayer/adhan-ui.js');
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

// Adhan activation is an explicit second user gesture and must not report success before Android takes focus.
assert(permissions.includes("btn.dataset.stage='adhan'"),'Onboarding must expose an explicit Adhan activation stage');
assert(permissions.includes("if(btn.dataset.stage==='adhan'){activateNativeAdhan();return;}"),'Adhan activation must run from the user button');
assert(permissions.includes('root.QiblaPrayerNativeSync.activate()'),'Onboarding must use the confirmed native activation path');
assert(permissions.includes("typeof activation.then!=='function'"),'Onboarding must reject an unavailable asynchronous handoff contract');
assert(permissions.includes('if(!confirmed){failNativeAdhanActivation(btn);return;}'),'Onboarding must stay open when Android handoff is not confirmed');
assert(permissions.includes('adhanNativeRequested:true'),'Confirmed native handoff must persist the onboarding completion marker');
assert(sync.includes('function getReadiness()'),'Native bridge must expose real payload/token readiness to onboarding');
assert(sync.includes("reason:'native-token'"),'Missing per-install native token must block false ready state');
assert(sync.includes("root.QiblaAdhanUI.setEnabled(true)"),'Onboarding activation must explicitly enable Adhan before building native payload');
assert(adhanUi.includes('setEnabled:setEnabled'),'Adhan UI must expose a narrow persisted master-enable API for onboarding');
assert(sync.includes("'intent://prayer-sync?'"),'Onboarding handoff must use a package-targeted Android intent URI');
assert(sync.includes('package=com.qiblalabs'),'Package-targeted handoff must resolve only to QiblaAstro');
assert(sync.includes("root.addEventListener('blur',onBlur,true)")&&sync.includes("root.document.addEventListener('visibilitychange',onVisibility,true)"),'Onboarding handoff must confirm that Android actually took focus');
assert(sync.includes('HANDOFF_TIMEOUT_MS=1800'),'Onboarding handoff must fail closed if Android never takes focus');
assert(nativeScheduler.includes('AlarmManager.RTC_WAKEUP')&&nativeScheduler.includes('setAndAllowWhileIdle'),'Native Adhan must remain scheduled for closed-app/Doze delivery');
assert(nativeScheduler.includes('PendingIntent.getBroadcast')&&nativeScheduler.includes('PrayerNotificationReceiver.class'),'Native Adhan delivery must remain BroadcastReceiver-based');
assert(nativeReceiver.includes('USAGE_ALARM')&&nativeReceiver.includes('rawForAdhan'),'Native receiver must retain local Adhan alarm audio');

// Cache-busting must force the repaired three-file cycle onto already-installed TWA clients.
assert(bootstrap.includes('permissions-onboarding.js?v=20260818-location-adhan3'),'Bootstrap must request the repaired permissions cycle asset');
assert(bootstrap.includes('schedule-sync.js?v=20260818-adhan-handoff1'),'Bootstrap must request the repaired Android handoff asset');
assert(bootstrap.includes('adhan-ui.js?v=20260818-adhan-enable1'),'Bootstrap must request the Adhan master-enable API asset');
assert(sw.includes("'./js/presentation/permissions-onboarding.js'"),'Permissions integration must stay in critical cache');
assert(sw.includes("PERMISSIONS_RELEASE='location-adhan-cycle-20260818-v2'"),'Service worker must advertise the repaired permissions cycle release');
assert(sw.includes("VERSION='qiblaastro-v6.17-adhan-permission-handoff'"),'Service worker version must force installed clients onto the repaired Adhan handoff code');
assert(!sw.includes("'./js/05-gnss.js'"),'Service worker must not activate the unused external GNSS implementation beside the production inline engine');

// Behavioral regression: the onboarding path must enable Adhan, send notify=1 through
// a package-targeted intent, and only resolve after Android/TWA focus transfer is observed.
async function verifyConfirmedNativeHandoff(){
  const rootListeners={},docListeners={};
  const makeStorage=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
  const sessionStorage=makeStorage(),localStorage=makeStorage();
  let assigned='';
  const location={hash:'#nativeToken='+'A'.repeat(32),pathname:'/',search:'?twa=1'};
  const context={
    console,URLSearchParams,Intl,Number,JSON,Promise,Math,Date,Array,String,Object,Boolean,Error,
    sessionStorage,localStorage,location,history:{replaceState(){}},LAT:30.1,LON:31.2,gnssSource:'gps',QT:136.2,
    pCache:[{n:'الفجر',h:4.5},{n:'الظهر',h:12.1},{n:'العصر',h:15.4},{n:'المغرب',h:18.3},{n:'العشاء',h:19.6}],
    QiblaPrayerLocation:{effective:()=>({label:'القاهرة',timeZone:'Africa/Cairo'})},
    QiblaPrayerNativePlan:{build:()=>({timeZone:'Africa/Cairo'}),serialize:()=> '2026-08-18:270,726,924,1098,1176|2026-08-19:271,726,924,1097,1175'},
    addEventListener(type,fn){(rootListeners[type]||(rootListeners[type]=[])).push(fn);},
    removeEventListener(type,fn){rootListeners[type]=(rootListeners[type]||[]).filter(x=>x!==fn);},
    dispatchEvent(){},setInterval(){return 1;},clearInterval(){},setTimeout(){return 1;},clearTimeout(){}
  };
  let adhanState={profile:'makkah',advance:0,enabled:false,prayers:{'الفجر':'adhan','الظهر':'adhan','العصر':'adhan','المغرب':'adhan','العشاء':'adhan'}};
  context.QiblaAdhanUI={getState:()=>JSON.parse(JSON.stringify(adhanState)),setEnabled(v){adhanState.enabled=!!v;return adhanState.enabled;}};
  context.document={readyState:'loading',hidden:false,getElementById(){return null;},querySelector(){return null;},createElement(){return {setAttribute(){}};},head:{appendChild(){}},documentElement:{appendChild(){}},addEventListener(type,fn){(docListeners[type]||(docListeners[type]=[])).push(fn);},removeEventListener(type,fn){docListeners[type]=(docListeners[type]||[]).filter(x=>x!==fn);}};
  context.top=context;context.window=context;context.globalThis=context;
  Object.defineProperty(location,'href',{get(){return assigned;},set(v){assigned=v;(rootListeners.blur||[]).slice().forEach(fn=>fn());}});
  vm.createContext(context);vm.runInContext(sync,context);
  const readiness=context.QiblaPrayerNativeSync.getReadiness();
  assert.strictEqual(readiness.ready,true,`native readiness failed: ${readiness.reason}`);
  const confirmed=await context.QiblaPrayerNativeSync.activate();
  assert.strictEqual(confirmed,true,'native activation must confirm focus transfer');
  assert.strictEqual(adhanState.enabled,true,'onboarding must enable Adhan master state');
  assert(/^intent:\/\/prayer-sync\?/.test(assigned),'native activation must use Android intent URI');
  assert(assigned.includes('package=com.qiblalabs'),'native intent must target QiblaAstro package');
  assert(assigned.includes('notify=1'),'native payload must request notification permission/Adhan activation');
}

verifyConfirmedNativeHandoff().then(()=>{
  console.log('Permissions cycle: bounded Android location request -> trusted existing GNSS -> prayer runtime readiness: PASS');
  console.log('Adhan cycle: explicit user activation -> confirmed package-targeted Android handoff -> RTC_WAKEUP local Adhan: PASS');
  console.log('Safety: no false ready state, no silent success before Android focus transfer, and no protected calculation changes: PASS');
}).catch(err=>{console.error(err);process.exit(1);});
