'use strict';
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

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

const navigation=fs.readFileSync('js/06-navigation.js','utf8');
assert(/history\.pushState\(/.test(navigation),'internal top-level navigation must create a browser history entry for Android/TWA Back');
assert(/history\.replaceState\(/.test(navigation),'internal-to-internal navigation must stay shallow instead of growing a deep history stack');
assert(/addEventListener\(['\"]popstate['\"]/.test(navigation),'navigation must consume browser popstate to render the previous app screen');
assert(/if\(!page\)return;/.test(navigation),'states outside QiblaAstro must remain owned by Android/browser and must not be trapped');

const serviceWorker=fs.readFileSync('service-worker.js','utf8');
assert(serviceWorker.includes("'./js/06-navigation.js'"),'service worker must include the navigation shell in its critical presentation cache');
assert(/fetch\(r,\{cache:['\"]no-store['\"]\}\)/.test(serviceWorker),'service worker must network-refresh JS/CSS/HTML instead of pinning stale navigation code');

// Execute the production navigation file against a minimal browser-history model.
// This catches the exact Android/TWA contract: one Back from any top-level internal
// screen returns Home, internal-to-internal movement remains one history level,
// Forward restores the internal screen, and Back from Home is not trapped.
(function testNavigationHistoryContract(){
  function classList(){
    const values=new Set();
    return {
      add(v){values.add(v);},
      remove(v){values.delete(v);},
      toggle(v,on){if(on===undefined){if(values.has(v)){values.delete(v);return false;}values.add(v);return true;}if(on)values.add(v);else values.delete(v);return !!on;},
      contains(v){return values.has(v);}
    };
  }
  function page(id,active){
    const p={id:'page-'+id,classList:classList(),scrollTop:0,children:[],querySelector(){return null;},appendChild(x){this.children.push(x);}};
    if(active)p.classList.add('active');
    return p;
  }
  const pages={home:page('home',true),settings:page('settings',false),prayer:page('prayer',false)};
  const bodyAttrs={};
  const body={
    classList:classList(),scrollTop:0,
    setAttribute(k,v){bodyAttrs[k]=String(v);},
    getAttribute(k){return bodyAttrs[k]||null;}
  };
  const documentMock={
    body,
    documentElement:{scrollTop:0},
    head:{appendChild(){}},
    getElementById(id){return Object.values(pages).find(p=>p.id===id)||null;},
    querySelectorAll(sel){if(sel==='.page')return Object.values(pages);if(sel==='.nav-item')return [];return [];},
    querySelector(sel){
      if(sel==='script[data-qibla-analytics-screen-tracker]')return {};
      if(sel==='.page.active')return Object.values(pages).find(p=>p.classList.contains('active'))||null;
      return null;
    },
    createElement(){return {classList:classList(),setAttribute(){},addEventListener(){},dataset:{}};}
  };
  const listeners={};
  const windowMock={
    _gnssWatchId:null,
    addEventListener(type,fn){listeners[type]=fn;},
    dispatchEvent(){},
    scrollTo(){}
  };
  const entries=[null];
  let index=0;
  let outsideBack=0;
  const historyMock={
    replaceState(state){entries[index]=state;},
    pushState(state){entries.splice(index+1);entries.push(state);index=entries.length-1;},
    back(){
      if(index===0){outsideBack++;return;}
      index--;
      if(listeners.popstate)listeners.popstate({state:entries[index]});
    },
    forward(){
      if(index>=entries.length-1)return;
      index++;
      if(listeners.popstate)listeners.popstate({state:entries[index]});
    }
  };
  Object.defineProperty(historyMock,'state',{get(){return entries[index];}});
  const sandbox={
    console,
    document:documentMock,
    window:windowMock,
    history:historyMock,
    navigator:{geolocation:{clearWatch(){}}},
    CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail;},
    requestAnimationFrame(fn){fn();},
    setTimeout(fn){fn();},
    clearTimeout(){},
    Object,Array,Set
  };
  windowMock.document=documentMock;
  windowMock.history=historyMock;
  vm.createContext(sandbox);
  vm.runInContext(navigation,sandbox,{filename:'js/06-navigation.js'});

  assert.strictEqual(historyMock.state.qiblaastroNav.page,'home','navigation boot must establish Home as the history root');
  sandbox.GT('settings');
  assert.strictEqual(index,1,'opening an internal screen from Home must add exactly one history entry');
  assert.strictEqual(historyMock.state.qiblaastroNav.page,'settings');
  assert.strictEqual(bodyAttrs['data-qa-active-page'],'settings');

  sandbox.GT('prayer');
  assert.strictEqual(index,1,'internal-to-internal navigation must replace the single internal entry');
  assert.strictEqual(historyMock.state.qiblaastroNav.page,'prayer');
  assert.strictEqual(bodyAttrs['data-qa-active-page'],'prayer');

  historyMock.back();
  assert.strictEqual(index,0,'Android/browser Back must consume the internal entry');
  assert.strictEqual(bodyAttrs['data-qa-active-page'],'home','Back from an internal screen must render Home');

  historyMock.forward();
  assert.strictEqual(index,1,'Forward must restore the one internal entry');
  assert.strictEqual(bodyAttrs['data-qa-active-page'],'prayer','Forward must re-render the internal screen');

  sandbox.GT('home');
  assert.strictEqual(index,0,'the in-app Home action must consume the same internal history entry');
  assert.strictEqual(bodyAttrs['data-qa-active-page'],'home');

  historyMock.back();
  assert.strictEqual(outsideBack,1,'Back from Home must not be trapped by QiblaAstro navigation');
})();

const core=fs.readFileSync('js/04-core.js','utf8');
assert(/const\s+UTC_OFF\s*=\s*3\s*;/.test(core),'legacy solar-event UTC+3 contract must remain explicit behind the isolated civil-time adapter');
const timezoneAudit=fs.readFileSync('checkpoints/PRAYER_TIMEZONE_AUDIT_2026-08-14.md','utf8');
assert(timezoneAudit.includes('original global time-zone release blocker is CLOSED'),'timezone audit must record the verified isolated migration');

const treeCandidates=['AndroidManifest.xml','build.gradle','build.gradle.kts','settings.gradle','settings.gradle.kts'];
for(const p of treeCandidates)assert(!fs.existsSync(p),`unexpected native project root appeared outside the guarded Bubblewrap generation path: ${p}`);

console.log('A2 pre-native Web/PWA release-readiness structure: PASS');
console.log('Location onboarding: permission grant is separated from GNSS fix readiness; notification prompting remains contextual.');
console.log('Navigation: Android/TWA Back returns one top-level internal screen to Home; Home Back remains browser/Android-owned.');
console.log('Service Worker: navigation shell is critical-cached and JS/CSS/HTML use network-first no-store refresh.');
console.log('Timezone status: legacy UTC+3 engine contract is isolated behind verified production civil-time conversion.');
console.log('Native-source checkpoint remains separately governed by the guarded Bubblewrap/native-injection release path.');
console.log('This is a pre-native source gate; APK/AAB artifacts still require their dedicated build/signing verification.');
