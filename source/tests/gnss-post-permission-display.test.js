'use strict';
const fs=require('fs'),assert=require('assert'),crypto=require('crypto'),vm=require('vm');
const index=fs.readFileSync('index.html','utf8');
const permissions=fs.readFileSync('js/presentation/permissions-onboarding.js','utf8');

function body(name){
  const start=index.indexOf('function '+name+'(');
  assert(start>=0,'missing function '+name);
  let brace=index.indexOf('{',start),depth=0;
  for(let i=brace;i<index.length;i++){
    if(index[i]==='{')depth++;
    else if(index[i]==='}'&&--depth===0)return index.slice(start,i+1);
  }
  throw new Error('unterminated function '+name);
}
function hash(text){return crypto.createHash('sha256').update(text).digest('hex');}

const accept=body('acceptTrustedGnssPosition');
const update=body('updateQiblaFromPosition');
const loop=body('loop');
const pending=body('publishHomeLocationPending');
const retry=body('tryBrowserGPS');

assert(permissions.includes('root.acceptTrustedGnssPosition(pos)'),'Permission success must commit the position it already received');
assert(!permissions.includes("getCurrentPosition(\n        function(){finish('granted');}"),'Permission success must not discard the received position');
for(const token of ['LAT=lat','LON=lon',"gnssSource='gps'",'gnssHasTrustedFix=true','invalidateLocationDependentCaches()','qiblaastro:gnss-update']){
  assert(accept.includes(token),'Trusted position commit missing '+token);
}

const sandbox={
  Number,Date,CustomEvent:function(){},
  LAT:NaN,LON:NaN,gnssAccuracy:null,gnssAltitudeMeters:0,
  gnssSource:'unresolved',gnssHasTrustedFix:false,gnssUpdating:true,
  invalidateLocationDependentCaches:function(){sandbox.invalidated=true;},
  updateQiblaFromPosition:function(){sandbox.updated=true;},
  window:{dispatchEvent:function(){sandbox.dispatched=true;}}
};
vm.runInNewContext(accept,sandbox);
assert.strictEqual(sandbox.acceptTrustedGnssPosition({coords:{latitude:30.0444,longitude:31.2357,accuracy:12,altitude:null}}),true,'Valid permission position must be accepted');
assert.strictEqual(sandbox.LAT,30.0444);
assert.strictEqual(sandbox.LON,31.2357);
assert.strictEqual(sandbox.gnssSource,'gps');
assert.strictEqual(sandbox.gnssHasTrustedFix,true);
assert.strictEqual(sandbox.gnssUpdating,false);
assert(sandbox.invalidated&&sandbox.updated&&sandbox.dispatched,'Accepted position must invalidate caches, recalculate, and publish');
assert.strictEqual(sandbox.acceptTrustedGnssPosition({coords:{latitude:95,longitude:31}}),false,'Out-of-range latitude must be rejected');

assert(retry.includes('if(gnssUpdating)return;'),'GNSS acquisition must reject concurrent requests');
assert(retry.indexOf('gnssUpdating=true')<retry.indexOf('navigator.geolocation.getCurrentPosition'),'Busy state must be set before requesting GNSS');
assert(retry.includes('hadTrustedFix&&hasTrustedGnssCoordinates()'),'A failed accuracy refinement must preserve an already accepted trusted fix');
assert(loop.includes('if(!hasTrustedGnssCoordinates())'),'Main loop must stop location calculations until coordinates are trusted and finite');
assert(!index.includes('if(typeof calcQibla!=="undefined"){QT=calcQibla(LAT,LON)'),'Old unconditional NaN-producing Qibla assignment must stay removed');
assert(loop.indexOf('if(!hasTrustedGnssCoordinates())')<loop.indexOf('var nextQT=calcQibla(LAT,LON)'),'Trusted finite gate must precede Qibla calculation');
assert(update.indexOf('QT=calcQibla(LAT,LON)')<update.indexOf('refreshMdeclFromTrustedGnss'),'True Qibla must publish independently before optional magnetic correction');
assert(pending.includes("var label='جاري تحديد الموقع'"),'Pending Home state must use the requested Arabic text');
assert(pending.includes("font-size','.78rem'"),'Pending Home state must render the requested text at a small size');
assert(!pending.includes('NaN'),'Pending Home state must never expose NaN text');
assert(!pending.includes('innerHTML')&&!pending.includes('className'),'Pending state must not restructure the Home screen');

// Protected scientific equations must remain byte-identical to the approved code-3 parent.
assert.strictEqual(hash(body('calcQibla')),'0ce545f40d8f010d78ff647fe7bcf49028de16a60ec6c5e6154979ee05857e11','Qibla equation changed');
assert.strictEqual(hash(body('sunPos')),'d324f0a338f92d474096c6dda56e2f20b9cf2f313398c90080781f51ed67d9fd','Sun equation changed');
assert.strictEqual(hash(body('moonPos')),'80612d089d65703f2efe95e72386fcd56d8ab58b8713918b9ed5cc0e6fb2c072','Moon equation changed');
assert.strictEqual(hash(body('calcPrayers')),'d5bde8ca791dbdfe4329a0f6b7b02ee0790924f45ce0159a3aa3c6bfcfc4b3d6','Prayer equation changed');

console.log('GNSS handoff, single-flight acquisition, finite calculation gate, pending Home display, and scientific isolation: PASS');
