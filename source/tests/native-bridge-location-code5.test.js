'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const manifest=JSON.parse(read('android-twa/twa-manifest.json'));
const bootstrap=read('js/presentation/bootstrap.js');
const recovery=read('js/presentation/native-bridge-recovery.js');
const inject=read('android-twa/apply_native_widget.ps1');
const permission=read('android-twa/native/prayer-widget/LocationPermissionActivity.java');
const launcher=read('android-twa/native/prayer-widget/QiblaLauncherActivity.java');
const sw=read('service-worker.js');

assert.strictEqual(manifest.appVersion,'3.1.2');
assert.strictEqual(manifest.appVersionCode,5);
assert(bootstrap.includes('native-bridge-recovery.js?v=20260819-code5-bridge1'));
assert(recovery.includes("var REQUIRED_BRIDGE='5'"));
assert(recovery.includes("q.get('nativeBridge')"));
assert(recovery.includes('if(!b||!isTwa()||!isCode5())return;'),'code5-only custom routes must be gated from code4 clients');
assert(recovery.includes("qiblaastro://native-bootstrap"));
assert(recovery.includes("qiblaastro://location-permission?token="));
assert(!/intent:\/\/native-bootstrap|play\.google\.com|market:\/\//i.test(recovery),'bridge recovery must never fall back to Google Play');
assert(inject.includes("android:host=\"native-bootstrap\""));
assert(inject.includes('LocationPermissionActivity'));
assert(inject.includes('android:host="location-permission"'));
assert(permission.includes('NativeBridgeToken.valid'));
assert(permission.includes('requestPermissions'));
assert(permission.includes('ACCESS_FINE_LOCATION')&&permission.includes('ACCESS_COARSE_LOCATION'));
for(const forbidden of ['getLastLocation','getCurrentLocation','requestLocationUpdates','FusedLocationProviderClient','LAT','LON','calcQibla','calcPrayers']){
  assert(!permission.includes(forbidden),`native permission bridge must not acquire/calculate: ${forbidden}`);
}
assert(launcher.includes('NativeBridgeToken.getOrCreate'));
assert(launcher.includes('appendQueryParameter("nativeBridge", NATIVE_BRIDGE_VERSION)'));
assert(launcher.includes('.fragment(fragment.toString())'));
assert(sw.includes("qiblaastro-v6.21-code5-native-bridge-location"));
assert(sw.includes("'./js/presentation/native-bridge-recovery.js'"));
assert(sw.includes("'./js/presentation/location-service-control.js'"));
assert(sw.includes('matchCodeCache'));
console.log('PASS: code5 native bootstrap + foreground Location permission recovery contract');
