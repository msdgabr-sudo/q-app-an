'use strict';
const fs=require('fs');
const assert=require('assert');

const sw=fs.readFileSync('service-worker.js','utf8');
const bootstrap=fs.readFileSync('js/presentation/bootstrap.js','utf8');
const location=fs.readFileSync('js/presentation/location-service-control.js','utf8');

assert(sw.includes("const VERSION='qiblaastro-v6.21-native-location-permission'"),'Service Worker cache namespace must advance for the native Location-permission release');
assert(sw.includes("const GNSS_RELEASE='trusted-native-location-permission-20260819-v1'"),'GNSS release marker must identify the native Location-permission recovery release');
assert(sw.includes("'./js/presentation/location-service-control.js'"),'Location service control must be part of the critical precache');
assert(sw.includes("fetch(r,{cache:'no-store'})"),'code/navigation requests must stay network-first with no-store');
assert(sw.includes('async function matchCodeCache(request)'),'versioned code URLs need a normalized offline cache fallback');
assert(sw.includes("u.search=''"),'offline code fallback must strip cache-busting query parameters');
assert(sw.includes("u.origin!==self.location.origin"),'normalized fallback must stay same-origin');
assert(sw.includes('await self.skipWaiting()')&&sw.includes('await self.clients.claim()'),'new Service Worker must take control without waiting for a second lifecycle');
assert(sw.includes("type:'SW_UPDATED'")&&sw.includes('gnssRelease:GNSS_RELEASE'),'clients must be told which GNSS/Location cache release became active');

assert(bootstrap.includes('js/presentation/location-service-control.js?v=20260819-native-location-permission1'),'bootstrap must load the reviewed native Location-permission contract');
assert(location.includes("root.tryBrowserGPS()"),'Location bridge must hand back to the existing Trusted GNSS acquisition path');
assert(!location.includes('getLastKnownLocation')&&!location.includes('getCurrentLocation'),'Service Worker fix must not introduce a native coordinate source');
assert(!sw.includes('bigdatacloud')&&!sw.includes('reverse-geocode'),'Service Worker must not add IP/approximate location fallbacks');

console.log('Service Worker native Location-permission bridge refresh: PASS');
console.log('v6.21 cache namespace + critical Location control precache + versioned offline fallback: PASS');
console.log('Trusted GNSS remains owned by existing browser/device acquisition: PASS');
