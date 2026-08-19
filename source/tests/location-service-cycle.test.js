'use strict';
const fs=require('fs'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const bootstrap=read('js/presentation/bootstrap.js');
const web=read('js/presentation/location-service-control.js');
const launcher=read('android-twa/native/prayer-widget/QiblaLauncherActivity.java');
const state=read('android-twa/native/prayer-widget/NativeLocationState.java');
const settings=read('android-twa/native/prayer-widget/LocationSettingsActivity.java');
const apply=read('android-twa/apply_native_widget.ps1');
const mergedGate=read('android-twa/check_generated_permissions.py');

// The Location-service bridge starts before permission onboarding and stays separate from scientific engines.
assert(bootstrap.includes("js/presentation/location-service-control.js?v=20260819-native-location-permission1"));
assert(bootstrap.indexOf('loadLocationServiceControl();')<bootstrap.indexOf('loadPrayerCore(loadPermissions);'));
for(const forbidden of ['calcQibla(','AstroVerification','QiblaPrayer','solarEvts(','moonPos(','sunPos(','WMM2025','bigdatacloud','reverse-geocode']){
  assert(!web.includes(forbidden),`Location-service control touched protected/unrelated path: ${forbidden}`);
}
assert(!web.includes('navigator.geolocation.getCurrentPosition'),'service-state layer must reuse the existing trusted GPS acquisition path');
assert(web.includes("root.tryBrowserGPS()"),'Location ON must hand back to the existing GPS function');
assert(web.includes("gnssHasTrustedFix")&&web.includes("gnssSource==='gps'"),'ready state must require the existing trusted GPS contract');

// Android foreground precise permission and the system Location service are separate native states.
for(const label of ['◉ منح إذن الموقع','◉ تفعيل الموقع','◌ جارٍ تحديد الموقع','● الموقع محدد'])assert(web.includes(label),`missing compact state: ${label}`);
for(const token of ['nativeLocationPermission','nativeLocationService','qiblaastro:native-location-permission:v1','qiblaastro:native-location-service:v1'])assert(web.includes(token),`missing split native Location state: ${token}`);
assert(web.includes("qiblaastro://location-settings?token="),'Location settings must use the registered first-party custom scheme');
assert(!web.includes('intent://location-settings'),'Location settings must not use a package-scoped intent fallback');
assert(!/play\.google\.com|market:\/\//i.test(web),'Location service control must contain no Play Store fallback');
assert(web.includes("root.addEventListener('hashchange',handleNativeReturn)"),'return from Android settings must refresh native state');

// The native Android state is authoritative; a stale Chrome/site grant must not bypass the Android runtime prompt.
assert(!web.includes("permissionGranted=status&&status.state==='granted'"));
assert(web.includes("if(nativeState!==false)return"));
assert(web.includes("target.closest('#qa-permission-allow')"));
assert(web.includes("stopImmediatePropagation"));
assert(web.includes('intent://native-bootstrap?reason=location-permission'),'a missing launch token must recover through the installed app');
assert(web.includes('package=com.qiblalabs'),'native bootstrap recovery must be package-scoped');

// Android publishes permission/service booleans only; it never supplies coordinates.
assert(launcher.includes('NativeLocationState.hasPrecisePermission(this)'));
assert(launcher.includes('NativeLocationState.isEnabled(this)'));
for(const token of ['"&nativeLocation="','"&nativeLocationPermission="','"&nativeLocationService="'])assert(launcher.includes(token),`launcher state missing: ${token}`);
assert(state.includes('Manifest.permission.ACCESS_FINE_LOCATION'));
assert(state.includes('PackageManager.PERMISSION_GRANTED'));
assert(state.includes('LocationManager'));
assert(state.includes('manager.isLocationEnabled()'));
assert(state.includes('LocationManager.GPS_PROVIDER')&&state.includes('LocationManager.NETWORK_PROVIDER'));
assert(settings.includes('NativeBridgeToken.valid(this'));
assert(settings.includes('requestPermissions('));
assert(settings.includes('Manifest.permission.ACCESS_COARSE_LOCATION')&&settings.includes('Manifest.permission.ACCESS_FINE_LOCATION'));
assert(settings.includes('onRequestPermissionsResult'));
assert(settings.includes('Settings.ACTION_APPLICATION_DETAILS_SETTINGS'));
assert(settings.includes('Settings.ACTION_LOCATION_SOURCE_SETTINGS'));
assert(settings.includes('NativeLocationState.hasPrecisePermission(this)')&&settings.includes('NativeLocationState.isEnabled(this)'));
assert(settings.includes('QiblaLauncherActivity.class'));
for(const forbidden of ['ACCESS_BACKGROUND_LOCATION','getLastKnownLocation','getCurrentLocation','getLatitude','getLongitude']){
  assert(!settings.includes(forbidden),`Location permission/settings bridge must not acquire coordinates or background access: ${forbidden}`);
}

// Generated AAB must contain the authenticated permission Activity and token-recovery alias, without background location.
assert(apply.includes('com.qiblalabs.nativebridge.LocationSettingsActivity'));
assert(apply.includes('android:host="location-settings"'));
assert(apply.includes('com.qiblalabs.nativebridge.NativeBridgeBootstrapAlias'));
assert(apply.includes('android:host="native-bootstrap"'));
assert(!apply.includes('android.permission.ACCESS_BACKGROUND_LOCATION'));
assert(mergedGate.includes('LOCATION_SETTINGS = "com.qiblalabs.nativebridge.LocationSettingsActivity"'));
assert(mergedGate.includes('NATIVE_BOOTSTRAP_ALIAS = "com.qiblalabs.nativebridge.NativeBridgeBootstrapAlias"'));
assert(mergedGate.includes('"android.permission.ACCESS_BACKGROUND_LOCATION": "foreground precise location is sufficient'));
assert(mergedGate.includes('data.get(ANDROID + "host") == "location-settings"'));
assert(mergedGate.includes('data.get(ANDROID + "host") == "native-bootstrap"'));

console.log('Android precise Location permission + service / Trusted GNSS cycle: PASS');
console.log('User action -> authenticated Android permission -> Location service -> launcher refresh -> existing trusted GPS acquisition: PASS');
console.log('Missing token -> package-scoped native launcher recovery: PASS');
console.log('Scope guard: Qibla / astronomy / city / prayer calculations untouched; background location forbidden: PASS');
