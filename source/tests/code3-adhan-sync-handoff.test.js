'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const syncSource=fs.readFileSync('js/presentation/prayer/schedule-sync.js','utf8');
const uiSource=fs.readFileSync('js/presentation/prayer/adhan-ui.js','utf8');
const policySource=fs.readFileSync('js/presentation/prayer/online-adhan-policy.js','utf8');

// Static safety contract: this experiment changes only permission + delivery handoff.
assert(syncSource.includes("PENDING_SYNC_KEY='qiblaastro:prayer-native-sync-pending:v1'"));
assert(syncSource.includes("HANDOFF_EVENT='qiblaastro:adhan-settings-committed'"));
assert(syncSource.includes("emitStatus('launch-unconfirmed'"));
assert(syncSource.includes("if(root.document.hidden)observeHidden();else if(!confirmReturned())"));
assert(!syncSource.includes('if(launched){markSync(fp)'), 'URI assignment must never be recorded as completed native sync');
assert(!syncSource.includes("closest('#qa-adhan-card"), 'opening the Adhan card must not launch Android before a setting is committed');
assert(uiSource.includes("commitNativeSync('master-toggle',enabled())"), 'enabling Adhan must request permission and commit native sync');
assert(uiSource.includes("commitNativeSync('prayer-mode',m!=='off')"), 'full Adhan and notification modes must both request notification permission');
assert(uiSource.includes("status==='returned')announce('تم إرسال جدول الصلاة إلى Android')"), 'existing live status must report the Android handoff return without changing layout');
assert(syncSource.includes("q.set('m_'+id,nativeNoticeMode("), 'closed-app native schedule must receive notification-only modes');
assert(policySource.includes("function nativeMode(mode){return mode==='off'?'off':'notification';}"), 'online experiment must fail closed to native notifications');
for(const forbidden of ['calcQibla(','refreshMdeclFromTrustedGnss(','calcPrayers(','sunPos(','moonPos(','Math.atan2']){
  assert(!syncSource.includes(forbidden),`native handoff must not touch protected calculation token: ${forbidden}`);
  assert(!uiSource.includes(forbidden),`Adhan UI must not touch protected calculation token: ${forbidden}`);
}

class MemoryStorage{
  constructor(initial){this.values=Object.assign({},initial||{});}
  getItem(key){return Object.prototype.hasOwnProperty.call(this.values,key)?this.values[key]:null;}
  setItem(key,value){this.values[key]=String(value);}
  removeItem(key){delete this.values[key];}
}

const token='a'.repeat(40);
const sessionStorage=new MemoryStorage({'qiblaastro:native-token':token});
const localStorage=new MemoryStorage({'qiblaastro-adhan-ui-v5':'{}'});
const rootListeners=Object.create(null),documentListeners=Object.create(null),timeouts=new Map();
let timeoutId=0,navigated='';
const location={hash:'',pathname:'/',search:'?twa=1'};
Object.defineProperty(location,'href',{get(){return navigated;},set(value){navigated=String(value);}});
const document={
  readyState:'complete',hidden:false,head:{appendChild(){}},documentElement:{appendChild(){}},
  querySelector(){return null;},createElement(){return{setAttribute(){}};},getElementById(){return{textContent:'اختبار'};},
  addEventListener(name,handler){documentListeners[name]=handler;}
};
const context={
  console,URLSearchParams,Intl,Number,Array,Object,JSON,Math,Date,
  LAT:30.0444,LON:31.2357,gnssSource:'gps',QT:136.2,
  pCache:[
    {n:'الفجر',h:4.5},{n:'الظهر',h:12.1},{n:'العصر',h:15.5},{n:'المغرب',h:18.4},{n:'العشاء',h:19.8}
  ],
  location,document,sessionStorage,localStorage,
  history:{state:{page:'home'},replaceState(){}},
  navigator:{userActivation:{hasBeenActive:true}},
  QiblaPrayerLocation:{effective(){return{mode:'auto',lat:30.0444,lon:31.2357,label:'القاهرة',timeZone:'Africa/Cairo'};}},
  QiblaAdhanUI:{getState(){return{enabled:true,advance:0,profile:'makkah',prayers:{'الفجر':'adhan','الظهر':'adhan','العصر':'adhan','المغرب':'adhan','العشاء':'adhan'}};}},
  QiblaPrayerNativePlan:{build(){return{timeZone:'Africa/Cairo'};},serialize(){return'2026-08-21:270,726,930,1104,1188|2026-08-22:271,726,929,1103,1187';}},
  CustomEvent:function(name,options){this.type=name;this.detail=options&&options.detail;},
  addEventListener(name,handler){rootListeners[name]=handler;},dispatchEvent(){return true;},
  setInterval(){return 1;},setTimeout(handler){const id=++timeoutId;timeouts.set(id,handler);return id;},
  clearTimeout(id){timeouts.delete(id);}
};
context.top=context;context.parent=context;context.globalThis=context;
vm.runInNewContext(syncSource,context,{filename:'schedule-sync.js'});

assert.strictEqual(context.QiblaPrayerNativeSync.sync(),true,'explicit settings handoff must launch the code-3 Android bridge');
assert(navigated.startsWith('intent://prayer-sync?'),'explicit handoff must prefer the package-scoped Android intent');
assert(navigated.includes('package=com.qiblalabs'),'intent must remain restricted to the existing package');
assert(navigated.includes('m_fajr=notification')&&!navigated.includes('m_fajr=adhan'),'native handoff must never request background Adhan audio in this experiment');
assert(sessionStorage.getItem('qiblaastro:prayer-native-sync-pending:v1'),'handoff attempt must remain pending until Android takes focus');
assert.strictEqual(sessionStorage.getItem('qiblaastro:prayer-native-sync-last:v1'),null,'attempt must not be marked completed immediately');

document.hidden=true;
documentListeners.visibilitychange();
document.hidden=false;
documentListeners.visibilitychange();
assert.strictEqual(sessionStorage.getItem('qiblaastro:prayer-native-sync-pending:v1'),null,'pending state must clear after Android returns');
assert(sessionStorage.getItem('qiblaastro:prayer-native-sync-last:v1'),'completed fingerprint must be stored only after the focus round-trip');

console.log('Code 3 Adhan handoff: permission-aware settings commit -> package-scoped Android intent -> return-confirmed sync: PASS');
