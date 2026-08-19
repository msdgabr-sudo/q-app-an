/* QiblaAstro — Android/TWA native bridge launch capture + explicit recovery.
 * Integration only. Does not read coordinates or calculate Qibla, prayer times,
 * WMM, compass headings, astronomy, camera or verification results.
 */
(function(root){
'use strict';
var TOKEN_KEY='qiblaastro:native-token';
var LOCATION_KEY='qiblaastro:native-location-enabled:v1';
var ADHAN_LAUNCH_KEY='qiblaastro:prayer-native-launch-adhan:v1';
var AZKAR_KEY='qiblaastro:native-azkar-state:v2';
var TWA_KEY='qiblaastro:twa';
var MIN_TOKEN_LENGTH=32;

function eachWindow(fn){
  var seen=[];
  [root,root.parent,root.top].forEach(function(win){
    try{if(!win||seen.indexOf(win)!==-1)return;seen.push(win);fn(win);}catch(_){ }
  });
}
function putSession(key,value){
  eachWindow(function(win){try{if(win.sessionStorage)win.sessionStorage.setItem(key,value);}catch(_){ }});
}
function getSession(key){
  var out='';
  eachWindow(function(win){if(out)return;try{if(win.sessionStorage)out=win.sessionStorage.getItem(key)||'';}catch(_){ }});
  return out;
}
function clampInterval(value){var n=parseInt(value,10);return Number.isFinite(n)?Math.max(15,Math.min(1440,n)):15;}
function safePhrase(value){
  value=String(value||'subhanallah');
  var allowed={subhanallah:1,alhamdulillah:1,allahuakbar:1,lailahaillallah:1,astaghfirullah:1,astaghfirullahalazim:1,subhanallahwabihamdih:1,lahawla:1,hasbiyallah:1,salat:1};
  return allowed[value]?value:'subhanallah';
}
function nativeParams(win){
  try{return new URLSearchParams(String(win.location&&win.location.hash||'').replace(/^#/,''));}catch(_){return null;}
}
function validIncomingToken(params){var token=params&&params.get('nativeToken')||'';return token.length>=MIN_TOKEN_LENGTH?token:'';}
function persistTrustedState(params,token){
  if(!params||!token)return;
  putSession(TOKEN_KEY,token);
  putSession(TWA_KEY,'1');
  var location=params.get('nativeLocation');
  if(location==='1'||location==='0')putSession(LOCATION_KEY,location);
  var adhan=params.get('nativeAdhan');
  if(adhan==='1'||adhan==='0')putSession(ADHAN_LAUNCH_KEY,adhan);
  var azkar=params.get('nativeAzkar');
  if(azkar==='1'||azkar==='0'){
    var state={
      active:azkar==='1',
      interval:clampInterval(params.get('azkarInterval')),
      phrase:safePhrase(params.get('azkarPhrase')),
      result:params.get('azkarResult')||'',
      issue:params.get('azkarIssue')||''
    };
    putSession(AZKAR_KEY,JSON.stringify(state));
  }
}
function cleanOwnToken(params){
  if(!params||!params.has('nativeToken'))return;
  params.delete('nativeToken');
  try{
    var clean=params.toString();
    root.history.replaceState(root.history.state||null,'',root.location.pathname+root.location.search+(clean?'#'+clean:''));
  }catch(_){ }
}
function capture(){
  var own=nativeParams(root),token=validIncomingToken(own);
  if(token){
    // Persist the authenticated launch state immediately. Remove only the secret;
    // leave non-secret native state fields for the existing Location/Adhan/Azkar
    // owners to consume in their established order.
    persistTrustedState(own,token);cleanOwnToken(own);return token;
  }

  // Same-origin parent/top fallback is required by the isolated Azkar screen.
  eachWindow(function(win){
    if(token||win===root)return;
    var params=nativeParams(win),incoming=validIncomingToken(params);
    if(incoming){token=incoming;persistTrustedState(params,incoming);}
  });
  if(token)return token;
  return getSession(TOKEN_KEY);
}
function isTwa(){
  try{
    var q=new URLSearchParams(String(root.location&&root.location.search||''));
    if(q.get('twa')==='1'){putSession(TWA_KEY,'1');return true;}
  }catch(_){ }
  return getSession(TWA_KEY)==='1'||capture().length>=MIN_TOKEN_LENGTH;
}
function hasToken(){return capture().length>=MIN_TOKEN_LENGTH;}
function recoveryIntent(reason){
  var q=reason?'?reason='+encodeURIComponent(String(reason).slice(0,40)):'';
  return'intent://native-bootstrap'+q+'#Intent;scheme=qiblaastro;package=com.qiblalabs;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end';
}
function request(reason){
  if(!isTwa())return false;
  var uri=recoveryIntent(reason||'bridge');
  try{(root.top||root).location.href=uri;return true;}catch(_){try{root.location.href=uri;return true;}catch(__){return false;}}
}
function showRecovering(target){
  try{
    if(target.id==='azAudioToggle'){
      target.disabled=true;target.textContent='جاري استعادة الربط مع Android...';
      var state=root.document.getElementById('azAudioState'),summary=root.document.getElementById('azAudioSummary');
      if(state)state.textContent='جاري استعادة الربط';
      if(summary)summary.textContent='سيعود QiblaAstro تلقائيًا بعد إنشاء قناة Android الموثوقة.';
      return;
    }
    target.disabled=true;target.textContent='جاري استعادة الربط مع Android...';
    var note=root.document.getElementById('qa-permission-note');if(note)note.textContent='يتم الآن إعادة إنشاء قناة الربط الموثوقة مع Android ثم العودة إلى QiblaAstro.';
  }catch(_){ }
}
function interceptMissingBridge(event){
  if(hasToken()||!isTwa())return;
  var target=event.target&&event.target.closest?event.target.closest('#qa-permission-allow,#qa-location-service-button,#azAudioToggle'):null;
  if(!target)return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  showRecovering(target);
  if(!request(target.id||'bridge')){
    try{target.disabled=false;}catch(_){ }
  }
}

capture();
if(root.document)root.document.addEventListener('click',interceptMissingBridge,true);
root.QiblaNativeBridgeRecovery=Object.freeze({capture:capture,hasToken:hasToken,isTwa:isTwa,request:request,tokenKey:TOKEN_KEY});
})(typeof globalThis!=='undefined'?globalThis:window);
