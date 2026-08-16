/* QiblaAstro — Home Arabic sky-name presentation normalizer.
 * Presentation only: keeps exactly one lunar-station / seasonal-naw name per Home sky card.
 * Does not calculate astronomical positions, Qibla, GNSS, WMM, camera or verification data.
 * © 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved.
 */
(function(root){
'use strict';
var observer=null,timer=null;
function text(el){try{return el&&el.textContent?el.textContent.replace(/\s+/g,' ').trim():'';}catch(_){return '';}}
function normalizeCard(selector,id){
  try{
    var doc=root.document,card=doc&&doc.querySelector(selector),primary=doc&&doc.getElementById(id);
    if(!card||!primary)return false;
    var value=text(primary);if(!value||value==='—')return false;

    /* The current Falaki host owns the canonical value. Keep it readable. */
    primary.style.setProperty('font-size','.64rem','important');
    primary.style.setProperty('font-weight','800','important');
    primary.style.setProperty('line-height','1.3','important');
    primary.style.setProperty('padding','5px 6px','important');

    /* Remove only obsolete direct-child name boxes that repeat the exact same value.
       Other moon/sun metrics and rise/set rows are deliberately untouched. */
    Array.prototype.slice.call(card.children).forEach(function(node){
      if(node===primary)return;
      var t=text(node);
      if(!t||t.indexOf(value)===-1)return;
      var legacyLabel=t.indexOf('المنزلة')!==-1||t.indexOf('النوء')!==-1||t===value;
      if(legacyLabel)node.remove();
    });

    /* Defensive cleanup if a previous runtime appended more than one canonical box. */
    var canonical=card.querySelectorAll('[data-qa-arabic-sky-name="1"]');
    for(var i=0;i<canonical.length;i++)if(canonical[i]!==primary)canonical[i].remove();
    return true;
  }catch(_){return false;}
}
function run(){
  var a=normalizeCard('#qa-home .qa-moon-card','qaMoonArabicStation');
  var b=normalizeCard('#qa-home .qa-sun-card','qaSunArabicNaw');
  return a||b;
}
function start(){
  run();root.setTimeout(run,250);root.setTimeout(run,1200);
  if(timer)root.clearInterval(timer);timer=root.setInterval(run,2000);
  if(observer)observer.disconnect();
  var home=root.document&&root.document.getElementById('qa-home');
  if(home&&typeof MutationObserver!=='undefined'){
    observer=new MutationObserver(function(){root.setTimeout(run,0);});
    observer.observe(home,{childList:true,subtree:true,characterData:true});
  }
}
root.addEventListener('qiblaastro:presentation-page-mounted',function(e){if(e&&e.detail&&e.detail.name==='falaki')root.setTimeout(start,0);});
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof globalThis!=='undefined'?globalThis:window);
