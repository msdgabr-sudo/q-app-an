/* QiblaAstro — Prayer schedule location + authenticated Android sync.
 * Code 3 experiment: a navigation assignment is only an attempt. The handoff is
 * accepted after Android takes focus and returns to the TWA.
 */
(function(root){
'use strict';
var lastKey='',timer=0,fallbackTimer=0,expiryTimer=0;
var TOKEN_KEY='qiblaastro:native-token';
var AUTO_KEY='qiblaastro:prayer-native-sync-enabled:v1';
var LAST_SYNC_KEY='qiblaastro:prayer-native-sync-last:v1';
var PENDING_SYNC_KEY='qiblaastro:prayer-native-sync-pending:v1';
var HANDOFF_EVENT='qiblaastro:adhan-settings-committed';
var HANDOFF_WINDOW_MS=20000,FALLBACK_DELAY_MS=1200,ATTEMPT_EXPIRY_MS=6000;

function readStorage(store,key){try{return store&&store.getItem?store.getItem(key)||'':'';}catch(_){return '';}}
function writeStorage(store,key,value){try{if(store&&store.setItem)store.setItem(key,value);}catch(_){}}
function removeStorage(store,key){try{if(store&&store.removeItem)store.removeItem(key);}catch(_){}}
function tokenFromHash(value){try{return new URLSearchParams(String(value||'').replace(/^#/,'')).get('nativeToken')||'';}catch(_){return '';}}
function relatedHash(which){try{var target=root[which];return target&&target!==root&&target.location?target.location.hash||'':'';}catch(_){return '';}}
function relatedToken(which){try{var target=root[which];return target&&target!==root?readStorage(target.sessionStorage,TOKEN_KEY):'';}catch(_){return '';}}
function captureToken(){
  try{
    var hash=String(root.location.hash||''),token=tokenFromHash(hash)||tokenFromHash(relatedHash('parent'))||tokenFromHash(relatedHash('top'))||readStorage(root.sessionStorage,TOKEN_KEY)||relatedToken('parent')||relatedToken('top');
    if(token&&token.length>=32){
      writeStorage(root.sessionStorage,TOKEN_KEY,token);
      try{if(root.parent&&root.parent!==root)writeStorage(root.parent.sessionStorage,TOKEN_KEY,token);}catch(_){}
      try{if(root.top&&root.top!==root)writeStorage(root.top.sessionStorage,TOKEN_KEY,token);}catch(_){}
      if(tokenFromHash(hash)){
        var hp=new URLSearchParams(hash.replace(/^#/,''));hp.delete('nativeToken');
        var cleanHash=hp.toString(),state=root.history?root.history.state:null;
        root.history.replaceState(state,'',root.location.pathname+root.location.search+(cleanHash?'#'+cleanHash:''));
      }
      return token;
    }
  }catch(_){}
  return '';
}
function ensurePlanModule(){try{if(root.QiblaPrayerNativePlan)return true;if(!root.document)return false;if(root.document.querySelector('script[data-qibla-prayer-native-plan]'))return false;var s=root.document.createElement('script');s.src='js/presentation/prayer/native-plan.js?v=20260816-plan1';s.async=false;s.setAttribute('data-qibla-prayer-native-plan','true');(root.document.head||root.document.documentElement).appendChild(s);}catch(_){}return false;}
function currentKey(){try{if(!Number.isFinite(Number(LAT))||!Number.isFinite(Number(LON)))return '';var src=typeof gnssSource!=='undefined'?String(gnssSource):'unknown';return Number(LAT).toFixed(3)+','+Number(LON).toFixed(3)+'|'+src;}catch(_){return '';}}
function invalidateIfNeeded(){var key=currentKey();if(!key)return;if(!lastKey){lastKey=key;maybeAutoSync('location-ready');return;}if(key===lastKey)return;lastKey=key;try{if(typeof pKey!=='undefined')pKey='';}catch(_){}try{if(root.QiblaPrayerScreen&&typeof root.QiblaPrayerScreen.render==='function')root.QiblaPrayerScreen.render();}catch(_){}try{root.dispatchEvent(new CustomEvent('qiblaastro:prayer-location-changed',{detail:{key:key}}));}catch(_){}root.setTimeout(function(){maybeAutoSync('location-changed');},250);}
function minuteFor(name){try{var p=(typeof pCache!=='undefined'&&Array.isArray(pCache))?pCache.find(function(x){return x&&x.n===name;}):null;if(!p||!Number.isFinite(Number(p.h)))return-1;return((Math.round(Number(p.h)*60)%1440)+1440)%1440;}catch(_){return-1;}}
function hasExplicitPrayerPrefs(){try{return['qiblaastro-adhan-ui-v5','qiblaastro-adhan-ui-v4','qiblaastro-adhan-ui-v3','qiblaastro-adhan-ui-v2','qiblaastro-adhan-ui-v1'].some(function(k){return!!root.localStorage.getItem(k);});}catch(_){return false;}}
function autoEnabled(){try{return root.localStorage.getItem(AUTO_KEY)==='1';}catch(_){return false;}}
function setAutoEnabled(){writeStorage(root.localStorage,AUTO_KEY,'1');}
function nativePayload(){var token=captureToken();if(!token)return null;ensurePlanModule();var loc=root.QiblaPrayerLocation&&root.QiblaPrayerLocation.effective?root.QiblaPrayerLocation.effective():null,st=root.QiblaAdhanUI&&root.QiblaAdhanUI.getState?root.QiblaAdhanUI.getState():null;if(!loc||!st||!root.QiblaPrayerNativePlan)return null;var map={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'},times={};for(var id in map){var minute=minuteFor(map[id]);if(minute<0)return null;times[id]=minute;}var plan=root.QiblaPrayerNativePlan.build(14),planText=root.QiblaPrayerNativePlan.serialize(plan);if(!plan||!planText)return null;return{token:token,loc:loc,st:st,times:times,map:map,plan:plan,planText:planText};}
function fingerprint(payload){try{var loc=payload.loc,st=payload.st,t=payload.times;return[payload.planText,currentKey(),loc.timeZone||'',st.enabled?'1':'0',String(st.advance||0),st.profile||'makkah',t.fajr,t.dhuhr,t.asr,t.maghrib,t.isha,payload.map.fajr+':'+((st.prayers&&st.prayers[payload.map.fajr])||'off'),payload.map.dhuhr+':'+((st.prayers&&st.prayers[payload.map.dhuhr])||'off'),payload.map.asr+':'+((st.prayers&&st.prayers[payload.map.asr])||'off'),payload.map.maghrib+':'+((st.prayers&&st.prayers[payload.map.maghrib])||'off'),payload.map.isha+':'+((st.prayers&&st.prayers[payload.map.isha])||'off')].join('|');}catch(_){return '';}}
function lastSync(){return readStorage(root.sessionStorage,LAST_SYNC_KEY);}
function markSync(key){writeStorage(root.sessionStorage,LAST_SYNC_KEY,key);}
function readPending(){try{var raw=readStorage(root.sessionStorage,PENDING_SYNC_KEY),value=raw?JSON.parse(raw):null;return value&&value.fp?value:null;}catch(_){return null;}}
function writePending(value){writeStorage(root.sessionStorage,PENDING_SYNC_KEY,JSON.stringify(value));}
function clearPending(){removeStorage(root.sessionStorage,PENDING_SYNC_KEY);if(fallbackTimer){root.clearTimeout(fallbackTimer);fallbackTimer=0;}if(expiryTimer){root.clearTimeout(expiryTimer);expiryTimer=0;}}
function emitStatus(status,detail){try{root.dispatchEvent(new CustomEvent('qiblaastro:prayer-native-sync-status',{detail:Object.assign({status:status},detail||{})}));}catch(_){} }
function directUri(q){return'qiblaastro://prayer-sync?'+q.toString();}
function fallbackIntent(q){return'intent://prayer-sync?'+q.toString()+'#Intent;scheme=qiblaastro;package=com.qiblalabs;category=android.intent.category.BROWSABLE;end';}
function navigate(uri){try{(root.top||root).location.href=uri;return true;}catch(_){try{root.location.href=uri;return true;}catch(__){return false;}}}
function observeHidden(){var pending=readPending();if(!pending)return;pending.hidden=true;pending.hiddenAt=Date.now();writePending(pending);emitStatus('android-opened',{reason:pending.reason});}
function confirmReturned(){var pending=readPending();if(!pending||!pending.hidden)return false;if(Date.now()-Number(pending.at||0)>HANDOFF_WINDOW_MS){clearPending();emitStatus('expired',{reason:pending.reason});return false;}markSync(pending.fp);clearPending();emitStatus('returned',{reason:pending.reason,fingerprint:pending.fp});return true;}
function launchBridge(q,reason,fp){
  var explicit=reason==='explicit'||reason==='settings-committed';
  if(!explicit){
    var activation=root.navigator&&root.navigator.userActivation;
    if(activation&&!activation.hasBeenActive){emitStatus('waiting-user-action',{reason:reason});return false;}
  }
  clearPending();writePending({fp:fp,reason:reason,at:Date.now(),hidden:false});
  var primary=explicit?fallbackIntent(q):directUri(q),secondary=explicit?directUri(q):fallbackIntent(q);
  var launched=navigate(primary);
  if(!launched){clearPending();emitStatus('launch-failed',{reason:reason});return false;}
  emitStatus('launch-attempted',{reason:reason});
  fallbackTimer=root.setTimeout(function(){var pending=readPending();if(pending&&!pending.hidden)navigate(secondary);},FALLBACK_DELAY_MS);
  expiryTimer=root.setTimeout(function(){var pending=readPending();if(pending&&!pending.hidden){clearPending();emitStatus('launch-unconfirmed',{reason:reason});}},ATTEMPT_EXPIRY_MS);
  return true;
}
function nativeSync(reason){var payload=nativePayload();if(!payload)return false;var fp=fingerprint(payload);if(!fp)return false;if(reason!=='explicit'&&reason!=='settings-committed'&&lastSync()===fp)return true;var token=payload.token,loc=payload.loc,st=payload.st,q=new URLSearchParams();q.set('token',token);q.set('notify',st.enabled?'1':'0');q.set('city',loc.label||'');q.set('tz',payload.plan.timeZone||loc.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||'');q.set('plan',payload.planText);var h=root.document&&root.document.getElementById('pr-h');q.set('hijri',h&&h.textContent?h.textContent:'');try{if(Number.isFinite(Number(QT)))q.set('qibla',Number(QT).toFixed(1));}catch(_){}q.set('advance',String(st.advance||0));q.set('profile',st.profile||'makkah');Object.keys(payload.map).forEach(function(id){q.set('t_'+id,String(payload.times[id]));q.set('m_'+id,(st.prayers&&st.prayers[payload.map[id]])||'off');});var launched=launchBridge(q,reason,fp);if(launched&&(reason==='explicit'||reason==='settings-committed'))setAutoEnabled();return launched;}
function maybeAutoSync(reason){if(!captureToken())return false;if(!autoEnabled()&&!hasExplicitPrayerPrefs())return false;return nativeSync(reason||'auto');}
function explicitSync(reason){return nativeSync(reason||'explicit');}
function retryCommittedSync(attempt){if(explicitSync('settings-committed'))return;attempt=Number(attempt)||0;if(attempt<5)root.setTimeout(function(){retryCommittedSync(attempt+1);},300);else emitStatus('payload-not-ready',{reason:'settings-committed'});}
function start(){if(timer)return;captureToken();ensurePlanModule();lastKey=currentKey();timer=root.setInterval(function(){invalidateIfNeeded();if(!root.document||!root.document.hidden)maybeAutoSync('poll');},1500);root.addEventListener('focus',function(){if(!confirmReturned()){invalidateIfNeeded();maybeAutoSync('focus');}});root.addEventListener('pagehide',observeHidden);root.addEventListener('pageshow',confirmReturned);root.document&&root.document.addEventListener('visibilitychange',function(){if(root.document.hidden)observeHidden();else if(!confirmReturned()){invalidateIfNeeded();maybeAutoSync('visible');}});root.addEventListener('qiblaastro:prayer-location-changed',function(){root.setTimeout(function(){maybeAutoSync('location-event');},250);});root.addEventListener('qiblaastro:prayer-runtime-sync',function(e){if(e&&e.detail&&e.detail.ok)root.setTimeout(function(){maybeAutoSync('runtime-ready');},100);});root.addEventListener(HANDOFF_EVENT,function(){retryCommittedSync(0);});root.setTimeout(function(){maybeAutoSync('startup');},800);}
root.QiblaPrayerNativeSync=Object.freeze({sync:explicitSync,refresh:maybeAutoSync,captureToken:captureToken,status:function(){return{last:lastSync(),pending:readPending()};}});
root.QiblaPrayerScheduleSync=Object.freeze({start:start,check:invalidateIfNeeded});
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof globalThis!=='undefined'?globalThis:window);
