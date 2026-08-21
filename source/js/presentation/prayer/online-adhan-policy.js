/* QiblaAstro Code 3 experiment — online Adhan while visible, native notice while closed.
 * Transport policy only. It does not calculate or alter prayer times.
 */
(function(root){
'use strict';
var ORIGIN='https://app.qiblalabs.com';
var PATHS={
  makkah:{normal:'/audio/adhan/mecca.mp3',fajr:'/audio/adhan/fajr-alafasy.mp3'},
  calm:{normal:'/audio/adhan/ahmed-al-nufais.mp3',fajr:'/audio/adhan/fajr-alafasy.mp3'},
  deep:{normal:'/audio/adhan/islam-sobhi.mp3',fajr:'/audio/adhan/fajr-alafasy.mp3'}
};
function profile(name){var key=Object.prototype.hasOwnProperty.call(PATHS,name)?name:'makkah',p=PATHS[key];return{normal:ORIGIN+p.normal,fajr:ORIGIN+p.fajr};}
function nativeMode(mode){return mode==='off'?'off':'notification';}
function canPlay(documentRef){try{return!!documentRef&&documentRef.hidden!==true&&documentRef.visibilityState!=='hidden';}catch(_){return false;}}
root.QiblaOnlineAdhanPolicy=Object.freeze({origin:ORIGIN,profile:profile,nativeMode:nativeMode,canPlay:canPlay});
})(typeof globalThis!=='undefined'?globalThis:window);
