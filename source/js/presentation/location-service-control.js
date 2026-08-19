/* QiblaAstro — Android Location service state/control only.
 * Presentation + authenticated native bridge. It never calculates or writes
 * Qibla, prayer, astronomy, city, WMM or coordinate values.
 */
(function(root){
'use strict';
var TOKEN_KEY='qiblaastro:native-token';
var STATE_KEY='qiblaastro:native-location-enabled:v1';
var PERMISSION_KEY='qiblaastro:native-location-permission:v1';
var SERVICE_KEY='qiblaastro:native-location-service:v1';
var BUTTON_ID='qa-location-service-button';
var STYLE_ID='qa-location-service-style';
var nativeState=null;
var nativePermission=null;
var nativeService=null;
var gpsAttempted=false;
var originalTryBrowserGPS=null;
var observer=null;
var pollTimer=null;

function isTwaSurface(){
  try{
    var q=new URLSearchParams(root.location.search||'');
    if(q.get('twa')==='1'){root.sessionStorage.setItem('qiblaastro:twa','1');return true;}
    return root.sessionStorage.getItem('qiblaastro:twa')==='1';
  }catch(_){return false;}
}
function captureNativeState(){
  var previous=[nativeState,nativePermission,nativeService].join('|'),legacy=null,permission=null,service=null;
  try{
    var raw=String(root.location&&root.location.hash||'').replace(/^#/,'');
    if(raw){
      var params=new URLSearchParams(raw),incoming=params.get('nativeLocation');
      var incomingPermission=params.get('nativeLocationPermission');
      var incomingService=params.get('nativeLocationService');
      var changed=false;
      if(incoming==='1'||incoming==='0'){legacy=incoming==='1';root.sessionStorage.setItem(STATE_KEY,incoming);params.delete('nativeLocation');changed=true;}
      if(incomingPermission==='1'||incomingPermission==='0'){permission=incomingPermission==='1';root.sessionStorage.setItem(PERMISSION_KEY,incomingPermission);params.delete('nativeLocationPermission');changed=true;}
      if(incomingService==='1'||incomingService==='0'){service=incomingService==='1';root.sessionStorage.setItem(SERVICE_KEY,incomingService);params.delete('nativeLocationService');changed=true;}
      if(changed){
        var clean=params.toString();
        root.history.replaceState(root.history.state||null,'',root.location.pathname+root.location.search+(clean?'#'+clean:''));
      }
    }
    var savedLegacy=root.sessionStorage.getItem(STATE_KEY);
    var savedPermission=root.sessionStorage.getItem(PERMISSION_KEY);
    var savedService=root.sessionStorage.getItem(SERVICE_KEY);
    if(legacy===null&&(savedLegacy==='1'||savedLegacy==='0'))legacy=savedLegacy==='1';
    if(permission===null&&(savedPermission==='1'||savedPermission==='0'))permission=savedPermission==='1';
    if(service===null&&(savedService==='1'||savedService==='0'))service=savedService==='1';
  }catch(_){legacy=null;permission=null;service=null;}
  nativePermission=permission;
  nativeService=service;
  nativeState=permission!==null&&service!==null?(permission&&service):legacy;
  if(previous!==[nativeState,nativePermission,nativeService].join('|'))gpsAttempted=false;
  return nativeState;
}
function trustedFix(){
  try{
    return typeof gnssHasTrustedFix!=='undefined'&&gnssHasTrustedFix===true&&
      typeof gnssSource!=='undefined'&&gnssSource==='gps'&&
      typeof LAT!=='undefined'&&typeof LON!=='undefined'&&
      Number.isFinite(Number(LAT))&&Number.isFinite(Number(LON));
  }catch(_){return false;}
}
function isKnownDisabled(){return isTwaSurface()&&nativeState===false;}
function nativeToken(){try{return root.sessionStorage.getItem(TOKEN_KEY)||'';}catch(_){return '';}}
function ensureStyle(){
  if(!root.document||root.document.getElementById(STYLE_ID))return;
  var s=root.document.createElement('style');s.id=STYLE_ID;
  s.textContent='#'+BUTTON_ID+'{position:absolute;z-index:14;left:50%;top:163px;transform:translateX(-50%);min-width:86px;height:23px;padding:2px 9px;border-radius:999px;border:1px solid rgba(229,188,91,.52);background:rgba(8,20,34,.86);color:#efd078;box-shadow:0 4px 14px rgba(0,0,0,.28);font:700 .48rem/1 inherit;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:3px;direction:rtl;cursor:pointer;backdrop-filter:blur(6px)}#'+BUTTON_ID+'.qa-location-locating{border-color:rgba(102,196,236,.42);color:#91dfff;background:rgba(8,38,56,.78)}#'+BUTTON_ID+'.qa-location-ready{border-color:rgba(75,214,128,.42);color:#7fe5a5;background:rgba(8,48,35,.75);cursor:default}#'+BUTTON_ID+':focus-visible{outline:2px solid rgba(239,208,120,.85);outline-offset:2px}@media(max-width:380px){#'+BUTTON_ID+'{top:163px;min-width:80px;height:22px;font-size:.45rem;padding-inline:8px}}';
  (root.document.head||root.document.documentElement).appendChild(s);
}
function ensureButton(){
  if(!root.document||!isTwaSurface()||nativeState===null)return null;
  var existing=root.document.getElementById(BUTTON_ID);if(existing)return existing;
  var bearing=root.document.querySelector('#page-home .qa-sky .qa-bearing');if(!bearing||!bearing.parentNode)return null;
  ensureStyle();
  var b=root.document.createElement('button');b.type='button';b.id=BUTTON_ID;b.setAttribute('aria-live','polite');b.setAttribute('aria-label','حالة تحديد الموقع');
  b.addEventListener('click',function(event){
    event.preventDefault();event.stopPropagation();
    if(nativeState===false){openSettings();return;}
    if(nativeState===true&&!trustedFix())requestExistingGps(true);
  });
  bearing.parentNode.insertBefore(b,bearing.nextSibling);
  return b;
}
function renderButton(){
  var b=ensureButton();if(!b)return;
  b.className='';
  if(nativePermission===false){b.textContent='◉ منح إذن الموقع';b.setAttribute('aria-label','منح إذن الموقع الدقيق');return;}
  if(nativeService===false){b.textContent='◉ تفعيل الموقع';b.setAttribute('aria-label','تفعيل خدمة الموقع');return;}
  if(nativeState===false){b.textContent='◉ إكمال إعداد الموقع';b.setAttribute('aria-label','إكمال إعداد الموقع');return;}
  if(trustedFix()){b.className='qa-location-ready';b.textContent='● الموقع محدد';b.setAttribute('aria-label','تم تحديد الموقع');return;}
  b.className='qa-location-locating';b.textContent='◌ جارٍ تحديد الموقع';b.setAttribute('aria-label','جاري تحديد الموقع');
}
function requestExistingGps(force){
  if(nativeState!==true||trustedFix())return false;
  if(gpsAttempted&&!force)return false;
  if(typeof root.tryBrowserGPS!=='function')return false;
  gpsAttempted=true;
  try{root.tryBrowserGPS();return true;}catch(_){return false;}
}
function bridgeUri(){
  var token=nativeToken();if(!token)return '';
  return 'qiblaastro://location-settings?token='+encodeURIComponent(token);
}
function recoveryUri(){return'intent://native-bootstrap?reason=location-permission#Intent;scheme=qiblaastro;package=com.qiblalabs;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end';}
function recoverBridge(){
  var uri=recoveryUri();
  try{(root.top||root).location.href=uri;return true;}catch(_){try{root.location.href=uri;return true;}catch(__){return false;}}
}
function openSettings(){
  if(nativeState!==false)return false;
  var uri=bridgeUri(),b=ensureButton();
  if(!uri){if(b)b.textContent='◉ تفعيل الموقع';return false;}
  if(b){b.className='qa-location-locating';b.textContent='◌ فتح إعدادات الموقع...';}
  try{(root.top||root).location.href=uri;return true;}catch(_){try{root.location.href=uri;return true;}catch(__){renderButton();return false;}}
}
function installGpsGuard(){
  if(originalTryBrowserGPS||typeof root.tryBrowserGPS!=='function')return;
  originalTryBrowserGPS=root.tryBrowserGPS;
  root.tryBrowserGPS=function(){
    if(isKnownDisabled()){renderButton();syncOnboarding();return false;}
    return originalTryBrowserGPS.apply(root,arguments);
  };
}
function restoreGpsGuard(){if(originalTryBrowserGPS&&root.tryBrowserGPS!==originalTryBrowserGPS&&nativeState===null){root.tryBrowserGPS=originalTryBrowserGPS;originalTryBrowserGPS=null;}}
function syncOnboarding(){
  if(!root.document||nativeState!==false)return;
  var overlay=root.document.getElementById('qa-permission-overlay');if(!overlay)return;
  var btn=root.document.getElementById('qa-permission-allow');
  var state=root.document.querySelector('[data-qa-permission-state="location"]');
  var note=root.document.getElementById('qa-permission-note');
  var permissionMissing=nativePermission===false;
  if(btn){
    if(btn.dataset.stage!=='location-service')btn.dataset.stage='location-service';
    if(btn.disabled)btn.disabled=false;
    var actionText=permissionMissing?'منح صلاحية الموقع':'تفعيل الموقع';
    if(btn.textContent!==actionText)btn.textContent=actionText;
  }
  if(state){
    var stateText=permissionMissing?'صلاحية Android مطلوبة':'خدمة الموقع متوقفة';
    if(state.textContent!==stateText)state.textContent=stateText;
    if(state.className!=='qa-permission-state wait')state.className='qa-permission-state wait';
  }
  var noteText=permissionMissing?'امنح QiblaAstro صلاحية الموقع الدقيق من نافذة Android للمتابعة.':'خدمة الموقع في الهاتف متوقفة. فعّلها للمتابعة.';
  if(note&&note.textContent!==noteText)note.textContent=noteText;
}
function interceptOnboarding(event){
  var target=event.target&&event.target.closest?event.target.closest('#qa-permission-allow'):null;
  if(!target||!isTwaSurface())return;
  if(!nativeToken()){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    target.disabled=true;target.textContent='جاري استعادة الربط مع Android...';
    var recoveryNote=root.document&&root.document.getElementById('qa-permission-note');if(recoveryNote)recoveryNote.textContent='يتم الآن استعادة قناة Android الموثوقة ثم العودة إلى QiblaAstro.';
    if(!recoverBridge())target.disabled=false;
    return;
  }
  if(nativeState!==false)return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  openSettings();
}
function refresh(){
  installGpsGuard();
  renderButton();
  syncOnboarding();
  if(nativeState===true&&!trustedFix())requestExistingGps(false);
}
function handleNativeReturn(){captureNativeState();refresh();}
function start(){
  captureNativeState();
  if(!isTwaSurface()){restoreGpsGuard();return;}
  if(root.document){
    root.document.addEventListener('click',interceptOnboarding,true);
  }
  if(nativeState===null){restoreGpsGuard();return;}
  ensureStyle();installGpsGuard();refresh();
  if(root.document){
    try{observer=new MutationObserver(function(){renderButton();syncOnboarding();});observer.observe(root.document.body||root.document.documentElement,{childList:true,subtree:true});}catch(_){ }
  }
  root.addEventListener('hashchange',handleNativeReturn);
  root.addEventListener('qiblaastro:gnss-update',refresh);
  root.addEventListener('focus',function(){captureNativeState();refresh();});
  root.document&&root.document.addEventListener('visibilitychange',function(){if(!root.document.hidden){captureNativeState();refresh();}});
  pollTimer=root.setInterval(function(){installGpsGuard();renderButton();syncOnboarding();},1000);
}
root.QiblaLocationServiceControl=Object.freeze({isKnownDisabled:isKnownDisabled,isEnabled:function(){return nativeState===true;},openSettings:openSettings,recoverBridge:recoverBridge,refresh:refresh,getState:function(){return nativeState;},getDetails:function(){return {ready:nativeState,permission:nativePermission,service:nativeService};}});
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof globalThis!=='undefined'?globalThis:window);
