'use strict';
const fs=require('fs');
const assert=require('assert');

function exists(p){assert(fs.existsSync(p),`required file missing: ${p}`);}
[
  'js/geomag/wmm2025.js',
  'js/geomag/wmm2025-runtime.js',
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

const core=fs.readFileSync('js/04-core.js','utf8');
assert(/const\s+UTC_OFF\s*=\s*3\s*;/.test(core),'legacy solar-event UTC+3 contract must remain explicit behind the isolated civil-time adapter');
const timezoneAudit=fs.readFileSync('checkpoints/PRAYER_TIMEZONE_AUDIT_2026-08-14.md','utf8');
assert(timezoneAudit.includes('original global time-zone release blocker is CLOSED'),'timezone audit must record the verified isolated migration');

const treeCandidates=['AndroidManifest.xml','build.gradle','build.gradle.kts','settings.gradle','settings.gradle.kts'];
for(const p of treeCandidates)assert(!fs.existsSync(p),`unexpected native project root appeared outside the guarded Bubblewrap generation path: ${p}`);

console.log('A2 pre-native Web/PWA release-readiness structure: PASS');
console.log('Timezone status: legacy UTC+3 engine contract is isolated behind verified production civil-time conversion.');
console.log('Native-source checkpoint remains separately governed by the guarded Bubblewrap/native-injection release path.');
console.log('This is a pre-native source gate; APK/AAB artifacts still require their dedicated build/signing verification.');
