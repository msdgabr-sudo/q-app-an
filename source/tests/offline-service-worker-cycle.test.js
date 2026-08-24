/* QiblaAstro — isolated offline Service Worker experiment gate. */
'use strict';
const fs=require('fs');
const assert=require('assert');

const sw=fs.readFileSync('service-worker.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const home=fs.readFileSync('js/home-final.js','utf8');
const i18n=fs.readFileSync('js/i18n/english-rollout.js','utf8');
const astro=fs.readFileSync('js/astro-verification.js','utf8');
const shell=sw.match(/const\s+APP_SHELL\s*=\s*\[([\s\S]*?)\];/);
assert(shell,'Service Worker APP_SHELL declaration is missing');
const assets=[...shell[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);

assert.strictEqual((index.match(/serviceWorker\.register\s*\(/g)||[]).length,1,'index.html must remain the single Service Worker registration owner');
assert.strictEqual((home.match(/serviceWorker\.register\s*\(/g)||[]).length,0,'home-final.js must not register a second worker');
assert.strictEqual((i18n.match(/serviceWorker\.register\s*\(/g)||[]).length,0,'English rollout must not replace the worker with a query-string script URL');
assert(home.includes("getRegistration('./')"),'home-final.js must reuse the canonical registration');
assert(i18n.includes("getRegistration('./')"),'English rollout must reuse the canonical registration');

assert(sw.includes("const OFFLINE_URL='./offline.html'"),'local offline fallback is required');
assert(sw.includes('cachedResponse(request)')&&sw.includes('{ignoreSearch:true}'),'version query strings must resolve to precached canonical assets');
assert(sw.includes('await precacheRequired()'),'required assets must complete before activation');
assert(sw.includes('Promise.allSettled(OPTIONAL_ASSETS'),'only optional audio may use best-effort caching');

assert(Array.isArray(assets)&&assets.length>250,'offline shell must contain the complete local presentation and Quran data');
assert.strictEqual(new Set(assets).size,assets.length,'offline asset manifest must not contain duplicates');
for(const url of assets){
  assert(url.startsWith('./'),'offline asset paths must be local and relative: '+url);
  assert(fs.existsSync(url.slice(2)),'offline asset is missing: '+url);
}

for(const required of ['./index.html','./offline.html','./manifest.json','./js/presentation/bootstrap.js','./pages/prayer.html','./pages/quran.html','./pages/azkar.html','./pages/serenity.html','./pages/falaki.html']){
  assert(assets.includes(required),'required offline shell entry missing: '+required);
}

const stack=astro.match(/var STACK_SCRIPTS = Object\.freeze\(\[([\s\S]*?)\]\);/);
assert(stack,'astronomical stack declaration is missing');
for(const match of stack[1].matchAll(/'([^']+\.js)'/g)){
  assert(assets.includes('./'+match[1]),'astronomical offline module missing: '+match[1]);
}
const stackCss=astro.match(/var STACK_CSS = '([^']+)'/);
assert(stackCss&&assets.includes('./'+stackCss[1]),'astronomical offline stylesheet is missing');

for(const forbidden of ['./js/camera-engine.js','./js/celestial-solver.js','./js/tracking-lock.js']){
  assert(!assets.includes(forbidden),'retired runtime must not return to the offline shell: '+forbidden);
}

console.log('Offline Service Worker: single registration, strict complete shell, query-safe cache fallback, local navigation fallback, and retired-runtime exclusion: PASS');
