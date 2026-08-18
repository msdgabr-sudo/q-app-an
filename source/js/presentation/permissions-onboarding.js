/* QiblaAstro — first-run permissions onboarding and astronomical camera gate.
 * Presentation/integration only. Does not calculate or modify Qibla, GNSS,
 * astronomy, camera solving or verification results.
 *
 * Security note: this file deliberately does not use a custom-scheme bridge for
 * notification permission. Native POST_NOTIFICATIONS is requested by the native
 * Azkar reminder flow only when the user explicitly enables that feature.
 */
(function(root){
'use strict';
var STORAGE_KEY='qiblaastro:permissions-onboarding:v2';
var mounted=false;
var astroGuardBusy=false;
var gnssRecoveryTimer=null;
var gnssRecoveryAttempt=0;
var GNSS_RECOVERY_DELAYS=[13000,17000,25000];

function isTwaSurface(){
  try{
    var q=new URLSearchParams(root.location.search||'');
    if(q.get('twa')==='1'){root.sessionStorage.setItem('qiblaastro:twa','1');return true;}
    return root.sessionStorage.getItem('qiblaastro:twa')==='1';
  }catch(_){return false;}
}
function isAppSurface(){
  try{
    if(isTwaSurface())return true;
    if(root.matchMedia&&root.matchMedia('(display-mode: standalone)').matches)return true;
    if(root.navigator&&root.navigator.standalone)return true;
  }catch(_){ }
  return false;
}
function readState(){try{return JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'null');}catch(_){return null;}}
function writeState(value){try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch(_){ }}
function permissionLabel(value){return value==='granted'?'مسموح':value==='denied'?'مرفوض':value==='unsupported'?'عند الحاجة':value==='unavailable'?'الموقع غير متاح':'بانتظار الموافقة';}
function permissionClass(value){return value==='granted'||value==='unsupported'?'ok':value==='denied'?'bad':'wait';}

function trustedGnssReady(){
  try{
    return typeof gnssHasTrustedFix!=='undefined'&&gnssHasTrustedFix===true&&
      typeof gnssSource!=='undefined'&&gnssSource==='gps'&&
      typeof LAT!=='undefined'&&typeof LON!=='undefined'&&
      Number.isFinite(Number(LAT))&&Number.isFinite(Number(LON));
  }catch(_){return false;}
}
function trustedGnssBusy(){try{return typeof gnssUpdating!=='undefined'&&gnssUpdating===true;}catch(_){return false;}}
function clearGnssRecovery(){if(gnssRecoveryTimer!==null){try{root.clearTimeout(gnssRecoveryTimer);}catch(_){}gnssRecoveryTimer=null;}}
function scheduleGnssRecovery(){
  if(trustedGnssReady()){clearGnssRecovery();gnssRecoveryAttempt=0;return;}
  if(gnssRecoveryTimer!==null||gnssRecoveryAttempt>=GNSS_RECOVERY_DELAYS.length)return;
  var delay=GNSS_RECOVERY_DELAYS[gnssRecoveryAttempt++];
  gnssRecoveryTimer=root.setTimeout(function(){gnssRecoveryTimer=null;recoverTrustedGnss(false);},delay);
}
async function recoverTrustedGnss(reset){
  if(!isAppSurface())return false;
  if(reset){clearGnssRecovery();gnssRecoveryAttempt=0;}
  if(trustedGnssReady()){clearGnssRecovery();gnssRecoveryAttempt=0;return true;}
  var permission=await queryLocationPermission();
  if(permission==='unknown'){
    var saved=readState();
    if(saved&&saved.completed&&saved.location==='granted')permission='granted';
  }
  if(permission!=='granted')return false;
  if(!trustedGnssBusy()&&typeof root.tryBrowserGPS==='function'){
    try{root.tryBrowserGPS();}catch(_){ }
  }
  scheduleGnssRecovery();
  return true;
}

function ensureStyle(){
  if(!root.document||root.document.getElementById('qa-permission-style'))return;
  var s=root.document.createElement('style');s.id='qa-permission-style';
  s.textContent='.qa-permission-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,12,.88);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl}.qa-permission-card{width:min(430px,100%);background:linear-gradient(180deg,#0d1828,#07111d);border:1px solid rgba(200,164,74,.34);border-radius:24px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.55);color:#f4f7fb;font-family:inherit}.qa-permission-card h2{font-size:1.2rem;margin:0 0 8px;color:#e8c878}.qa-permission-card>p{font-size:.78rem;line-height:1.85;color:#afc0d6;margin:0 0 16px}.qa-permission-item{display:flex;gap:12px;align-items:flex-start;padding:12px;margin:8px 0;border-radius:15px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}.qa-permission-item .ico{font-size:1.4rem}.qa-permission-item b{display:block;font-size:.84rem;margin-bottom:3px}.qa-permission-item small{display:block;color:#8197b2;line-height:1.65;font-size:.68rem}.qa-permission-state{margin-inline-start:auto;font-size:.62rem;padding:4px 8px;border-radius:999px;white-space:nowrap}.qa-permission-state.ok{color:#86e8ae;background:rgba(58,180,105,.14)}.qa-permission-state.bad{color:#ff9b9b;background:rgba(210,70,70,.14)}.qa-permission-state.wait{color:#a9bfd9;background:rgba(120,150,190,.12)}.qa-permission-actions{display:flex;gap:9px;margin-top:17px}.qa-permission-actions button{flex:1;border:0;border-radius:13px;padding:12px 10px;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer}.qa-permission-primary{background:#d3aa43;color:#09111d}.qa-permission-secondary{background:rgba(255,255,255,.07);color:#d9e3ef;border:1px solid rgba(255,255,255,.12)!important}.qa-permission-note{display:block;margin-top:12px;font-size:.62rem;line-height:1.7;color:#7389a4}.qa-permission-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483001;background:#101b2a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 14px;font:600 .76rem/1.5 inherit;box-shadow:0 12px 35px rgba(0,0,0,.45);max-width:min(90vw,420px);text-align:center;direction:rtl}';
  (root.document.head||root.document.documentElement).appendChild(s);
}
function toast(text){
  ensureStyle();var old=root.document.getElementById('qa-permission-toast');if(old)old.remove();
  var n=root.document.createElement('div');n.id='qa-permission-toast';n.className='qa-permission-toast';n.textContent=text;root.document.body.appendChild(n);root.setTimeout(function(){if(n&&n.parentNode)n.remove();},4200);
}
async function queryLocationPermission(){
  try{
    if(!root.navigator.permissions||typeof root.navigator.permissions.query!=='function')return 'unknown';
    var status=await root.navigator.permissions.query({name:'geolocation'});
    return status&&status.state?status.state:'unknown';
  }catch(_){return 'unknown';}
}
async function requestLocation(){
  if(!root.navigator.geolocation)return 'unsupported';
  var existing=await queryLocationPermission();
  if(existing==='granted'||existing==='denied')return existing;
  return new Promise(function(resolve){
    var done=false;function finish(v){if(done)return;done=true;resolve(v);}
    try{
      root.navigator.geolocation.getCurrentPosition(
        function(){finish('granted');},
        function(err){
          /* PERMISSION_DENIED is the only geolocation error that means the user
             did not grant location. POSITION_UNAVAILABLE and TIMEOUT mean the
             permission request was allowed but a position fix was not available
             yet; they must not trap first-run onboarding in a permission loop. */
          if(err&&err.code===1){finish('denied');return;}
          finish('granted');
        },
        {enableHighAccuracy:true,timeout:12000,maximumAge:0}
      );
    }catch(_){finish('unavailable');}
  });
}
function currentWebNotificationState(){
  try{
    if(!('Notification' in root))return 'unsupported';
    if(root.Notification.permission==='granted'||root.Notification.permission==='denied')return root.Notification.permission;
  }catch(_){ }
  /* Notifications are contextual in the Android app. Do not compete with the
     location prompt during first-run onboarding. */
  return 'unsupported';
}
function requestWebNotifications(){
  try{
    if(!('Notification' in root))return Promise.resolve('unsupported');
    if(root.Notification.permission==='granted'||root.Notification.permission==='denied')return Promise.resolve(root.Notification.permission);
    var p=root.Notification.requestPermission();return p&&typeof p.then==='function'?p:Promise.resolve(root.Notification.permission||'default');
  }catch(_){return Promise.resolve('unavailable');}
}
function stateNode(name){return root.document.querySelector('[data-qa-permission-state="'+name+'"]');}
function setState(name,value){var n=stateNode(name);if(!n)return;n.textContent=permissionLabel(value);n.className='qa-permission-state '+permissionClass(value);}
function closeOverlay(markDone){var n=root.document.getElementById('qa-permission-overlay');if(n)n.remove();if(markDone)writeState({completed:true,completedAt:Date.now()});}

async function runPermissionRequest(){
  var btn=root.document.getElementById('qa-permission-allow');if(btn){btn.disabled=true;btn.textContent='جاري طلب صلاحية الموقع...';}
  /* Location is the only first-run permission request. Android notification
     permission remains contextual and is requested by the native reminder flow. */
  var notificationResult=currentWebNotificationState();setState('notifications',notificationResult);
  var locationResult=await requestLocation();setState('location',locationResult);
  var acceptedLocation=locationResult==='granted'||locationResult==='unsupported';
  if(acceptedLocation){
    writeState({completed:true,location:locationResult,notifications:notificationResult,twa:isTwaSurface(),completedAt:Date.now()});
    /* Permission success and GNSS fix are separate states. Once permission is
       settled, ask the existing trusted GNSS path for a fresh device position. */
    if(locationResult==='granted'&&typeof root.tryBrowserGPS==='function'){
      root.setTimeout(function(){try{root.tryBrowserGPS();}catch(_){ }},0);
      root.setTimeout(function(){recoverTrustedGnss(true);},250);
    }
    root.setTimeout(function(){closeOverlay(false);toast('تم اعتماد صلاحية الموقع. سيُحدَّث GPS/GNSS من الجهاز، والإشعارات تُطلب فقط عند تشغيل تنبيه يحتاجها.');},350);
    return;
  }
  if(btn){btn.disabled=false;btn.textContent='إعادة طلب صلاحية الموقع';}
  var note=root.document.getElementById('qa-permission-note');
  if(note)note.textContent=locationResult==='denied'?'صلاحية الموقع مرفوضة. فعّلها من إعدادات Android أو إعدادات الموقع ثم أعد المحاولة.':'تعذر بدء طلب الموقع. تحقق من إعدادات الموقع ثم أعد المحاولة.';
}
function mountOnboarding(force){
  if(!root.document||mounted&&!force)return;if(!force&&!isAppSurface())return;
  var saved=readState();if(!force&&saved&&saved.completed)return;
  mounted=true;ensureStyle();
  var old=root.document.getElementById('qa-permission-overlay');if(old)old.remove();
  var wrap=root.document.createElement('div');wrap.id='qa-permission-overlay';wrap.className='qa-permission-overlay';
  wrap.innerHTML='<div class="qa-permission-card" role="dialog" aria-modal="true" aria-labelledby="qa-permission-title"><h2 id="qa-permission-title">صلاحيات QiblaAstro</h2><p>نطلب فقط الصلاحيات اللازمة للميزات التي تستخدمها. لا تُستخدم هذه الصلاحيات للإعلانات.</p><div class="qa-permission-item"><span class="ico">📍</span><div><b>الموقع</b><small>لحساب القبلة ومواقيت الصلاة والبيانات الفلكية من موقع الجهاز.</small></div><span class="qa-permission-state wait" data-qa-permission-state="location">بانتظار الموافقة</span></div><div class="qa-permission-item"><span class="ico">🔔</span><div><b>الإشعارات</b><small>يُطلب إذن Android الأصلي عند تشغيل ميزة تنبيه تحتاجه، مثل تنبيه الأذكار.</small></div><span class="qa-permission-state wait" data-qa-permission-state="notifications">بانتظار الموافقة</span></div><div class="qa-permission-item"><span class="ico">📷</span><div><b>الكاميرا</b><small>لن نطلبها الآن. ستظهر نافذة الإذن فقط عندما تضغط «تحقق فلكي».</small></div><span class="qa-permission-state ok">عند الحاجة فقط</span></div><div class="qa-permission-actions"><button type="button" id="qa-permission-allow" class="qa-permission-primary">السماح والمتابعة</button><button type="button" id="qa-permission-later" class="qa-permission-secondary">لاحقًا</button></div><small id="qa-permission-note" class="qa-permission-note">يمكنك تغيير الصلاحيات لاحقًا من إعدادات Android أو إعدادات الموقع.</small></div>';
  root.document.body.appendChild(wrap);
  setState('notifications',currentWebNotificationState());
  root.document.getElementById('qa-permission-allow').addEventListener('click',runPermissionRequest);
  root.document.getElementById('qa-permission-later').addEventListener('click',function(){closeOverlay(false);});
}

function cameraPermissionErrorMessage(err){
  var name=err&&err.name?String(err.name):'';
  if(name==='NotAllowedError'||name==='SecurityError')return 'يلزم السماح بالكاميرا لإجراء التحقق الفلكي. فعّل إذن الكاميرا ثم أعد المحاولة.';
  if(name==='NotFoundError'||name==='OverconstrainedError')return 'تعذر العثور على كاميرا خلفية متاحة للتحقق الفلكي.';
  return 'تعذر تهيئة الكاميرا للتحقق الفلكي. تحقق من صلاحية الكاميرا ثم أعد المحاولة.';
}
async function ensureCameraPermission(){
  if(!root.navigator.mediaDevices||typeof root.navigator.mediaDevices.getUserMedia!=='function')throw new Error('CAMERA_API_UNAVAILABLE');
  var stream=await root.navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
  try{if(stream&&stream.getTracks)stream.getTracks().forEach(function(track){try{track.stop();}catch(_){ }});}catch(_){ }
  return true;
}
async function handleAstroClick(event){
  var target=event.target&&event.target.closest?event.target.closest('#qa-astro-reverify'):null;
  if(!target||astroGuardBusy)return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  astroGuardBusy=true;target.disabled=true;
  var label=root.document.getElementById('qa-verify-action-label'),old=label&&label.textContent;
  if(label)label.textContent='طلب إذن الكاميرا...';
  try{
    await ensureCameraPermission();
    var api=root.AstroVerification;
    if(!api||typeof api.startProductionVerification!=='function')throw new Error('ASTRO_VERIFICATION_UNAVAILABLE');
    var state=api.getFlowState?api.getFlowState():null;
    if(state&&state.state==='success'&&typeof api.resetFlow==='function')api.resetFlow();
    if(!(state&&(state.state==='loading'||state.state==='observing')))api.startProductionVerification();
  }catch(err){toast(cameraPermissionErrorMessage(err));}
  finally{astroGuardBusy=false;target.disabled=false;if(label&&old)label.textContent=old;}
}
function installAstroCameraGuard(){if(!root.document||root.document.__qaAstroCameraPermissionGuard)return;root.document.__qaAstroCameraPermissionGuard=true;root.document.addEventListener('click',handleAstroClick,true);}
function start(){
  installAstroCameraGuard();
  if(!isAppSurface())return;
  root.setTimeout(function(){recoverTrustedGnss(true);},100);
  root.setTimeout(function(){mountOnboarding(false);},1400);
  root.addEventListener('focus',function(){recoverTrustedGnss(true);});
  root.document.addEventListener('visibilitychange',function(){if(!root.document.hidden)recoverTrustedGnss(true);});
}

root.QiblaPermissions=Object.freeze({showOnboarding:function(){mountOnboarding(true);},ensureCameraForVerification:ensureCameraPermission,isAppSurface:isAppSurface,getState:readState,requestNotifications:requestWebNotifications});
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof globalThis!=='undefined'?globalThis:window);
