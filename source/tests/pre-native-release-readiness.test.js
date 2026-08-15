'use strict';
const fs=require('fs');
const assert=require('assert');

function exists(p){assert(fs.existsSync(p),`required file missing: ${p}`);}
[
  'js/geomag/wmm2025.js',
  'js/geomag/wmm2025-runtime.js',
  'js/presentation/permissions-onboarding.js',
  'tests/wmm2025-official-gate.js',
  'tests/wmm2025-global-coverage.test.js',
  'tests/wmm2025-runtime-integration.test.js',
  'tests/prayer-location-deviation.test.js',
  'tests/local-timezone-adapter.test.js',
  'tests/timezone-production-wiring.test.js',
  'tests/trusted-location-runtime-sync.test.js',
  'tests/falaki-location-propagation.test.js',
  'tests/i18n-roundtrip-safety.test.js',
  'tests/astronomical-verification-store-persistence.test.js',
  'checkpoints/PRAYER_TIMEZONE_AUDIT_2026-08-14.md',
  'checkpoints/NATIVE_ANDROID_SOURCE_BLOCKER_2026-08-14.md'
].forEach(exists);

const gnss=fs.readFileSync('js/05-gnss.js','utf8');
assert(/let\s+LAT\s*=\s*Number\.NaN/.test(gnss),'GNSS must fail closed without a default city');
assert(/gnssSource\s*=\s*['\"]unresolved['\"]/.test(gnss),'GNSS must start unresolved');
assert(!/get\.geojs|freeipapi|ipwhois/.test(gnss),'sensitive runtime must not call IP geolocation services');
assert(/function\s+tryIPGeo\s*\(\)/.test(gnss),'compatibility alias may remain');

const permissions=fs.readFileSync('js/presentation/permissions-onboarding.js','utf8');
assert(/function\s+queryLocationPermission\s*\(/.test(permissions),'onboarding must inspect the browser/TWA geolocation permission state');
assert(/if\(err&&err\.code===1\)\{finish\('denied'\)/.test(permissions),'only PERMISSION_DENIED may classify location permission as denied');
assert(/finish\('granted'\);\s*\n\s*\}/.test(permissions),'position timeout/unavailable must not be confused with a denied permission');
assert(/var\s+notificationResult=currentWebNotificationState\(\)/.test(permissions),'first-run onboarding must not launch a competing notification prompt');
assert(!/var\s+notificationPromise=requestWebNotifications\(\)/.test(permissions),'legacy concurrent notification/location permission request must remain removed');
assert(/typeof\s+root\.tryBrowserGPS===['\"]function['\"]/.test(permissions),'successful permission onboarding must hand off to the existing trusted GNSS path');

// Production Android/TWA Back contract: index.html contains the historical inline
// navigation wrapper, therefore the authoritative runtime hotfix must live in a
// guaranteed script that executes after parsing. Test the actual integration points,
// not the unused split navigation file in isolation.
const indexHtml=fs.readFileSync('index.html','utf8');
const homeFinal=fs.readFileSync('js/home-final.js','utf8');
assert(indexHtml.includes("var _pageHistory = ['home'];"),'expected historical inline Back wrapper not found; review navigation architecture before changing this gate');
assert(indexHtml.includes('var _origGT = GT;'),'expected production inline GT wrapper not found; review navigation architecture before changing this gate');
assert(/Android\/TWA Back compatibility layer/.test(homeFinal),'production runtime Back compatibility layer must be present in home-final.js');
assert(/var\s+renderPage=\(typeof\s+window\._origGT===['\"]function['\"]\)\?window\._origGT:window\.GT/.test(homeFinal),'runtime layer must bypass the legacy GT history wrapper and retain only its renderer');
assert(/history\.replaceState\(stateFor\('home'\)/.test(homeFinal),'startup must replace the current entry with Home rather than push a duplicate entry');
assert(/if\(current===['\"]home['\"]\)history\.pushState\(stateFor\(id\)/.test(homeFinal),'opening a top-level internal screen from Home must create exactly one browser history entry');
assert(/else\s+history\.replaceState\(stateFor\(id\)/.test(homeFinal),'internal-to-internal navigation must replace the single internal entry');
assert(/window\.addEventListener\(['\"]popstate['\"],function\(event\)[\s\S]*stopImmediatePropagation\(\)[\s\S]*statePage\(event\.state\)/.test(homeFinal),'capture-phase popstate handler must neutralize the obsolete inline listener and render the browser-selected app state');
assert(/\},true\);/.test(homeFinal),'production popstate handler must be registered in capture phase');
assert(/if\(page\)render\(page\)/.test(homeFinal),'Back to the QiblaAstro Home state must render Home');
assert(/If page is null, this history entry is outside QiblaAstro/.test(homeFinal),'outside-history navigation must remain Android/Chrome-owned');
assert(/__qiblaBackNavigation=\{version:VERSION,owner:['\"]home-final['\"]/.test(homeFinal),'runtime must expose a diagnostic marker for phone acceptance verification');

const serviceWorker=fs.readFileSync('service-worker.js','utf8');
assert(serviceWorker.includes("'./js/home-final.js'"),'service worker must critical-cache the guaranteed production runtime entry point');
assert(/fetch\(r,\{cache:['\"]no-store['\"]\}\)/.test(serviceWorker),'service worker must network-refresh JS/CSS/HTML instead of pinning stale navigation code');

const core=fs.readFileSync('js/04-core.js','utf8');
assert(/const\s+UTC_OFF\s*=\s*3\s*;/.test(core),'legacy solar-event UTC+3 contract must remain explicit behind the isolated civil-time adapter');
const timezoneAudit=fs.readFileSync('checkpoints/PRAYER_TIMEZONE_AUDIT_2026-08-14.md','utf8');
assert(timezoneAudit.includes('original global time-zone release blocker is CLOSED'),'timezone audit must record the verified isolated migration');

const treeCandidates=['AndroidManifest.xml','build.gradle','build.gradle.kts','settings.gradle','settings.gradle.kts'];
for(const p of treeCandidates)assert(!fs.existsSync(p),`unexpected native project root appeared outside the guarded Bubblewrap generation path: ${p}`);

console.log('A2 pre-native Web/PWA release-readiness structure: PASS');
console.log('Location onboarding: permission grant is separated from GNSS fix readiness; notification prompting remains contextual.');
console.log('Navigation: production runtime hotfix bypasses the legacy inline history wrapper and gives Android/TWA Back a single Home return entry.');
console.log('Service Worker: home-final.js is critical-cached and JS/CSS/HTML use network-first no-store refresh.');
console.log('Timezone status: legacy UTC+3 engine contract is isolated behind verified production civil-time conversion.');
console.log('Native-source checkpoint remains separately governed by the guarded Bubblewrap/native-injection release path.');
console.log('This is a pre-native source gate; APK/AAB artifacts still require their dedicated build/signing verification.');
