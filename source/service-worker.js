/* QiblaAstro 3.1.0/code 3 — isolated offline reliability experiment.
 * No GNSS, camera, prayer, astronomical or presentation logic is changed here.
 * © 2026 Mohamed SG Behairy. All Rights Reserved. */
'use strict';

const VERSION='qiblaastro-3.1.0-code3-location-only-r1';
const CACHE_GENERATION='qiblaastro-3.1.0-code3-offline-exp-r1';
const BRIDGE_RELEASE='prayer-direct-20260818';
const GNSS_RELEASE='trusted-startup-recovery-20260818';
const PERMISSIONS_RELEASE='code3-location-only-20260819-r1';
const CACHE_PREFIX='qiblaastro-';
const APP_CACHE=CACHE_GENERATION+'-app';
const RUNTIME_CACHE=CACHE_GENERATION+'-runtime';
const OFFLINE_URL='./offline.html';
const APP_SHELL = [
  './css/01-variables.css',
  './css/02-sky-backgrounds.css',
  './css/03-reset-base.css',
  './css/04-splash.css',
  './css/05-topbar.css',
  './css/06-navigation.css',
  './css/07-pages.css',
  './css/08-compass-canvas.css',
  './css/09-qibla-hero.css',
  './css/10-stat-grid.css',
  './css/11-section-headers.css',
  './css/12-sky-track.css',
  './css/15-device-compass.css',
  './css/16-qibla-instructions.css',
  './css/17-calibration.css',
  './css/18-tips.css',
  './css/19-gnss.css',
  './css/20-settings.css',
  './css/21-utility.css',
  './css/24-gemini-compass.css',
  './css/27-animations.css',
  './css/28-astronomical-observatory.css',
  './css/astro-verification-controls.css',
  './css/azkar-final-tuning.css',
  './css/azkar-home-tuning.css',
  './css/azkar-listen.css',
  './css/azkar-new.css',
  './css/azkar-reader-tuning.css',
  './css/compass-astro-dashboard.css',
  './css/compass-confidence-final.css',
  './css/home-4k-background.css',
  './css/home-action-layout-233.css',
  './css/home-card-final-cleanup.css',
  './css/home-final-polish.css',
  './css/home-final.css',
  './css/home-header-controls.css',
  './css/home-hero-final-match.css',
  './css/home-hero-photo.css',
  './css/home-motion-design.css',
  './css/home-pixel-perfect.css',
  './css/home-premium-finish.css',
  './css/home-premium-polish.css',
  './css/home-reference-match.css',
  './css/home-single-screen-cards.css',
  './css/internal-screen-chrome.css',
  './css/live-deviation-confidence.css',
  './css/phone-acceptance-fixes.css',
  './css/presentation/azkar/screen.css',
  './css/presentation/prayer/final-polish.css',
  './css/presentation/prayer/refinement.css',
  './css/presentation/prayer/screen.css',
  './css/presentation/prayer/settings-overrides.css',
  './css/presentation/quran/screen.css',
  './css/presentation/serenity/final-polish.css',
  './css/presentation/serenity/screen.css',
  './css/quran-contrast.css',
  './css/quran-experience.css',
  './css/quran-khatma-plus.css',
  './css/quran-luxe.css',
  './css/quran-reader-center-final.css',
  './css/quran-reader-controls.css',
  './css/quran-reader.css',
  './css/reading-full-width-final.css',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico',
  './icons/hm-astronomy.png',
  './icons/hm-azkar.png',
  './icons/hm-compass.png',
  './icons/hm-gnss.png',
  './icons/hm-prayer.png',
  './icons/hm-quran.png',
  './icons/hm-serenity.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-kaaba.png',
  './icons/icon-moon.png',
  './icons/icon-sextant.png',
  './icons/icon-sun.png',
  './icons/mstile-144x144.png',
  './icons/nav-home.png',
  './icons/nav-settings.png',
  './icons/safari-pinned-tab.svg',
  './images/1784590231216.png',
  './images/1784808776667.png',
  './images/home/qibla-bg-4k.webp',
  './index.html',
  './js/06-navigation.js',
  './js/17-deviation.js',
  './js/analytics/privacy-safe-screen-tracker.js',
  './js/astro-qibla-engine.js',
  './js/astro-verification.js',
  './js/astronomical-observation-bridge.js',
  './js/astronomical-observatory-ui.js',
  './js/astronomical-solver.js',
  './js/astronomical-trace.js',
  './js/astronomical-verification-session.js',
  './js/astronomical-verification-store.js',
  './js/azkar-alert-audio-map.js',
  './js/azkar-data.js',
  './js/azkar-dua-overlay.js',
  './js/azkar-final-ui.js',
  './js/azkar-native-reminders.js',
  './js/azkar-new.js',
  './js/azkar-verified-overlay.js',
  './js/camera-pose.js',
  './js/camera-projection.js',
  './js/celestial-detector.js',
  './js/compass-astro-dashboard.js',
  './js/compass-cards.js',
  './js/compass-mode-view.js',
  './js/compass-premium-render.js',
  './js/coordinate-frames.js',
  './js/geomag/wmm2025-runtime.js',
  './js/geomag/wmm2025.js',
  './js/gravity-reference.js',
  './js/home-final.js',
  './js/home-reference-finalizer.js',
  './js/i18n/dynamic-patterns.js',
  './js/i18n/en-batch1.js',
  './js/i18n/en-safe2.js',
  './js/i18n/english-rollout.js',
  './js/i18n/extra-phrases.js',
  './js/i18n/fr-phrases.js',
  './js/i18n/general-phrases.js',
  './js/i18n/home-language-picker.js',
  './js/i18n/home-phrases.js',
  './js/i18n/internal-screen-final-phrases.js',
  './js/i18n/internal-screen-language-bridge.js',
  './js/i18n/internal-screen-phrases.js',
  './js/i18n/module-phrases.js',
  './js/i18n/prayer-phrases.js',
  './js/i18n/prayer-settings-complete-phrases.js',
  './js/i18n/safe4-phrases.js',
  './js/i18n/status-phrases.js',
  './js/i18n/ui-phrases.js',
  './js/position-provider.js',
  './js/prayer/calculation-methods.js',
  './js/prayer/prayer-location.js',
  './js/prayer/prayer-settings.js',
  './js/prayer/time-format.js',
  './js/presentation/astro-verification-controls.js',
  './js/presentation/azkar/back-history.js',
  './js/presentation/azkar/host.js',
  './js/presentation/bootstrap.js',
  './js/presentation/compass/astro-live-heading-mirror.js',
  './js/presentation/compass/host.js',
  './js/presentation/compass/live-deviation-confidence.js',
  './js/presentation/compass/trusted-qibla-refresh.js',
  './js/presentation/falaki/event-times-sync.js',
  './js/presentation/falaki/host.js',
  './js/presentation/internal-screen-chrome.js',
  './js/presentation/location-label.js',
  './js/presentation/page-loader.js',
  './js/presentation/page-registry.js',
  './js/presentation/permissions-onboarding.js',
  './js/presentation/prayer/adhan-ui.js',
  './js/presentation/prayer/audio-finalizer.js',
  './js/presentation/prayer/audio-readiness.js',
  './js/presentation/prayer/calculation-settings-ui.js',
  './js/presentation/prayer/location-settings-ui.js',
  './js/presentation/prayer/native-plan.js',
  './js/presentation/prayer/schedule-sync.js',
  './js/presentation/prayer/screen.js',
  './js/presentation/quran/back-history.js',
  './js/presentation/quran/host.js',
  './js/presentation/serenity/screen.js',
  './js/qibla-alignment-reticle.js',
  './js/qibla-card-runtime.js',
  './js/quran-experience.js',
  './js/quran-khatma-plus.js',
  './js/quran-pages.js',
  './js/quran-reader-controls.js',
  './js/quran-reader-meta.js',
  './js/quran-reader.js',
  './js/quran-search-plus.js',
  './js/runtime/local-timezone-adapter.js',
  './js/runtime/trusted-location-dependent-sync.js',
  './js/verification-quality.js',
  './js/world-orientation.js',
  './manifest.json',
  './offline.html',
  './pages/azkar.html',
  './pages/compass.html',
  './pages/falaki.html',
  './pages/prayer.html',
  './pages/quran.html',
  './pages/serenity.html',
  './pages/wmm2025-test.html',
  './quran/1.json',
  './quran/10.json',
  './quran/100.json',
  './quran/101.json',
  './quran/102.json',
  './quran/103.json',
  './quran/104.json',
  './quran/105.json',
  './quran/106.json',
  './quran/107.json',
  './quran/108.json',
  './quran/109.json',
  './quran/11.json',
  './quran/110.json',
  './quran/111.json',
  './quran/112.json',
  './quran/113.json',
  './quran/114.json',
  './quran/12.json',
  './quran/13.json',
  './quran/14.json',
  './quran/15.json',
  './quran/16.json',
  './quran/17.json',
  './quran/18.json',
  './quran/19.json',
  './quran/2.json',
  './quran/20.json',
  './quran/21.json',
  './quran/22.json',
  './quran/23.json',
  './quran/24.json',
  './quran/25.json',
  './quran/26.json',
  './quran/27.json',
  './quran/28.json',
  './quran/29.json',
  './quran/3.json',
  './quran/30.json',
  './quran/31.json',
  './quran/32.json',
  './quran/33.json',
  './quran/34.json',
  './quran/35.json',
  './quran/36.json',
  './quran/37.json',
  './quran/38.json',
  './quran/39.json',
  './quran/4.json',
  './quran/40.json',
  './quran/41.json',
  './quran/42.json',
  './quran/43.json',
  './quran/44.json',
  './quran/45.json',
  './quran/46.json',
  './quran/47.json',
  './quran/48.json',
  './quran/49.json',
  './quran/5.json',
  './quran/50.json',
  './quran/51.json',
  './quran/52.json',
  './quran/53.json',
  './quran/54.json',
  './quran/55.json',
  './quran/56.json',
  './quran/57.json',
  './quran/58.json',
  './quran/59.json',
  './quran/6.json',
  './quran/60.json',
  './quran/61.json',
  './quran/62.json',
  './quran/63.json',
  './quran/64.json',
  './quran/65.json',
  './quran/66.json',
  './quran/67.json',
  './quran/68.json',
  './quran/69.json',
  './quran/7.json',
  './quran/70.json',
  './quran/71.json',
  './quran/72.json',
  './quran/73.json',
  './quran/74.json',
  './quran/75.json',
  './quran/76.json',
  './quran/77.json',
  './quran/78.json',
  './quran/79.json',
  './quran/8.json',
  './quran/80.json',
  './quran/81.json',
  './quran/82.json',
  './quran/83.json',
  './quran/84.json',
  './quran/85.json',
  './quran/86.json',
  './quran/87.json',
  './quran/88.json',
  './quran/89.json',
  './quran/9.json',
  './quran/90.json',
  './quran/91.json',
  './quran/92.json',
  './quran/93.json',
  './quran/94.json',
  './quran/95.json',
  './quran/96.json',
  './quran/97.json',
  './quran/98.json',
  './quran/99.json',
];
const OPTIONAL_ASSETS=[
  './audio/adhan/mecca.mp3',
  './audio/adhan/ahmed-al-nufais.mp3',
  './audio/adhan/islam-sobhi.mp3',
  './audio/adhan/fajr-alafasy.mp3'
];

async function fetchRequired(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response||!response.ok)throw new Error('OFFLINE_ASSET_FAILED: '+url);
  return response;
}

async function precacheRequired(){
  const cache=await caches.open(APP_CACHE);
  const batchSize=12;
  for(let i=0;i<APP_SHELL.length;i+=batchSize){
    await Promise.all(APP_SHELL.slice(i,i+batchSize).map(async url=>{
      const response=await fetchRequired(url);
      await cache.put(url,response);
    }));
  }
}

async function precacheOptional(){
  const cache=await caches.open(APP_CACHE);
  await Promise.allSettled(OPTIONAL_ASSETS.map(async url=>{
    const response=await fetch(url,{cache:'no-store'});
    if(response&&response.ok)await cache.put(url,response.clone());
  }));
}

async function cachedResponse(request){
  return (await caches.match(request))||(await caches.match(request,{ignoreSearch:true}));
}

async function notifyUpdated(){
  try{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      client.postMessage({type:'SW_UPDATED',version:VERSION,bridgeRelease:BRIDGE_RELEASE,gnssRelease:GNSS_RELEASE,permissionsRelease:PERMISSIONS_RELEASE});
    }
  }catch(_){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    await precacheRequired();
    await precacheOptional();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&!name.startsWith(CACHE_GENERATION)).map(name=>caches.delete(name)));
    await self.clients.claim();
    await notifyUpdated();
  })());
});

self.addEventListener('fetch',event=>{
  const r=event.request;
  if(r.method!=='GET')return;
  const url=new URL(r.url);
  if(url.origin!==self.location.origin)return;

  if(r.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(r,{cache:'no-store'});
        if(response&&response.ok)(await caches.open(APP_CACHE)).put(r,response.clone());
        return response;
      }catch(_){
        return (await cachedResponse(r))||(await caches.match('./index.html'))||(await caches.match(OFFLINE_URL))||new Response('',{status:503});
      }
    })());
    return;
  }

  const codeOrData=/\.(?:js|css|html|json)$/i.test(url.pathname);
  if(codeOrData){
    event.respondWith((async()=>{
      try{
        const response=await fetch(r,{cache:'no-store'});
        if(response&&response.ok)(await caches.open(APP_CACHE)).put(r,response.clone());
        return response;
      }catch(_){
        return (await cachedResponse(r))||new Response('',{status:503});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(RUNTIME_CACHE);
    const old=(await cache.match(r))||(await cache.match(r,{ignoreSearch:true}));
    try{
      const response=await fetch(r);
      if(response&&response.ok)cache.put(r,response.clone());
      return response;
    }catch(_){
      return old||(await cachedResponse(r))||new Response('',{status:503});
    }
  })());
});

self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='SKIP_WAITING')self.skipWaiting();
  if(data.type==='GET_VERSION'){
    const reply={type:'SW_VERSION',version:VERSION,bridgeRelease:BRIDGE_RELEASE,gnssRelease:GNSS_RELEASE,permissionsRelease:PERMISSIONS_RELEASE};
    if(event.ports&&event.ports[0])event.ports[0].postMessage(reply);
    else if(event.source)event.source.postMessage(reply);
  }
});
