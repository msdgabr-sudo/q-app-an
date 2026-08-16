/* QiblaAstro — Home Arabic sky-name stable presentation.
 * Presentation only: converts the Falaki host's canonical name node into the final labeled card once.
 * No polling, MutationObserver, element recreation, astronomical calculation or sensor logic.
 * © 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved.
 */
(function(root){
'use strict';
var STYLE_ID='qa-home-station-static-style';
function injectStyle(){
  if(!root.document||root.document.getElementById(STYLE_ID))return;
  var s=root.document.createElement('style');s.id=STYLE_ID;
  s.textContent='\n#qaMoonArabicStation,#qaSunArabicNaw{width:calc(100% - 10px)!important;margin:5px auto 0!important;padding:4px 6px 5px!important;border:1px solid rgba(121,188,229,.22)!important;border-radius:9px!important;background:rgba(6,24,41,.72)!important;display:block!important;visibility:visible!important;opacity:1!important;position:static!important;pointer-events:auto!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:.67rem!important;line-height:1.2!important;color:#f4f7fb!important;font-weight:800!important;}\n#qaMoonArabicStation::before,#qaSunArabicNaw::before{display:block;font-size:.40rem;line-height:1.15;color:#9db2c8;font-weight:600;margin-bottom:2px;}\n#qaMoonArabicStation::before{content:"المنزلة القمرية";}\n#qaSunArabicNaw::before{content:"المنزلة الشمسية";}\n';
  (root.document.head||root.document.documentElement).appendChild(s);
}
function cleanupLegacy(card,canonical){
  if(!card)return;
  Array.prototype.slice.call(card.children).forEach(function(node){
    if(node===canonical)return;
    if(node.getAttribute&&node.getAttribute('data-qa-home-station-card')==='1')node.remove();
  });
}
function prepare(selector,id){
  try{
    var doc=root.document,card=doc&&doc.querySelector(selector),el=doc&&doc.getElementById(id);
    if(!card||!el)return false;
    injectStyle();
    cleanupLegacy(card,el);
    el.removeAttribute('aria-hidden');
    el.setAttribute('data-qa-arabic-sky-name','1');
    el.setAttribute('data-qa-home-station-static','1');
    return true;
  }catch(_){return false;}
}
function apply(){
  var moon=prepare('#qa-home .qa-moon-card','qaMoonArabicStation');
  var sun=prepare('#qa-home .qa-sun-card','qaSunArabicNaw');
  return moon||sun;
}
root.addEventListener('qiblaastro:presentation-page-mounted',function(e){
  if(e&&e.detail&&e.detail.name==='falaki')root.setTimeout(apply,0);
});
if(root.document){
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
}
})(typeof globalThis!=='undefined'?globalThis:window);
