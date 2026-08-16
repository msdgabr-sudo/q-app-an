/* QiblaAstro — Arabic lunar stations + traditional naw' calendar (presentation only).
 * Lunar station boundaries are derived from Stellarium's Arabic Lunar Mansions sky-culture boundaries (J2000).
 * Moon coordinates use the same Meeus Ch.47 periodic model already used by the app, then are precessed to J2000.
 * Naw' dates follow the traditional 365-day seasonal calendar used in Arabian almanacs.
 * No Qibla, compass, GNSS, camera, WMM or verification calculation is performed here.
 * © 2026 محمد سيد جبر بحيرى — Mohamed SG Behairy. All Rights Reserved.
 */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.QiblaArabicStations=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var D2R=Math.PI/180,R2D=180/Math.PI,J2000=2451545.0;
  var LUNAR_NAMES=[
    'الشرطان','البطين','الثريا','الدبران','الهقعة','الهنعة','الذراع','النثرة',
    'الطرف','الجبهة','الزبرة','الصرفة','العواء','السماك','الغفر','الزبانا',
    'الإكليل','القلب','الشولة','النعائم','البلدة','سعد الذابح','سعد بلع','سعد السعود',
    'سعد الأخبية','الفرغ المقدم','الفرغ المؤخر','الرشاء'
  ];

  /* Each item is the eastern/right boundary of the corresponding lunar station.
     Coordinates are [right ascension hours, declination degrees], J2000. */
  var BOUNDARIES=[
    [[2.761017333,5.52063],[2.552874,15.03832],[2.275842,26.39457]],
    [[3.579898,8.96721],[3.412425333,18.66599],[3.22448,28.32728]],
    [[4.420137333,11.52114],[4.304482667,21.3822],[4.171958,31.22282]],
    [[5.277860667,13.03732],[5.223159333,23.00693],[5.159636,32.97164]],
    [[6.143595333,12.42327],[6.155692,23.42192],[6.168573333,33.42048]],
    [[7.002364667,11.6598],[7.085357333,22.59553],[7.173090667,32.52755]],
    [[7.862182667,10.77887],[7.996272667,20.59016],[8.148964,30.37499]],
    [[8.695476667,7.90924],[8.877778667,17.54795],[9.080715333,27.1449]],
    [[9.507275333,4.20358],[9.726452667,13.66285],[9.964072667,23.07518]],
    [[10.30049267,-0.15285],[10.54560667,9.1528],[10.88636933,21.18494]],
    [[11.08231733,-4.96178],[11.34345133,4.24097],[11.751604,17.99255]],
    [[11.86309067,-10.01852],[12.13107867,-0.85221],[12.53501,12.8909]],
    [[12.65517133,-15.11204],[12.92077467,-5.9092],[13.17761067,3.32105]],
    [[13.47173733,-20.02097],[13.72459333,-10.71179],[13.962216,-1.35952]],
    [[14.32515667,-24.50938],[14.552874,-15.03832],[14.76101733,-5.52063]],
    [[15.22448,-28.32728],[15.41242533,-18.66599],[15.579898,-8.96721]],
    [[16.171958,-31.22282],[16.30448267,-21.3822],[16.42013667,-11.52114]],
    [[17.15963533,-32.97164],[17.22315867,-23.00693],[17.27786067,-13.03732]],
    [[18.17614467,-38.41964],[18.155692,-23.42192],[18.14463867,-13.42315]],
    [[19.173090667,-32.52755],[19.085357333,-22.59553],[19.00954667,-12.65424]],
    [[20.148964,-30.37499],[19.996272667,-20.59016],[19.862182667,-10.77887]],
    [[21.080715333,-27.1449],[20.877778667,-17.54795],[20.695476667,-7.90924]],
    [[21.964072667,-23.07518],[21.726452667,-13.66285],[21.507275333,-4.20358]],
    [[22.803975333,-18.41941],[22.545606667,-9.1528],[22.300492667,0.15285]],
    [[23.610924,-13.42351],[23.343451333,-4.24097],[23.029647333,6.80092]],
    [[0.397784,-8.31827],[0.131078667,0.85221],[23.362405333,25.45362]],
    [[1.177610667,-3.32105],[0.920774667,5.9092],[0.137493333,30.54795]],
    [[1.962216,1.35952],[1.724593333,10.71179],[1.417968,21.87373]]
  ];

  /* Fixed seasonal starts used by the modern Arabian 13-day naw' calendar.
     The Jabhah interval is 14 days (6–19 September); the others are normally 13 days. */
  var NAW_STARTS=[
    [1,2,'الشولة'],[1,15,'النعائم'],[1,28,'البلدة'],[2,10,'سعد الذابح'],[2,23,'سعد بلع'],
    [3,8,'سعد السعود'],[3,21,'سعد الأخبية'],[4,3,'الفرغ المقدم'],[4,16,'الفرغ المؤخر'],[4,29,'الرشاء'],
    [5,12,'الشرطان'],[5,25,'البطين'],[6,7,'الثريا'],[6,20,'الدبران'],[7,3,'الهقعة'],[7,16,'الهنعة'],
    [7,29,'الذراع'],[8,11,'النثرة'],[8,24,'الطرفة'],[9,6,'الجبهة'],[9,20,'الزبرة'],[10,3,'الصرفة'],
    [10,16,'العواء'],[10,29,'السماك'],[11,11,'الغفر'],[11,24,'الزبانا'],[12,7,'الإكليل'],[12,20,'القلب']
  ];

  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function mod(n,m){return ((n%m)+m)%m;}
  function julianDate(date){return date.getTime()/86400000+2440587.5;}

  function boundaryRaHours(points,dec){
    var p=points.slice().sort(function(a,b){return a[1]-b[1];});
    var r=[p[0][0]];
    for(var i=1;i<p.length;i++){
      var raw=p[i][0],prev=r[i-1],c=[raw-24,raw,raw+24];
      c.sort(function(a,b){return Math.abs(a-prev)-Math.abs(b-prev);});
      r.push(c[0]);
    }
    var j=0;
    if(dec>=p[p.length-1][1])j=p.length-2;
    else if(dec>p[0][1]){
      for(var k=0;k<p.length-1;k++)if(dec>=p[k][1]&&dec<=p[k+1][1]){j=k;break;}
    }
    var d0=p[j][1],d1=p[j+1][1],ra0=r[j],ra1=r[j+1];
    return mod(ra0+(dec-d0)*(ra1-ra0)/(d1-d0),24);
  }

  function lunarStation(raDeg,decDeg){
    if(!finite(raDeg)||!finite(decDeg))return null;
    var ra=mod(raDeg/15,24),bounds=BOUNDARIES.map(function(p){return boundaryRaHours(p,decDeg);});
    for(var i=0;i<LUNAR_NAMES.length;i++){
      var start=bounds[mod(i-1,bounds.length)],end=bounds[i];
      var span=mod(end-start,24),pos=mod(ra-start,24);
      if(pos<span||Math.abs(pos-span)<1e-10)return Object.freeze({index:i+1,name:LUNAR_NAMES[i]});
    }
    return null;
  }

  /* Truncated Meeus Ch.47 lunar longitude/latitude model, matching the app's
     existing astronomical position model. Result is mean equatorial of date. */
  function moonEquatorialOfDate(date){
    var jd=julianDate(date),T=(jd-J2000)/36525,n=function(x){return mod(x,360);};
    var Lp=n(218.3164477+481267.88123421*T-.0015786*T*T);
    var DD=n(297.8501921+445267.1114034*T-.0018819*T*T);
    var M=n(357.5291092+35999.0502909*T-.0001536*T*T);
    var Mp=n(134.9633964+477198.8675055*T+.0087414*T*T);
    var F=n(93.2720950+483202.0175233*T-.0036539*T*T);
    var Dr=DD*D2R,Mr=M*D2R,Mpr=Mp*D2R,Fr=F*D2R;
    var sL=6.288774*Math.sin(Mpr)+1.274027*Math.sin(2*Dr-Mpr)+.658314*Math.sin(2*Dr)
      +.213618*Math.sin(2*Mpr)-.185116*Math.sin(Mr)-.114332*Math.sin(2*Fr)
      +.058793*Math.sin(2*Dr-2*Mpr)+.057066*Math.sin(2*Dr-Mr-Mpr)
      +.053322*Math.sin(2*Dr+Mpr)+.045758*Math.sin(2*Dr-Mr)
      -.040923*Math.sin(Mr-Mpr)-.034720*Math.sin(Dr)-.030383*Math.sin(Mr+Mpr);
    var sB=5.128122*Math.sin(Fr)+.280602*Math.sin(Mpr+Fr)+.277693*Math.sin(Mpr-Fr)
      +.173237*Math.sin(2*Dr-Fr)+.055413*Math.sin(2*Dr-Mpr+Fr)
      +.046272*Math.sin(2*Dr-Mpr-Fr)+.032573*Math.sin(2*Dr+Fr)+.017198*Math.sin(2*Mpr+Fr);
    var lam=(Lp+sL)*D2R,beta=sB*D2R,eps=(23.439291-.013004167*T)*D2R;
    var ra=Math.atan2(Math.sin(lam)*Math.cos(eps)-Math.tan(beta)*Math.sin(eps),Math.cos(lam))*R2D;
    var dec=Math.asin(Math.sin(beta)*Math.cos(eps)+Math.cos(beta)*Math.sin(eps)*Math.sin(lam))*R2D;
    return {jd:jd,raDeg:mod(ra,360),decDeg:dec};
  }

  /* Stellarium boundary data are J2000. Convert the Moon's equatorial-of-date
     coordinates back to J2000 before testing the station region. */
  function precessToJ2000(raDeg,decDeg,fromJd){
    var T=(fromJd-J2000)/36525,t=(J2000-fromJd)/36525;
    var zeta=((2306.2181+1.39656*T-.000139*T*T)*t+(.30188-.000344*T)*t*t+.017998*t*t*t)/3600*D2R;
    var z=((2306.2181+1.39656*T-.000139*T*T)*t+(1.09468+.000066*T)*t*t+.018203*t*t*t)/3600*D2R;
    var theta=((2004.3109-.85330*T-.000217*T*T)*t-(.42665+.000217*T)*t*t-.041833*t*t*t)/3600*D2R;
    var a=raDeg*D2R,d=decDeg*D2R;
    var A=Math.cos(d)*Math.sin(a+zeta);
    var B=Math.cos(theta)*Math.cos(d)*Math.cos(a+zeta)-Math.sin(theta)*Math.sin(d);
    var C=Math.sin(theta)*Math.cos(d)*Math.cos(a+zeta)+Math.cos(theta)*Math.sin(d);
    return {raDeg:mod((Math.atan2(A,B)+z)*R2D,360),decDeg:Math.asin(Math.max(-1,Math.min(1,C)))*R2D};
  }

  function currentLunarStation(date){
    var d=date instanceof Date?date:new Date(date||Date.now());
    if(Number.isNaN(d.getTime()))return null;
    var ofDate=moonEquatorialOfDate(d),j2000=precessToJ2000(ofDate.raDeg,ofDate.decDeg,ofDate.jd);
    return lunarStation(j2000.raDeg,j2000.decDeg);
  }

  function currentNaw(date){
    var d=date instanceof Date?date:new Date(date||Date.now());
    if(Number.isNaN(d.getTime()))return null;
    var key=(d.getMonth()+1)*100+d.getDate(),pick=NAW_STARTS[NAW_STARTS.length-1];
    for(var i=0;i<NAW_STARTS.length;i++){
      var candidate=NAW_STARTS[i],ck=candidate[0]*100+candidate[1];
      if(key>=ck)pick=candidate;else break;
    }
    return Object.freeze({name:pick[2],month:pick[0],day:pick[1]});
  }

  return Object.freeze({
    version:'1.1.0',
    lunarStation:lunarStation,
    currentLunarStation:currentLunarStation,
    currentNaw:currentNaw,
    lunarNames:Object.freeze(LUNAR_NAMES.slice())
  });
});
