'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const recoveryPath = path.join(root, 'js', 'presentation', 'native-bridge-recovery.js');
const recoverySource = fs.readFileSync(recoveryPath, 'utf8');

function storage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(String(key)); },
    dump() { return Object.fromEntries(map.entries()); }
  };
}

function makeContext(hash, search) {
  const sessionStorage = storage();
  const location = { pathname: '/', search: search || '?twa=1', hash: hash || '', href: 'https://app.qiblalabs.com/' + (search || '?twa=1') + (hash || '') };
  let clickHandler = null;
  const document = {
    addEventListener(type, handler) { if (type === 'click') clickHandler = handler; },
    getElementById() { return null; }
  };
  const history = {
    state: null,
    replaceState(state, _title, url) {
      this.state = state;
      const parsed = new URL(String(url), 'https://app.qiblalabs.com');
      location.pathname = parsed.pathname;
      location.search = parsed.search;
      location.hash = parsed.hash;
      location.href = parsed.href;
    }
  };
  const context = vm.createContext({
    console,
    URL,
    URLSearchParams,
    Number,
    JSON,
    Math,
    encodeURIComponent,
    location,
    history,
    sessionStorage,
    document
  });
  context.parent = context;
  context.top = context;
  context.window = context;
  context.__clickHandler = () => clickHandler;
  vm.runInContext(recoverySource, context, { filename: recoveryPath });
  return context;
}

(function testAuthenticatedLaunchCapturedBeforeHashMutation() {
  const token = '0123456789abcdef0123456789abcdef01234567';
  const hash = '#nativeToken=' + token + '&nativeLocation=1&nativeAdhan=0&nativeAzkar=1&azkarInterval=25&azkarPhrase=alhamdulillah&azkarResult=started';
  const ctx = makeContext(hash, '?twa=1');
  const saved = ctx.sessionStorage.dump();

  assert.strictEqual(saved['qiblaastro:native-token'], token, 'per-install token must be captured immediately');
  assert.strictEqual(saved['qiblaastro:twa'], '1', 'TWA surface must be persisted');
  assert.strictEqual(saved['qiblaastro:native-location-enabled:v1'], '1', 'native Location state must survive delayed module load');
  assert.strictEqual(saved['qiblaastro:prayer-native-launch-adhan:v1'], '0', 'native Adhan state must be snapshotted');
  const azkar = JSON.parse(saved['qiblaastro:native-azkar-state:v2']);
  assert.deepStrictEqual(azkar, { active: true, interval: 25, phrase: 'alhamdulillah', result: 'started', issue: '' });
  assert(!ctx.location.hash.includes('nativeToken='), 'secret token must be removed from the visible URL after capture');
  assert(ctx.location.hash.includes('nativeLocation=1'), 'non-secret native state must remain for its established owner to consume');

  // Reproduce the production race: navigation replaces the fragment before delayed modules load.
  ctx.location.hash = '#home';
  assert.strictEqual(ctx.QiblaNativeBridgeRecovery.hasToken(), true, 'bridge token must survive a later navigation hash replacement');
})();

(function testUntrustedNativeStateIsNotAcceptedWithoutToken() {
  const ctx = makeContext('#nativeLocation=1&nativeAdhan=1&nativeAzkar=1', '?twa=1');
  const saved = ctx.sessionStorage.dump();
  assert.strictEqual(saved['qiblaastro:native-location-enabled:v1'], undefined, 'native state without authenticated launch token must not be trusted');
  assert.strictEqual(saved['qiblaastro:prayer-native-launch-adhan:v1'], undefined, 'Adhan ownership must not be forgeable from a web fragment alone');
  assert.strictEqual(saved['qiblaastro:native-azkar-state:v2'], undefined, 'Azkar ownership must not be forgeable from a web fragment alone');
})();

(function testExplicitRecoveryIntentOnUserGesture() {
  const ctx = makeContext('', '?twa=1');
  const target = { id: 'qa-permission-allow', disabled: false, textContent: '', closest() { return this; } };
  let prevented = false, stopped = false;
  const event = {
    target,
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; },
    stopImmediatePropagation() { stopped = true; }
  };
  const handler = ctx.__clickHandler();
  assert.strictEqual(typeof handler, 'function', 'recovery click interceptor must be installed');
  handler(event);
  assert(prevented && stopped, 'missing bridge recovery must own the user gesture before failing legacy handlers run');
  assert(String(ctx.location.href).startsWith('intent://native-bootstrap'), 'recovery must target the dedicated Android launcher alias');
  assert(String(ctx.location.href).includes('package=com.qiblalabs'), 'recovery intent must stay scoped to QiblaAstro package');
})();

(function testPackagingAndLoadOrderContracts() {
  const applyNative = fs.readFileSync(path.join(root, 'android-twa', 'apply_native_widget.ps1'), 'utf8');
  assert(applyNative.includes('NativeBridgeBootstrapAlias'), 'Android build must inject the recovery alias');
  assert(applyNative.includes('android:targetActivity="com.qiblalabs.nativebridge.QiblaLauncherActivity"'), 'recovery alias must target authenticated launcher');
  assert(applyNative.includes('android:host="native-bootstrap"'), 'recovery alias custom-scheme host is missing');

  const finalizer = fs.readFileSync(path.join(root, 'js', 'home-reference-finalizer.js'), 'utf8');
  const recoveryLoad = finalizer.indexOf('loadNativeBridgeRecovery(loadPresentationBootstrap)');
  const bootstrapOnly = finalizer.indexOf('var kaaba=');
  assert(recoveryLoad >= 0 && recoveryLoad < bootstrapOnly, 'native bridge capture must be scheduled before presentation bootstrap/UI work');

  const azkarPage = fs.readFileSync(path.join(root, 'pages', 'azkar.html'), 'utf8');
  assert(azkarPage.indexOf('native-bridge-recovery.js') < azkarPage.indexOf('azkar-native-reminders.js'), 'Azkar must install bridge recovery before native reminder handler');

  const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  assert(sw.includes("'./js/presentation/native-bridge-recovery.js'"), 'offline cache must include native bridge recovery code');
})();

console.log('PASS: native Android/TWA launch token race + explicit bridge recovery are gated.');
