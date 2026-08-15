// ══════════════════════════════════════════════════════════════════════════════
// [JS-6] NAVIGATION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

const TABS=['home','compass','prayer','azkar','night','quran','settings','serenity'];

// Android/TWA Back is driven by the browser session history. QiblaAstro uses a
// single-document UI, so internal screen changes must be represented in History
// without creating a deep stack: Home is the hub, and one Back from any top-level
// internal screen returns to Home. Back from Home remains owned by Android/browser.
const QA_NAV_STATE_KEY='qiblaastroNav';
const QA_NAV_STATE_VERSION=1;
var _qaHistoryRender=false;
var _qaHistoryBackPending=false;

function _qaValidPage(id){
  return !!(id&&document.getElementById('page-'+id));
}

function _qaHistoryState(page){
  var current=history.state;
  var state=(current&&typeof current==='object'&&!Array.isArray(current))?Object.assign({},current):{};
  state[QA_NAV_STATE_KEY]={version:QA_NAV_STATE_VERSION,page:page};
  return state;
}

function _qaHistoryPage(state){
  if(!state||typeof state!=='object')return null;
  var nav=state[QA_NAV_STATE_KEY];
  if(!nav||nav.version!==QA_NAV_STATE_VERSION||!_qaValidPage(nav.page))return null;
  return nav.page;
}

function _qaDomPage(){
  var id='';
  try{id=document.body.getAttribute('data-qa-active-page')||'';}catch(_){ }
  if(_qaValidPage(id))return id;
  try{
    var active=document.querySelector('.page.active');
    if(active&&active.id&&active.id.indexOf('page-')===0){
      id=active.id.slice(5);
      if(_qaValidPage(id))return id;
    }
  }catch(_){ }
  return 'home';
}

function _qaPrimeHistory(){
  var page=_qaHistoryPage(history.state);
  if(page)return page;
  try{history.replaceState(_qaHistoryState('home'),'');}catch(_){ }
  return 'home';
}

function _qaPrepareHistory(id){
  if(_qaHistoryRender)return true;
  var currentHistory=_qaPrimeHistory();
  var currentDom=_qaDomPage();

  if(id==='home'){
    // A screen-owned Home control should consume the single internal history
    // entry rather than leave a duplicate Home entry behind. The popstate event
    // performs the actual render. If we are already on Home, do not intercept
    // Back; Android/browser remains free to leave the app normally.
    if(currentDom!=='home'&&currentHistory!=='home'&&!_qaHistoryBackPending){
      _qaHistoryBackPending=true;
      try{history.back();return false;}catch(_){_qaHistoryBackPending=false;}
    }
    try{history.replaceState(_qaHistoryState('home'),'');}catch(_){ }
    return true;
  }

  try{
    if(currentHistory==='home')history.pushState(_qaHistoryState(id),'');
    else history.replaceState(_qaHistoryState(id),'');
  }catch(_){ }
  return true;
}

function _qaRenderHistoryPage(id){
  if(!_qaValidPage(id))return;
  _qaHistoryRender=true;
  try{GT(id);}finally{_qaHistoryRender=false;}
}

function _qaEnsureInternalHome(page,id){
  if(!page || id==='home') return;
  // Reuse a screen-owned Home control when one already exists; never duplicate it.
  var owned=page.querySelector('[data-go="home"],.qa-internal-home');
  if(owned){
    owned.classList.add('qa-internal-home');
    owned.setAttribute('aria-label','العودة إلى الرئيسية');
    return;
  }
  var b=document.createElement('button');
  b.type='button';
  b.className='qa-internal-home';
  b.setAttribute('aria-label','العودة إلى الرئيسية');
  b.setAttribute('title','الرئيسية');
  b.innerHTML='<span aria-hidden="true">⌂</span>';
  b.addEventListener('click',function(){GT('home');});
  page.appendChild(b);
}

function _qaResetPageScroll(page){
  try{ if(page) page.scrollTop=0; }catch(e){}
  try{ document.documentElement.scrollTop=0; }catch(e){}
  try{ document.body.scrollTop=0; }catch(e){}
  try{ window.scrollTo(0,0); }catch(e){}
}

function _qaFinalizeNavigation(id,page){
  // Dynamic screen mounts, translations and image decoding can shift layout one
  // frame after activation. Reset again after paint so every screen opens from
  // its own top, especially Home after returning from a long internal screen.
  _qaResetPageScroll(page);
  if(typeof requestAnimationFrame==='function'){
    requestAnimationFrame(function(){
      _qaResetPageScroll(page);
      requestAnimationFrame(function(){_qaResetPageScroll(page);});
    });
  } else {
    setTimeout(function(){_qaResetPageScroll(page);},0);
  }
  try{window.dispatchEvent(new CustomEvent('qiblaastro:navigation-change',{detail:{page:id}}));}catch(e){}
}

function GT(id){
  if(!id)id='home';
  if(!_qaValidPage(id)){console.error('Missing page:','page-'+id);return;}
  if(!_qaPrepareHistory(id))return;

  document.body.classList.toggle('qa-internal-screen',id!=='home');
  document.body.classList.toggle('tab-home',id==='home');
  document.body.classList.toggle('hide-topbar',true);
  document.body.setAttribute('data-qa-active-page',id);

  // Compass-only fullscreen presentation state must never leak into Home or any
  // other screen while its own observer is settling.
  if(id!=='compass') document.body.classList.remove('qa-astro-fullscreen-mode');

  document.querySelectorAll('.nav-item').forEach(function(el,i){
    el.classList.toggle('active',TABS[i]===id);
  });
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  var page=document.getElementById('page-'+id);
  page.classList.add('active');
  _qaEnsureInternalHome(page,id);
  _qaResetPageScroll(page);

  if(id!=='compass'&&window._gnssWatchId!=null){
    try{navigator.geolocation.clearWatch(window._gnssWatchId);window._gnssWatchId=null;}catch(e){}
  }
  if(id==='compass'&&gnssSource==='default'){setTimeout(function(){tryBrowserGPS();},400);}
  if(id==='compass'){setTimeout(function(){var ds=gel('dev-slider');if(ds)ds.dispatchEvent(new Event('input'));},500);}
  if(id==='gnss'){setTimeout(function(){if(gnssSource==='default')tryBrowserGPS();},300);}
  if(id==='compass'||id==='gnss'){updateQiblaFromPosition();}
  if(id==='quran'){_qrActive=true;try{qrInit();}catch(e){}}
  else{try{qrDeactivate();}catch(e){}}
  if(id==='serenity'){
    _skActive=true;
    setTimeout(function(){try{skInit();}catch(e){console.error('skInit error:',e);}},50);
  } else {
    _skActive=false;
    try{skDeactivate();}catch(e){}
  }

  // Home is the navigation hub. Internal screens never retain the legacy tab/ad chrome.
  var nav=document.querySelector('nav.nav,div.nav,.nav');
  if(nav)nav.style.display='none';
  var ad=document.querySelector('.ad-slot');
  if(ad)ad.style.display='none';

  _qaFinalizeNavigation(id,page);
}

// Establish Home as the current document's history root without changing the URL.
_qaPrimeHistory();

window.addEventListener('popstate',function(event){
  _qaHistoryBackPending=false;
  var page=_qaHistoryPage(event.state);
  // A state outside QiblaAstro belongs to the browser/Android. Do not trap it.
  if(!page)return;
  _qaRenderHistoryPage(page);
});

// If the document itself is reloaded while an internal history state is active,
// restore that screen after all modules are available instead of corrupting the
// history stack or forcing an exit.
window.addEventListener('load',function(){
  var page=_qaHistoryPage(history.state);
  if(page&&page!==_qaDomPage())_qaRenderHistoryPage(page);
});

/* Analytics is intentionally isolated from navigation logic. This loader only attaches
   the privacy-safe screen/view timer; it does not change GT(), sensors or page state. */
(function(){
  'use strict';
  if(document.querySelector('script[data-qibla-analytics-screen-tracker]'))return;
  var s=document.createElement('script');
  s.src='js/analytics/privacy-safe-screen-tracker.js?v=20260814-release1';
  s.defer=true;
  s.dataset.qiblaAnalyticsScreenTracker='1';
  s.onerror=function(){try{console.warn('[analytics] screen tracker unavailable');}catch(_){ }};
  (document.head||document.documentElement).appendChild(s);
})();
