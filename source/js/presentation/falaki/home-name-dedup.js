/* QiblaAstro — Home Arabic sky-name presentation stabilizer.
 * Presentation only: keeps one persistent labeled lunar-station / seasonal-naw box per Home sky card.
 * The hidden canonical value continues to be supplied by the Falaki host; no astronomical calculation is performed here.
 * © 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved.
 */
(function(root){
'use strict';
var observer=null,timer=null;
function text(el){try{return el&&el.textContent?el.textContent.replace(/\s+/g,' ').trim():'';}catch(_){return '';}}
function directChildren(card){return card?Array.prototype.slice.call(card.children):[];}
function findVisibleBox(card,canonical,label){
  var children=directChildren(card);
  for(var i=0;i<children.length;i++){
    var node=children[i];if(node===canonical)continue;
    var t=text(node);
    if(node.getAttribute&&node.getAttribute('data-qa-home-station-card')==='1')return node;
    if(t.indexOf(label)!==-1||t.indexOf('المنزلة')!==-1)return node;
  }
  return null;
}
function ensureStructure(box,label,value){
  if(!box)return false;
  box.setAttribute('data-qa-home-station-card','1');
  box.style.setProperty('width','calc(100% - 10px)','important');
  box.style.setProperty('margin','5px auto 0','important');
  box.style.setProperty('padding','4px 6px 5px','important');
  box.style.setProperty('border','1px solid rgba(121,188,229,.22)','important');
  box.style.setProperty('border-radius','9px','important');
  box.style.setProperty('background','rgba(6,24,41,.72)','important');
  box.style.setProperty('text-align','center','important');
  box.style.setProperty('white-space','nowrap','important');
  box.style.setProperty('overflow','hidden','important');
  box.style.setProperty('display','block','important');
  box.style.setProperty('visibility','visible','important');
  box.style.setProperty('opacity','1','important');
  var lab=box.querySelector('[data-qa-station-label]'),val=box.querySelector('[data-qa-station-value]');
  if(!lab||!val){
    box.textContent='';
    lab=root.document.createElement('small');lab.setAttribute('data-qa-station-label','1');
    val=root.document.createElement('strong');val.setAttribute('data-qa-station-value','1');
    box.appendChild(lab);box.appendChild(val);
  }
  lab.textContent=label;
  lab.style.cssText='display:block;font-size:.40rem;line-height:1.15;color:#9db2c8;font-weight:600;margin-bottom:2px;';
  val.textContent=value;
  val.style.cssText='display:block;font-size:.67rem;line-height:1.2;color:#f4f7fb;font-weight:800;overflow:hidden;text-overflow:ellipsis;';
  return true;
}
function stabilize(selector,canonicalId,label){
  try{
    var doc=root.document,card=doc&&doc.querySelector(selector),canonical=doc&&doc.getElementById(canonicalId);
    if(!card||!canonical)return false;
    var value=text(canonical);if(!value||value==='—')return false;

    /* Keep the Falaki host's canonical node alive so it is never recreated or flashed. */
    canonical.style.setProperty('display','none','important');
    canonical.style.setProperty('visibility','hidden','important');
    canonical.style.setProperty('position','absolute','important');
    canonical.style.setProperty('pointer-events','none','important');
    canonical.setAttribute('aria-hidden','true');

    var box=findVisibleBox(card,canonical,label);
    if(!box){box=doc.createElement('div');card.appendChild(box);}
    ensureStructure(box,label,value);

    /* If an earlier run left another visible labeled box, keep the first persistent box and hide the rest without removing nodes. */
    directChildren(card).forEach(function(node){
      if(node===canonical||node===box)return;
      var t=text(node);
      if((node.getAttribute&&node.getAttribute('data-qa-home-station-card')==='1')||t.indexOf(label)!==-1){
        node.style.setProperty('display','none','important');
        node.setAttribute('aria-hidden','true');
      }
    });
    return true;
  }catch(_){return false;}
}
function run(){
  var a=stabilize('#qa-home .qa-moon-card','qaMoonArabicStation','المنزلة القمرية');
  var b=stabilize('#qa-home .qa-sun-card','qaSunArabicNaw','المنزلة الشمسية');
  return a||b;
}
function schedule(){root.setTimeout(run,0);}
function start(){
  run();root.setTimeout(run,250);root.setTimeout(run,1200);
  if(timer)root.clearInterval(timer);timer=root.setInterval(run,2000);
  if(observer)observer.disconnect();
  var home=root.document&&root.document.getElementById('qa-home');
  if(home&&typeof MutationObserver!=='undefined'){
    observer=new MutationObserver(schedule);
    observer.observe(home,{childList:true,subtree:true,characterData:true});
  }
}
root.addEventListener('qiblaastro:presentation-page-mounted',function(e){if(e&&e.detail&&e.detail.name==='falaki')root.setTimeout(start,0);});
if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof globalThis!=='undefined'?globalThis:window);
