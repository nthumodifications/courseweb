// Frame-addressable instructional animation based on the current mobile UI.
const W=1080,H=1920,DURATION=26
const canvas=document.querySelector('#film'),c=canvas.getContext('2d',{alpha:false})
const C={bg:'#f5f2fa',paper:'#fffefa',ink:'#281c38',purple:'#9659c3',deep:'#754099',lilac:'#d8c0ef',wash:'#f2e8fb',muted:'#867991',line:'#e9e1ee',mint:'#dcf7d1',yellow:'#ffe6a1',red:'#e35263'}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t
const ease=t=>1-Math.pow(1-clamp(t),4),smooth=t=>(t=clamp(t))<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2
const spring=t=>t<=0?0:1-Math.exp(-8*t)*Math.cos(12*t)
const p=(t,s,d)=>clamp((t-s)/d)
const pulse=(t,s)=>Math.sin(Math.PI*p(t,s,.55))
let mark,courses
const shotTimes=[2.5,8,12.5,17.5,23]
function state(fn){c.save();fn();c.restore()}
function rect(x,y,w,h,r=20,fill=C.paper,stroke=null,lw=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.stroke()}}
function text(s,x,y,size=28,color=C.ink,weight=500,align='left',spacing=0){c.font=`${weight} ${size}px ${/[\u3000-\u9fff]/.test(s)?'NotoTC':'Inter'}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.letterSpacing=spacing+'px';c.fillText(s,x,y);c.letterSpacing='0px'}
function line(x,y,x1,y1,col=C.line,w=2){c.beginPath();c.moveTo(x,y);c.lineTo(x1,y1);c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.stroke()}
function dot(x,y,r,col){c.beginPath();c.arc(x,y,Math.max(.001,r),0,2*Math.PI);c.fillStyle=col;c.fill()}
function ring(x,y,r,col=C.purple,w=3){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=col;c.lineWidth=w;c.stroke()}
function brand(x,y,w,color=C.ink){state(()=>{c.translate(x,y);c.scale(w/168,w/168);c.fillStyle=color;c.fill(mark)})}
function plus(x,y,s,color=C.ink,minus=false){line(x-s/2,y,x+s/2,y,color,3.5);if(!minus)line(x,y-s/2,x,y+s/2,color,3.5)}
function check(x,y,s,col=C.deep){c.beginPath();c.moveTo(x-s*.45,y);c.lineTo(x-s*.1,y+s*.33);c.lineTo(x+s*.5,y-s*.37);c.lineWidth=4;c.strokeStyle=col;c.lineCap='round';c.lineJoin='round';c.stroke()}
function search(x,y,s=23,col=C.ink){ring(x-3,y-3,s*.38,col,3);line(x+s*.21,y+s*.21,x+s*.48,y+s*.48,col,3)}
function arrow(x,y,s,col=C.ink,angle=0){state(()=>{c.translate(x,y);c.rotate(angle);line(-s/2,0,s/2,0,col,3);line(s*.1,-s*.32,s/2,0,col,3);line(s*.1,s*.32,s/2,0,col,3)})}
function calendar(x,y,s=30,col=C.ink){rect(x-s*.45,y-s*.38,s*.9,s*.8,s*.1,null,col,2.8);line(x-s*.45,y-s*.13,x+s*.45,y-s*.13,col,2.8);line(x-s*.22,y-s*.52,x-s*.22,y-s*.25,col,2.8);line(x+s*.22,y-s*.52,x+s*.22,y-s*.25,col,2.8);dot(x-s*.16,y+s*.11,2,col);dot(x+s*.16,y+s*.11,2,col)}
function heart(x,y,col=C.muted){state(()=>{c.translate(x,y);c.beginPath();c.moveTo(0,12);c.bezierCurveTo(-32,-7,-10,-25,0,-10);c.bezierCurveTo(10,-25,32,-7,0,12);c.strokeStyle=col;c.lineWidth=2;c.stroke()})}
function sparkle(x,y,s=22,col=C.purple){state(()=>{c.translate(x,y);c.beginPath();c.moveTo(0,-s);c.quadraticCurveTo(0,0,s,0);c.quadraticCurveTo(0,0,0,s);c.quadraticCurveTo(0,0,-s,0);c.quadraticCurveTo(0,0,0,-s);c.strokeStyle=col;c.lineWidth=2.6;c.stroke()})}
function pill(s,x,y,w,fill=C.wash,col=C.deep,size=24){rect(x,y,w,45,22,fill);text(s,x+w/2,y+31,size,col,600,'center')}
function reveal(s,x,y,size,t,at=0,color=C.ink){const q=ease(p(t,at,.6));state(()=>{c.beginPath();c.rect(0,y-size*1.18,W,size*1.5);c.clip();text(s,x,y+(1-q)*size*1.35,size,color,850)})}
function background(t,dark=false){c.fillStyle=dark?C.ink:C.bg;c.fillRect(0,0,W,H);state(()=>{c.globalAlpha=dark?.075:.22;for(let i=0;i<5;i++){c.beginPath();c.ellipse(985,1050,420+i*130,700+i*110,.1+Math.sin(t*.18)*.12,0,Math.PI*2);c.strokeStyle=C.lilac;c.lineWidth=2;c.stroke()}})}
function header(t,dark=false){brand(66,80,225,dark?C.paper:C.ink);text('查課 × 課表',1014,106,24,dark?C.lilac:C.deep,550,'right',2);line(66,148,1014,148,dark?'#ffffff28':C.line);for(let i=0;i<4;i++){const start=[2.5,8,12.5,17.5][i],end=[8,12.5,17.5,23][i];rect(66+i*241,1818,220,5,2,dark?'#ffffff20':'#e4d8ed');const q=p(t,start,end-start);if(q>0)rect(66+i*241,1818,220*q,5,2,dark?C.lilac:C.purple)}text('NTHUMODS.COM',66,1872,18,dark?C.lilac:C.muted,600,'left',2);text('手機版操作示意',1014,1872,18,dark?C.lilac:C.muted,500,'right',1)}
function step(n,title,sub,t,at){const q=ease(p(t,at,.55));state(()=>{c.globalAlpha=q;c.translate(0,24*(1-q));pill('0'+n+' / 04',66,200,146,C.purple,C.paper,23);text(title,66,328,65,C.ink,850);text(sub,66,383,28,C.muted,500)})}
function caption(title,sub,t,start){const q=ease(p(t,start,.45));state(()=>{c.globalAlpha=q;c.translate(0,24*(1-q));rect(66,1630,948,137,28,C.ink);text(title,96,1688,33,C.paper,650);if(sub)text(sub,96,1735,25,C.lilac,450)})}
function tap(x,y,t,at){const q=p(t,at,.66);if(t<at||q>=1){return}state(()=>{c.globalAlpha=1-q;ring(x,y,25+q*62,C.purple,6*(1-q)+1);dot(x,y,10*(1-q),C.purple)})}
function cursor(x,y,t,at,fadeAt=at+1.1){if(t<at||t>fadeAt+.35){return}const q=ease(p(t,at,.38)),a=1-ease(p(t,fadeAt,.35));state(()=>{c.globalAlpha=a;c.translate(x+28*(1-q),y+40*(1-q));c.scale(1-.12*pulse(t,at+.35),1-.12*pulse(t,at+.35));c.beginPath();c.moveTo(0,0);c.lineTo(8,41);c.lineTo(18,31);c.lineTo(30,51);c.lineTo(42,44);c.lineTo(30,24);c.lineTo(46,23);c.closePath();c.fillStyle=C.ink;c.strokeStyle=C.paper;c.lineWidth=3;c.lineJoin='round';c.fill();c.stroke()})}
function highlight(x,y,w,h,t,at,duration=1.6){if(t<at||t>at+duration){return}state(()=>{c.globalAlpha=ease(p(t,at,.2))*(1-ease(p(t,at+duration-.2,.2)));rect(x,y,w,h,12,'#9659c30c',C.purple,3);line(x+12,y+h+7,x+12+(w-24)*ease(p(t,at,.6)),y+h+7,C.purple,4)})}
function plusButton(x,y,added=false,scale=1){state(()=>{c.translate(x,y);c.scale(scale,scale);rect(-25,-25,50,50,10,added?C.red:C.paper,added?C.red:'#d6cddf',1.8);plus(0,0,19,added?C.paper:C.ink,added)})}
function tag(s,x,y,w){rect(x,y,w,33,8,C.wash);text(s,x+w/2,y+23,18,C.deep,550,'center')}
function courseRow(item,i,t,added=false){const y=734+i*261;const result=ease(p(t,6.15+i*.11,.52));state(()=>{c.globalAlpha=result;c.translate(0,35*(1-result));if(i===0&&added){rect(111,y-24,858,235,15,'#f8f1fe')}text(item.department+' '+item.course+item.class.padStart(2,'0'),132,y+15,25,C.purple,750);text(item.name_zh+' - '+item.teacher_zh.join('、'),132,y+68,32,C.ink,750);arrow(665,y+57,12,C.muted);text(item.venues[0]+' / '+item.times[0],132,y+113,24,C.muted);tag(item.credits+' 學分',132,y+144,82);heart(838,y+1);plusButton(920,y+1,added&&i===0);line(115,y+230,967,y+230,C.line,1.5)})}
function page(t,{empty=false,drawer=0}={}){
  const added=t>=14.55
  state(()=>{c.shadowColor='#30134517';c.shadowBlur=45;c.shadowOffsetY=25;rect(66,433,948,1145,36,C.paper,'#e4d9ee',2);c.shadowColor='transparent';c.beginPath();c.roundRect(66,433,948,1145,36);c.clip()
    rect(66,433,948,61,0,'#ece6f3');dot(95,464,5,C.lilac);text('nthumods.com/zh/courses',540,474,22,C.muted,550,'center');line(105,531,131,531,C.muted,2);line(105,539,131,539,C.muted,2);line(105,547,131,547,C.muted,2);text('課程',163,549,30,C.ink,750);arrow(958,538,25,C.muted)
    rect(104,585,175,64,12,C.paper,'#d7cce0',1.5);text('115-1 學期',119,626,23,C.ink,550);line(252,613,259,620,C.muted,2);line(259,620,266,613,C.muted,2)
    rect(295,585,430,64,12,C.paper,(t>4.8&&t<6.5)?C.purple:'#d7cce0',t>4.8&&t<6.5?3:1.5)
    const typed=empty?'':courses[0].name_zh.slice(0,Math.floor(p(t,5.05,1.05)*4))
    text(typed||'尋找你要的課程...',315,627,24,typed?C.ink:C.muted,500)
    if(t>4.9&&t<6.45&&Math.floor(t*3)%2===0){const tw=typed.length*24;line(317+tw,602,317+tw,632,C.purple,2)}
    search(762,616,25);sparkle(817,617,14,C.ink);line(860,608,887,608,C.ink,2.3);line(864,617,883,617,C.ink,2.3);line(870,626,877,626,C.ink,2.3);calendar(952,617,30)
    text(t<6.2?'選擇學期，開始搜尋':'找到 3 門課程',111,695,20,C.muted,450)
    if(!empty&&t>6.15)courses.forEach((item,i)=>courseRow(item,i,t,added))
    else{for(let i=0;i<3;i++){const y=752+i*255;rect(132,y,180,17,8,'#eee7f3');rect(132,y+40,480,25,10,'#e8deef');rect(132,y+88,335,14,6,'#f0eaf4');line(115,y+194,967,y+194,C.line,1.5)}}
    if(t>3.1&&t<4.55){const q=ease(p(t,3.1,.25))*(1-ease(p(t,4.28,.27)));state(()=>{c.globalAlpha=q;c.shadowColor='#200b4022';c.shadowBlur=20;rect(104,659,275,206,14,C.paper,'#e4d9ee');c.shadowColor='transparent';rect(114,669,255,53,8,C.wash);text('115-1 學期',131,705,25,C.ink,550);check(340,694,16);text('114-2 學期',131,767,25,C.muted,450);text('114-1 學期',131,828,25,C.muted,450)})}
    if(drawer>0){rect(66,494,948,1084,0,`rgba(28,14,40,${.24*drawer})`);state(()=>{c.translate(0,(1-drawer)*950);timetable(t)})}
  })
}
function timetable(t){
  rect(84,735,912,843,[30,30,0,0],C.paper);rect(479,751,122,7,4,'#cfc3d9');rect(107,789,866,61,12,'#f0e9f5');rect(113,795,270,49,8,C.paper);text('時間表',248,829,27,C.ink,650,'center');text('課程清單',540,829,25,C.muted,450,'center');text('已收藏課程',823,829,25,C.muted,450,'center')
  const x0=205,y0=927,cw=145,rh=61
  const days=['一','二','三','四','五'];days.forEach((s,i)=>text(s,x0+i*cw+cw/2,905,24,C.muted,650,'center'))
  for(let r=0;r<8;r++){text(String(r+1),151,y0+r*rh+39,23,C.muted,550,'center');line(185,y0+r*rh,946,y0+r*rh,C.line,1)}
  line(185,y0+8*rh,946,y0+8*rh,C.line,1)
  for(let col=0;col<=5;col++)line(x0+col*cw,y0,x0+col*cw,y0+8*rh,C.line,1)
  const q=spring(p(t,19.48,.65));[[1,2,2],[3,2,1]].forEach(([col,row,span],i)=>state(()=>{const x=x0+cw*col+4,y=y0+rh*row+3;c.translate(x+68,y+rh*span/2);c.scale(q,q);c.translate(-68,-rh*span/2);rect(0,0,cw-8,rh*span-6,8,C.lilac);text('資料結構',12,29,23,C.ink,650);if(span===2){text('沈之涯',12,59,18,C.deep);text('台達109',12,89,17,C.deep)}}))
  line(106,1452,974,1452,C.line);pill('1 門課程',122,1481,168,C.wash,C.deep,24);text('3 學分',950,1513,25,C.ink,600,'right')
  if(t>20.3){const a=ease(p(t,20.3,.4));state(()=>{c.globalAlpha=a;ring(x0+cw*1+cw/2,y0+rh*2+rh,103+Math.sin(t*2)*3,'#9659c365',2)})}
}
function intro(t){background(t,true);header(t,true);pill('手機查課小教室',66,259,334,C.lilac,C.ink,26);reveal('找到好課',66,520,147,t,.05,C.paper);reveal('一按加入。',66,712,143,t,.2,C.lilac)
  const q=spring(p(t,.27,.85));state(()=>{c.translate(540,1134);c.scale(q,q);c.rotate(-.07+Math.sin(t)*.025);rect(-362,-189,724,378,44,C.paper);text('資料結構',-314,-83,54,C.ink,800);text('查課  →  加入  →  看課表',-314,-19,25,C.muted,500);rect(-314,28,628,105,23,C.wash);search(-260,82,35,C.deep);text('資料結構',-213,95,34,C.ink,550);plusButton(251,82,false,1.24)})
  const z=ease(p(t,.7,.5));state(()=>{c.globalAlpha=z;pill('26 秒學會排課',332,1519,416,C.purple,C.paper,29)})
  if(t>2.12){const q=smooth(p(t,2.12,.38));c.fillStyle=C.bg;c.fillRect(0,H*(1-q),W,H*q)}
}
function lookup(t){background(t);header(t);step(1,'選學期，輸入課名','先開啟 nthumods.com/zh/courses',t,2.5);page(t)
  cursor(232,616,t,2.75,3.15);tap(232,616,t,3.1);cursor(240,695,t,3.58,4.05);tap(240,695,t,4.03);cursor(428,617,t,4.55,5.25);tap(428,617,t,4.93)
  if(t<4.7)highlight(100,581,183,72,t,2.78,1.75);else highlight(291,581,438,72,t,4.76,1.65)
  caption(t<4.75?'01  先確認想查詢的學期':'輸入「資料結構」，結果即時更新',t<4.75?'示範選擇 115-1 學期':'不用離開頁面，就能快速查課。',t,2.75)
}
function inspect(t){background(t);header(t);step(2,'核對老師與上課時間','同名課程，也可能有不同授課老師。',t,8);page(t)
  highlight(125,761,587,55,t,8.45,1.6);highlight(125,818,695,49,t,10.08,2.2)
  if(t>9.95){const q=ease(p(t,9.95,.4));state(()=>{c.globalAlpha=q;c.translate(0,18*(1-q));rect(139,1175,802,206,26,C.ink);pill('T3T4R3',168,1203,179,C.lilac,C.ink,24);text('週二第 3、4 節',172,1292,36,C.paper,650);text('週四第 3 節',172,1343,32,C.lilac,550);calendar(853,1287,78,C.lilac)})}
  caption('課名、老師、教室與節次，一起確認','示範：沈之涯老師 · 台達館 109',t,8.3)
}
function add(t){background(t);header(t);step(3,'按「＋」，加入課表','在想加入的那一列，點右側加號。',t,12.5);page(t)
  highlight(885,700,72,69,t,12.95,2.2);cursor(920,735,t,13.47,14.73);tap(920,735,t,14.2)
  const magnify=ease(p(t,12.9,.45))*(1-ease(p(t,16.8,.4)));state(()=>{c.globalAlpha=magnify;c.translate(0,25*(1-magnify));line(914,782,805,1110,C.purple,2.8);dot(914,782,6,C.purple);rect(299,1097,623,275,32,C.paper,'#d1b4e8',3);text(t<14.55?'點一下就加入':'已加入課表',340,1162,38,C.ink,750);plusButton(414,1251,t>=14.55,2.1);text(t<14.55?'＋ 加入':'− 退掉',508,1259,38,t<14.55?C.deep:C.red,650);text(t<14.55?'課表規劃，從這裡開始':'按鈕變成「−」，代表已加入',339,1331,25,C.muted,500)})
  if(t>=14.55&&t<15.4){const q=p(t,14.55,.85);state(()=>{c.globalAlpha=1-q;for(let i=0;i<14;i++){const a=i*Math.PI*2/14,r=35+q*100;dot(920+Math.cos(a)*r,735+Math.sin(a)*r,4*(1-q),i%2?C.purple:C.deep)}})}
  caption(t<14.55?'把這門課放進你的 NTHUMods 課表':'加入成功，按鈕會變成紅色「−」',t<14.55?'手機版使用「＋」圖示加入。':'若想移除，再按一次「−」即可。',t,12.8)
}
function confirm(t){background(t);header(t);step(4,'打開時間表，確認安排','點搜尋列右上角的日曆圖示。',t,17.5);const drawer=ease(p(t,18.85,.62));page(t,{drawer});highlight(919,582,68,70,t,17.82,1.1);cursor(951,617,t,18.08,18.83);tap(951,617,t,18.52)
  if(t>17.85&&t<18.9){state(()=>{c.globalAlpha=ease(p(t,17.85,.2))*(1-ease(p(t,18.65,.25)));line(948,655,908,694,C.purple,2.5);pill('日曆圖示',697,678,242,C.lilac,C.ink,26)})}
  if(t>20){state(()=>{c.globalAlpha=ease(p(t,20,.4));pill('已排入上課時段',316,660,448,C.mint,C.deep,26);check(353,683,22)})}
  caption(t<19?'點日曆，開啟時間表':'新增課程，直接出現在時間表',t<19?'在同一個搜尋頁面，就能檢查排課。':'週二第 3、4 節 · 週四第 3 節',t,18.02)
}
function outro(t){const u=t-23;background(t,true);header(t,true);pill('完成，下一堂安排好了',224,322,632,C.lilac,C.ink,30)
  const q=spring(p(u,.05,.75));state(()=>{c.translate(540,754);c.scale(q,q);dot(0,0,155,C.mint);check(0,0,119,C.deep);for(let i=0;i<10;i++){const a=i*Math.PI/5+u*.25;dot(Math.cos(a)*240,Math.sin(a)*240,4.5,i%2?C.lilac:C.mint)}})
  reveal('查課，加入，',111,1130,100,u,.25,C.paper);reveal('課表就到位。',111,1270,100,u,.4,C.lilac)
  const a=ease(p(u,.7,.4));state(()=>{c.globalAlpha=a;brand(240,1426,600,C.paper);text('nthumods.com/zh/courses',540,1580,34,C.paper,550,'center');text('正式選課請至校務系統辦理',540,1698,24,C.lilac,450,'center')})
}
function draw(t){t=clamp(t,0,25.9999);c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.shadowBlur=0;c.shadowOffsetY=0;c.lineWidth=1
  if(t<2.5)intro(t);else if(t<8)lookup(t);else if(t<12.5)inspect(t);else if(t<17.5)add(t);else if(t<23)confirm(t);else outro(t)
  if(t>22.72&&t<23.25){const a=smooth(p(t,22.72,.53));c.fillStyle=C.lilac;c.fillRect(0,-H*1.9+a*H*3.8,W,H*1.8)}
}
window.renderFrame=draw
window.ready=(async()=>{await document.fonts.load('850 120px NotoTC','查課');await document.fonts.load('450 28px NotoTC','沈之涯');await document.fonts.load('500 28px Inter');mark=new Path2D(await(await fetch('assets/wordmark.json')).json());courses=await(await fetch('assets/courses.json')).json();draw(0);window.motionReady=true})()
const button=document.querySelector('#play');let playing=false,started=0,audio
button.onclick=async()=>{await window.ready;if(playing){playing=false;audio?.pause();button.textContent='重新播放';return}audio||=new Audio('soundtrack.wav');audio.currentTime=0;audio.play().catch(()=>{});started=performance.now();playing=true;button.textContent='暫停';const tick=now=>{if(!playing){return}const t=(now-started)/1000;draw(Math.min(t,25.999));if(t<26)requestAnimationFrame(tick);else{playing=false;button.textContent='重新播放'}};requestAnimationFrame(tick)}
