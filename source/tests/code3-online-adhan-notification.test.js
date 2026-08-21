'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const policySource=read('js/presentation/prayer/online-adhan-policy.js');
const ui=read('js/presentation/prayer/adhan-ui.js');
const finalizer=read('js/presentation/prayer/audio-finalizer.js');
const sync=read('js/presentation/prayer/schedule-sync.js');
const bootstrap=read('js/presentation/bootstrap.js');
const sw=read('service-worker.js');
const page=read('adhan-online-test.html');

const context={Object};context.globalThis=context;
vm.runInNewContext(policySource,context,{filename:'online-adhan-policy.js'});
const policy=context.QiblaOnlineAdhanPolicy;
assert(policy,'online Adhan policy must load');
for(const name of ['makkah','calm','deep']){
  const p=policy.profile(name);
  assert(p.normal.startsWith('https://app.qiblalabs.com/audio/adhan/'),`${name} must use first-party HTTPS audio`);
  assert(p.fajr.startsWith('https://app.qiblalabs.com/audio/adhan/'),`${name} Fajr must use first-party HTTPS audio`);
}
assert.strictEqual(policy.canPlay({hidden:false,visibilityState:'visible'}),true,'visible page may play online Adhan');
assert.strictEqual(policy.canPlay({hidden:true,visibilityState:'hidden'}),false,'hidden page must not play online Adhan');
assert.strictEqual(policy.nativeMode('adhan'),'notification','closed-app Adhan must degrade to notification');
assert.strictEqual(policy.nativeMode('notification'),'notification','notification mode must remain notification');
assert.strictEqual(policy.nativeMode('off'),'off','disabled prayer must remain disabled');

assert(ui.includes('onlinePolicy.canPlay(root.document)'),'prayer-time audio must check page visibility');
assert(ui.includes('https://app.qiblalabs.com/audio/adhan/'),'UI fallback must remain first-party HTTPS');
assert(finalizer.includes('QiblaOnlineAdhanPolicy')&&finalizer.includes('var ONLINE={'),'final playback guard must retain online URLs');
assert(sync.includes("q.set('m_'+id,nativeNoticeMode("),'native payload must map modes through notification-only policy');
assert(bootstrap.indexOf('online-adhan-policy.js')<bootstrap.indexOf('schedule-sync.js'),'policy must load before native schedule sync');
assert(bootstrap.indexOf('online-adhan-policy.js')<bootstrap.indexOf('adhan-ui.js'),'policy must load before Adhan UI');
assert(sw.includes("VERSION='qiblaastro-3.1.0-code3-online-adhan-exp1'"),'service worker must evict the previous Adhan experiment cache');
assert(sw.includes('./js/presentation/prayer/online-adhan-policy.js'),'policy must remain available in the app shell');
assert(page.includes('online-adhan-policy.js?v=20260821-code3-online-adhan1'),'standalone test must load the real policy source');
for(const forbidden of ['calcQibla(','refreshMdeclFromTrustedGnss(','calcPrayers(','sunPos(','moonPos(','Math.atan2']){
  for(const [name,source] of [['policy',policySource],['ui',ui],['finalizer',finalizer],['sync',sync]])assert(!source.includes(forbidden),`${name} must not touch protected calculation token: ${forbidden}`);
}
console.log('Code 3 online experiment: visible HTTPS Adhan -> hidden no-audio -> native notification-only: PASS');
