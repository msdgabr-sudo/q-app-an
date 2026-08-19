/* QiblaAstro — Android/TWA bridge recovery for code5.
 * Presentation/integration only. It never reads or writes coordinates and never
 * calculates Qibla, prayer times, WMM or astronomical values.
 */
(function(root){
'use strict';
var TOKEN_KEY='qiblaastro:native-token';
var installed=false;
var observer=null;

function isTwa(){
  try{
    var q=new URLSearchParams(root.location.search||'');
    return q.get('twa')==='1'||root.sessionStorage.getItem('qiblaastro:twa')==='1';
  }catch(_){return false;}
}
function captureToken(){
  try{
    var raw=String(root.location&&root.location.hash||'').replace(/^#/,'');
    if(raw){
      var p=new URLSearchParams(raw),t=p.get('nativeToken');
      if(t&&t.length>=32){root.sessionStorage.setItem(TOKEN_KEY,t);return t;}
    }
    return root.sessionStorage.getItem(TOKEN_KEY)||'';
  }catch(_){return '';}
}
function token(){var t=captureToken();return t&&t.length>=32?t:'';}
function primary(){return root.document&&root.document.getElementById('qa-permission-allow');}
function note(text){var n=root.document&&root.document.getElementById('qa-permission-note');if(n)n.textContent=text;}
function locationState(value){
  var n=root.document&&root.document.querySelector('[data-qa-permission-state="location"]');
  if(!n)return;
  n.textContent=value;
  n.className='qa-permission-state wait';
}
function launch(uri){
  try{(root.top||root).location.href=uri;return true;}catch(_){try{root.location.href=uri;return true;}catch(__){return false;}}
}
function bootstrap(){
  var b=primary();
  if(b){b.disabled=false;b.dataset.stage='native-bootstrap';b.textContent='إعادة ربط Android';}
  locationState('بانتظار Android');
  note('سيعيد Android فتح QiblaAstro بقناة الربط الآمنة، ثم نكمل صلاحية الموقع.');
}
function permissionBridge(){
  var t=token(),b=primary();
  if(!t){bootstrap();return false;}
  if(b){b.disabled=true;b.dataset.stage='native-location-permission';b.textContent='فتح صلاحية الموقع في Android...';}
  locationState('طلب Android');
  note('يتم طلب صلاحية الموقع من Android مباشرة ثم يعود التطبيق لإكمال GNSS الموثوق.');
  if(!launch('qiblaastro://location-permission?token='+encodeURIComponent(t))){
    if(b){b.disabled=false;b.dataset.stage='location';b.textContent='إعادة المحاولة';}
    note('تعذر فتح مسار صلاحية Android. أغلق التطبيق وافتحه من أيقونته ثم أعد المحاولة.');
    return false;
  }
  return true;
}
async function permissionStatus(){
  try{
    if(!root.navigator.permissions||typeof root.navigator.permissions.query!=='function')return 'unknown';
    var s=await root.navigator.permissions.query({name:'geolocation'});
    return s&&s.state?s.state:'unknown';
  }catch(_){return 'unknown';}
}
function reconcile(){
  if(!isTwa()||!root.document||!root.document.getElementById('qa-permission-overlay'))return;
  if(!token()){bootstrap();return;}
  permissionStatus().then(function(state){
    if(state==='granted'){
      var b=primary();
      if(b&&b.dataset.stage==='native-location-permission'){b.disabled=false;b.dataset.stage='location';b.textContent='إعادة المحاولة';}
      try{if(root.QiblaPermissions&&typeof root.QiblaPermissions.recoverTrustedGnss==='function')root.QiblaPermissions.recoverTrustedGnss();}catch(_){ }
    } else if(state==='denied'||state==='prompt'||state==='unknown') {
      var b2=primary();
      if(b2&&b2.dataset.stage!=='native-bootstrap'&&b2.dataset.stage!=='native-location-permission'){
        b2.disabled=false;b2.dataset.stage='native-location-permission';b2.textContent='السماح بالموقع في Android';
        locationState('بانتظار الموافقة');
        note('اضغط للسماح بالموقع من Android. لن يقرأ المسار الأصلي أي إحداثيات؛ سيعود التطبيق بعدها إلى GNSS الموثوق.');
      }
    }
  });
}
function onClick(event){
  var b=event.target&&event.target.closest?event.target.closest('#qa-permission-allow'):null;
  if(!b||!isTwa())return;
  if(!token()||b.dataset.stage==='native-bootstrap'){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    bootstrap();launch('qiblaastro://native-bootstrap');return;
  }
  if(b.dataset.stage==='native-location-permission'){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    permissionBridge();
  }
}
function start(){
  if(installed||!root.document||!isTwa())return;installed=true;
  root.document.addEventListener('click',onClick,true);
  try{observer=new MutationObserver(reconcile);observer.observe(root.document.body||root.document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','data-stage']});}catch(_){ }
  root.addEventListener('focus',function(){captureToken();root.setTimeout(reconcile,120);});
  root.document.addEventListener('visibilitychange',function(){if(!root.document.hidden){captureToken();root.setTimeout(reconcile,120);}});
  root.setTimeout(reconcile,100);
}
root.QiblaNativeBridgeRecovery=Object.freeze({reconcile:reconcile,bootstrap:bootstrap,requestLocationPermission:permissionBridge,hasToken:function(){return !!token();}});
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof globalThis!=='undefined'?globalThis:window);
