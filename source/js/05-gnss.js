// ══════════════════════════════════════════════════════════════════════════════
// [JS-5] GNSS — Multi-constellation position system
// ══════════════════════════════════════════════════════════════════════════════

// Trusted position policy:
// Device Geolocation only (GPS/GLONASS/Galileo/BeiDou as provided by Android/browser).
// IP geolocation and the former Giza fallback are intentionally NOT used for
// Qibla, astronomical verification, prayer calculations, or deviation distance.
// Until a trusted fix is available, coordinates are deliberately non-finite.
// Location-dependent calculations start only after updateQiblaFromPosition()
// accepts a trusted Device GPS/GNSS fix; no city is used as a startup surrogate.
let LAT = Number.NaN;
let LON = Number.NaN;
let gnssSource   = 'unresolved'; // 'gps'|'unresolved'
let gnssAccuracy = null;         // meters
let gnssAltitudeMeters = 0;
let gnssUpdating = false;
let gnssHasTrustedFix = false;
let _gnssRetryCount = 0;
let _gnssRetryTimer = null;
const _GNSS_RETRY_DELAYS = [1200, 3000, 6000];

function _clearGnssRetry(){
  if(_gnssRetryTimer!=null){try{clearTimeout(_gnssRetryTimer);}catch(e){} _gnssRetryTimer=null;}
}
function _publishGnssReady(){
  try{window.dispatchEvent(new CustomEvent('qiblaastro:gnss-update',{detail:{source:'gps',trusted:true,accuracy:gnssAccuracy}}));}catch(e){}
}
function _scheduleGnssRetry(){
  if(gnssHasTrustedFix||_gnssRetryCount>=_GNSS_RETRY_DELAYS.length)return;
  if(document&&document.hidden)return;
  _clearGnssRetry();
  var delay=_GNSS_RETRY_DELAYS[_gnssRetryCount++];
  _gnssRetryTimer=setTimeout(function(){_gnssRetryTimer=null;if(!gnssHasTrustedFix&&!gnssUpdating)tryBrowserGPS();},delay);
}

function showGnssUnavailable(message){
  gnssUpdating=false;
  gnssSource='unresolved';
  gnssAccuracy=null;
  gnssHasTrustedFix=false;
  MDECL_READY=false;
  MDECL_STATUS='unavailable';
  MDECL_FIELD=null;
  MDECL=0;
  QM=QT;
  var txt=message||'تعذر تحديد موقعك — فعّل الموقع وامنح الإذن ثم أعد المحاولة';
  set('compass-status-msg',txt);
  set('gnss-badge','الموقع غير محدد');
  set('gnss-btn-status','⚠ أعد المحاولة');
  set('hm-gps-src','الموقع غير محدد');
  set('mag-d','---');
  set('q-mag','---');
  set('cfg-qm','---');
  set('cfg-md','---');
  set('mag-decl-inline','---');
  var el;
  el=document.getElementById('gnss-src');if(el)el.textContent='لم يتم الحصول على GPS/GNSS موثوق';
  el=document.getElementById('gnss-acc');if(el)el.textContent='---';
}

function updateQiblaFromPosition(){
  // Never publish a Qibla/location update unless coordinates came from the device.
  if(!gnssHasTrustedFix||gnssSource!=='gps'||!Number.isFinite(LAT)||!Number.isFinite(LON)){
    showGnssUnavailable();
    return;
  }
  if(!refreshMdeclFromTrustedGnss(new Date())){
    set('mag-d',MDECL_STATUS==='blackout'?'⚠ مجال مغناطيسي ضعيف':'---');
    return;
  }
  QT=calcQibla(LAT,LON); QM=((QT-MDECL)+360)%360;
  var dirs=['شمال','شمال شرق','شرق','جنوب شرق','جنوب','جنوب غرب','غرب','شمال غرب'];
  var qDir=dirs[Math.round(((QT%360)+360)/45)%8];
  var acc=gnssAccuracy?Math.round(gnssAccuracy):0;
  var srcTxt='✓ GPS/GNSS الجهاز';
  var srcBadge='GPS '+acc+'م±'+(MDECL_STATUS==='caution'?' · WMM تنبيه مجال ضعيف':'');
  set('box-qibla',QT.toFixed(1)+'°');
  set('q-deg',QT.toFixed(2)+'°');
  set('q-dir',qDir);
  set('gnss-badge',srcBadge);
  set('gnss-btn-status','✓ GPS '+acc+'م');
  set('compass-status-msg',srcBadge+' · '+QT.toFixed(1)+'° '+qDir);
  set('mag-d',(MDECL>=0?'+':'')+MDECL.toFixed(2)+'°');
  set('hm-qibla-deg',QT.toFixed(1)+'°');
  set('hm-gps-src',srcBadge);
  var _el;
  _el=document.getElementById('gnss-lat');if(_el)_el.textContent=LAT.toFixed(6)+'° N';
  _el=document.getElementById('gnss-lon');if(_el)_el.textContent=LON.toFixed(6)+'° E';
  _el=document.getElementById('gnss-src');if(_el)_el.textContent=srcTxt;
  _el=document.getElementById('gnss-acc');if(_el)_el.textContent=acc?'~'+acc+'م':'---';
  _el=document.getElementById('gnss-qibla');if(_el)_el.textContent=QT.toFixed(2)+'° — '+qDir;
  _publishGnssReady();
}

// Browser Geolocation uses the device location provider. On Android this may
// combine GPS, GLONASS, Galileo, BeiDou and other trusted device signals.
function resetCompassCalibration(){
  _rawHeading=null;
  compassAvailable=false;
  calOffset=0;
  var msg=document.getElementById('compass-status-msg');
  if(msg) msg.textContent='✅ تمت إعادة المعايرة — حرّك الهاتف';
  var cod=document.getElementById('cal-offset-display');
  if(cod) cod.textContent='0°';
  try{navigator.vibrate([40,30,40]);}catch(e){}
}

function showManualCal(){
  var el=document.getElementById('manual-cal-section');
  if(el){el.style.display='block';el.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function hideManualCal(){
  var el=document.getElementById('manual-cal-section');
  if(el) el.style.display='none';
}

function tryBrowserGPS(){
  if(gnssUpdating)return;
  gnssUpdating=true;
  _clearGnssRetry();
  set('compass-status-msg','⏳ جاري تحديث موقعك من GNSS...');
  set('gnss-btn-status','⏳ جاري التحديث...');
  set('hm-gps-src','جاري تحديد الموقع...');
  var srcEl=document.getElementById('gnss-src');if(srcEl)srcEl.textContent='جاري طلب موقع جديد من الجهاز...';

  if(window._gnssWatchId != null){
    try{navigator.geolocation.clearWatch(window._gnssWatchId);}catch(e){}
    window._gnssWatchId = null;
  }

  try{
    if(!navigator||!('geolocation' in navigator)){
      showGnssUnavailable('خدمة الموقع غير متاحة على هذا الجهاز');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos){
        try{
          if(!pos||!pos.coords||!Number.isFinite(pos.coords.latitude)||!Number.isFinite(pos.coords.longitude)){
            showGnssUnavailable();
            _scheduleGnssRetry();
            return;
          }
          LAT=pos.coords.latitude;
          LON=pos.coords.longitude;
          gnssAccuracy=pos.coords.accuracy;
          gnssAltitudeMeters=Number.isFinite(pos.coords.altitude)?pos.coords.altitude:0;
          gnssSource='gps';
          gnssHasTrustedFix=true;
          gnssUpdating=false;
          _gnssRetryCount=0;
          _clearGnssRetry();
          updateQiblaFromPosition();
          try{
            window._gnssWatchId = navigator.geolocation.watchPosition(
              function(p2){
                try{
                  if(p2&&p2.coords&&Number.isFinite(p2.coords.latitude)&&Number.isFinite(p2.coords.longitude)&&p2.coords.accuracy<(gnssAccuracy||9999)){
                    LAT=p2.coords.latitude;
                    LON=p2.coords.longitude;
                    gnssAccuracy=p2.coords.accuracy;
                    gnssAltitudeMeters=Number.isFinite(p2.coords.altitude)?p2.coords.altitude:0;
                    gnssSource='gps';
                    gnssHasTrustedFix=true;
                    updateQiblaFromPosition();
                  }
                }catch(e){}
              },
              function(){},
              {enableHighAccuracy:true,timeout:30000,maximumAge:0}
            );
          }catch(e){}
        }catch(e){ showGnssUnavailable(); _scheduleGnssRetry(); }
      },
      function(err){
        var msg='تعذر تحديد موقعك — فعّل الموقع وامنح الإذن ثم أعد المحاولة';
        if(err&&err.code===1){msg='تم رفض إذن الموقع — امنح إذن الموقع ثم أعد المحاولة';showGnssUnavailable(msg);return;}
        if(err&&err.code===3)msg='لم يصل تثبيت GPS بعد — جارٍ إعادة المحاولة تلقائيًا';
        else if(err&&err.code===2)msg='إشارة الموقع غير متاحة مؤقتًا — جارٍ إعادة المحاولة تلقائيًا';
        showGnssUnavailable(msg);
        _scheduleGnssRetry();
      },
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  }catch(e){ showGnssUnavailable(); _scheduleGnssRetry(); }
}

function _startTrustedGnssIfAllowed(){
  if(gnssHasTrustedFix||gnssUpdating)return;
  function start(){if(!gnssHasTrustedFix&&!gnssUpdating)tryBrowserGPS();}
  try{
    if(navigator.permissions&&typeof navigator.permissions.query==='function'){
      navigator.permissions.query({name:'geolocation'}).then(function(status){
        if(!status)return;
        if(status.state==='granted')start();
        if(typeof status.addEventListener==='function')status.addEventListener('change',function(){if(status.state==='granted')start();});
      }).catch(function(){
        try{var s=JSON.parse(localStorage.getItem('qiblaastro:permissions-onboarding:v2')||'null');if(s&&s.completed&&s.location==='granted')start();}catch(_){}
      });
      return;
    }
  }catch(_){ }
  try{var saved=JSON.parse(localStorage.getItem('qiblaastro:permissions-onboarding:v2')||'null');if(saved&&saved.completed&&saved.location==='granted')start();}catch(_){ }
}

// Compatibility alias only. It deliberately does NOT perform IP geolocation.
function tryIPGeo(){
  showGnssUnavailable('يلزم موقع GPS/GNSS من الجهاز — لا يتم استخدام موقع IP التقريبي');
}

window.tryBrowserGPS = tryBrowserGPS;
window.tryIPGeo      = tryIPGeo;

// Restore the existing trusted GNSS cycle on every app start once permission is
// already granted. First-run prompting remains owned by permissions-onboarding.js.
(function installGnssLifecycle(){
  function onReady(){_startTrustedGnssIfAllowed();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady,{once:true});else onReady();
  window.addEventListener('focus',_startTrustedGnssIfAllowed);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)_startTrustedGnssIfAllowed();});
})();
