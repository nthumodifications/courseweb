/* Deterministic, frame-addressable motion system. All artwork is vector. */
const W=1080,H=1920,DURATION=15
const locale=window.MOTION_LOCALE||{strings:{}}
const tr=str=>locale.strings[str]||str
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d',{alpha:false})
const C={ink:'#15121c',paper:'#f4f0e8',purple:'#9659c3',lilac:'#c5a6ed',lime:'#dafa87',muted:'#a298b0',line:'#ffffff20'}
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v))
const lerp=(a,b,t)=>a+(b-a)*t
const out=t=>1-Math.pow(1-clamp(t),4)
const io=t=>(t=clamp(t))<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2
const expo=t=>t<=0?0:1-Math.pow(2,-10*clamp(t))
const spring=t=>t<=0?0:1-Math.exp(-7.5*t)*Math.cos(11*t)
const prog=(t,start,duration)=>clamp((t-start)/duration)
let campus,wordmark,buildings=[],roads=[],waters=[]
function rr(x,y,w,h,r=20,fill=C.paper,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function line(x,y,x2,y2,color=C.line,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke()}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,Math.max(.01,r),0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
function text(str,x,y,size=28,color=C.paper,weight=500,align='left',spacing=0){str=tr(str);const cjk=/[\u3000-\u9fff]/.test(str);ctx.font=`${weight} ${size}px ${cjk&&locale.font?locale.font:'Inter'}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.letterSpacing=`${cjk&&spacing<0?size*.008:spacing}px`;ctx.fillText(str,x,y);ctx.letterSpacing='0px'}
function poly(points,color,stroke){if(!points.length){return}ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(color){ctx.fillStyle=color;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
function save(fn){ctx.save();fn();ctx.restore()}
function arrow(x,y,size,color=C.ink,angle=-Math.PI/4){save(()=>{ctx.translate(x,y);ctx.rotate(angle);ctx.lineWidth=size*.1;ctx.lineCap='round';ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-size*.45,0);ctx.lineTo(size*.4,0);ctx.moveTo(size*.08,-size*.32);ctx.lineTo(size*.4,0);ctx.lineTo(size*.08,size*.32);ctx.stroke()})}
function cross(x,y,s=8,color=C.muted){line(x-s,y,x+s,y,color,1.5);line(x,y-s,x,y+s,color,1.5)}
function pill(str,x,y,w,color=C.lime,ink=C.ink){rr(x,y,w,48,24,color);text(str,x+w/2,y+32,20,ink,650,'center',1)}
function brand(x,y,w,color=C.paper){save(()=>{ctx.translate(x,y);ctx.scale(w/168,w/168);ctx.fillStyle=color;ctx.fill(wordmark)})}
function symbol(x,y,size,color=C.ink,fill=C.paper,split=0){save(()=>{ctx.translate(x,y);ctx.scale(size/81,size/81);ctx.lineWidth=3.7;rr(2-split,5-split,61,61,13,fill,color);rr(15-split,-split,5,11,2.5,color);rr(45-split,-split,5,11,2.5,color);rr(11+split,18+split,61,61,13,fill,color);rr(21+split,32+split,11,33,5.5,color);rr(51+split,32+split,11,33,5.5,color);rr(36+split,39+split,11,11,5.5,color);rr(24+split,13+split,5,11,2.5,color);rr(54+split,13+split,5,11,2.5,color)})}
function base(bg=C.ink){ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)}
function grid(bg,t){save(()=>{ctx.globalAlpha=.14;const col=bg===C.paper?'#665273':'#c5a6ed';for(let x=72;x<W;x+=156)line(x,220,x,1720,col);for(let y=260;y<1740;y+=156)line(55,y,1025,y,col);for(let y=260;y<1740;y+=312){for(let x=72;x<W;x+=312){cross(x,y,5,col)}}})}
function hud(t,title,index,dark=false){const col=dark?C.ink:C.paper;save(()=>{ctx.globalAlpha=.85;brand(66,79,212,col);text('CAMPUS, IN SYNC',1014,108,18,col,500,'right',2);line(66,144,1014,144,dark?'#15121c30':'#ffffff30');text(index+' / '+tr(title),66,1790,19,col,550,'left',2);text('NTHU · TAIWAN',1014,1790,19,col,500,'right',2);line(66,1830,1014,1830,dark?'#15121c25':'#ffffff25',2);line(66,1830,66+948*t/15,1830,col,3)})}
function reveal(str,x,y,size,t,delay=0,color=C.paper,weight=850,align='left'){size=locale.headlineSizes?.[str]||size;const p=out(prog(t,delay,.65));save(()=>{ctx.beginPath();ctx.rect(0,y-size*1.12,W,size*1.32);ctx.clip();text(str,x,y+(1-p)*size*1.35,size,color,weight,align,-size*.055)})}
function star(x,y,r,t,color=C.lime){save(()=>{ctx.translate(x,y);ctx.rotate(t);for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);rr(-r*.15,-r,r*.3,r*2,r*.12,color)}})}
function orbitTile(x,y,s,rot,color=C.lilac,kind=0){save(()=>{ctx.translate(x,y);ctx.rotate(rot);ctx.shadowColor='#00000040';ctx.shadowBlur=30;ctx.shadowOffsetY=20;rr(-s/2,-s/2,s,s,s*.2,color);ctx.shadowColor='transparent';if(kind===0)symbol(-s*.3,-s*.3,s*.6,C.ink,color);else if(kind===1){for(let j=0;j<3;j++)for(let i=0;i<3;i++)rr(-s*.3+i*s*.22,-s*.3+j*s*.22,s*.14,s*.14,s*.025,C.ink)}else arrow(0,0,s*.6)})}
function intro(t){
  base();grid(C.ink,t)
  const p=out(prog(t,0,.7))
  save(()=>{ctx.translate(540,920);ctx.rotate(-.15+t*.12);ctx.scale(p,p);ctx.strokeStyle='#c5a6ed25';ctx.lineWidth=1.2;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(0,0,250+i*70,540+i*45,.8,0,Math.PI*2);ctx.stroke()}})
  pill('YOUR CAMPUS. REIMAGINED.',66,277,415,C.lilac)
  reveal('LESS',60,569,220,t,.12)
  reveal('FRICTION.',60,749,163,t,.28,C.lilac)
  const s=spring(prog(t,.48,1.2))
  orbitTile(535,1135,330*s,-.13+Math.sin(t*1.5)*.06,C.purple,0)
  orbitTile(230,1270+Math.sin(t*2)*15,140*s,.22-t*.16,C.paper,1)
  orbitTile(859,996+Math.cos(t*2)*20,158*s,-.3+t*.15,C.lime,2)
  save(()=>{ctx.globalAlpha=out(prog(t,.9,.5));text('Find your course.',66,1540,43,C.paper,500);text('Find your rhythm.',66,1600,43,C.muted,500);arrow(935,1555,85,C.lime)})
  const exit=io(prog(t,2.43,.38))
  if(exit>0){save(()=>{ctx.translate(540,1135);ctx.rotate(-.13*(1-exit));const sz=lerp(330,2500,exit);rr(-sz/2,-sz/2,sz,sz,lerp(66,0,exit),C.lilac)})}
  hud(t,'DISCOVER','01')
}
function searchIcon(x,y,color){ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.stroke();line(x+10,y+10,x+23,y+23,color,4)}
const courses=[{name:'Machine Learning',code:'CS 4601',tag:'COMPUTER SCIENCE',color:C.ink},{name:'Design Thinking',code:'GE 1204',tag:'GENERAL EDUCATION',color:C.paper},{name:'Data Structures',code:'CS 2351',tag:'COMPUTER SCIENCE',color:C.lime}]
function courseCard(c,x,y,w,h,t,idx,selected=false){save(()=>{ctx.translate(x,y);ctx.rotate(Math.sin(t*.9+idx)*.014);ctx.shadowBlur=25;ctx.shadowColor='#31144720';ctx.shadowOffsetY=16;rr(0,0,w,h,27,c.color);ctx.shadowColor='transparent';const dark=c.color===C.ink,ink=dark?C.paper:C.ink;let circleColor;if(selected)circleColor=C.lime;else if(dark)circleColor='#ffffff15';else circleColor='#00000009';text(c.code,32,48,20,dark?C.lilac:'#60506f',650,'left',1);text(c.name,32,108,42,ink,700,'left',-1.5);line(32,143,w-32,143,dark?'#ffffff25':'#15121c22');text(c.tag,32,h-29,16,ink,550,'left',1.1);text('3 CREDITS',w-32,h-29,16,ink,600,'right',1);circle(w-52,53,21,circleColor);if(selected){ctx.strokeStyle=C.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w-62,53);ctx.lineTo(w-54,61);ctx.lineTo(w-40,45);ctx.stroke()}else{line(w-61,53,w-43,53,ink,2);line(w-52,44,w-52,62,ink,2)}})}
function discover(t){const u=t-2.8125;base(C.lilac);grid(C.paper,t)
  reveal('MORE',65,428,193,u,.02,C.ink)
  reveal('POSSIBILITY.',65,568,129,u,.14,C.ink)
  const slide=out(prog(u,.2,.65));save(()=>{ctx.globalAlpha=slide;ctx.translate(0,70*(1-slide));rr(65,671,950,110,55,C.paper);searchIcon(112,722,C.ink);const q=tr('Find your next obsession');text(q.slice(0,Math.floor(prog(u,.35,.7)*q.length)),157,737,31,C.ink,450);line(920,709,920,744,C.ink,2);arrow(965,724,38,C.ink,0)})
  for(let i=2;i>=0;i--){let enter=out(prog(u,.42+i*.16,.65));const pick=out(prog(u,1.5,.35));let xx=65+(1-enter)*(i%2? -1050:1050),yy=847+i*248;let sc=1;if(i===0){sc=1+pick*.024;xx-=pick*10}save(()=>{ctx.translate(xx,yy);ctx.scale(sc,sc);courseCard(courses[i],0,0,950,218,u,i,i===0&&u>1.5)})}
  star(917,382,39,u*.6,C.ink)
  text('SEARCH LESS. DISCOVER MORE.',65,1670,22,C.ink,600,'left',2)
  hud(t,'FIND YOUR COURSE','02',true)
}
const blocks=[{c:0,r:0,h:2,name:'Machine',name2:'Learning',code:'CS 4601',co:C.purple},{c:1,r:2,h:2,name:'Design',name2:'Thinking',code:'GE 1204',co:C.lime},{c:2,r:0,h:3,name:'Data',name2:'Structures',code:'CS 2351',co:C.lilac},{c:3,r:3,h:2,name:'Creative',name2:'break',code:'YOUR TIME',co:C.paper},{c:0,r:4,h:1,name:'Focus',name2:'',code:'',co:C.lilac},{c:2,r:4,h:1,name:'Explore',name2:'',code:'',co:C.lime},{c:3,r:0,h:2,name:'Make',name2:'something',code:'YOUR TIME',co:C.purple}]
function planner(t){const u=t-5.625;base(C.paper)
  const slide=out(prog(u,0,.6));reveal('MAKE',65,399,190,u,.02,C.ink);reveal('TIME',65,584,212,u,.12,C.ink);reveal('YOURS.',65,770,190,u,.23,C.purple)
  save(()=>{ctx.translate(932,698);ctx.rotate(u*.7);star(0,0,55,0,C.purple)})
  const zoom=lerp(.78,1,out(prog(u,0,.85)))
  save(()=>{ctx.translate(540,1260+100*(1-slide));ctx.scale(zoom,zoom);ctx.transform(1,-.075+Math.sin(u*.5)*.02,.10,1,0,0);ctx.translate(-480,-405)
    ctx.shadowColor='#2d0b4c28';ctx.shadowBlur=60;ctx.shadowOffsetY=32;rr(-10,-30,980,805,28,C.ink);ctx.shadowColor='transparent'
    text('YOUR WEEK',28,21,17,C.lilac,650,'left',2);pill('IN SYNC',776,-4,143,C.lime)
    const days=['MON','TUE','WED','THU'];days.forEach((d,i)=>text(d,146+i*224,88,19,C.paper,600,'center',1.4))
    for(let j=0;j<=5;j++)line(38,122+j*120,924,122+j*120,'#ffffff20')
    for(let j=0;j<=4;j++)line(34+j*224,110,34+j*224,733,'#ffffff20')
    blocks.forEach((b,i)=>{const p=spring(prog(u,.23+i*.12,.8));save(()=>{const x=43+b.c*224,y=132+b.r*120;ctx.translate(x+104,y+b.h*57);ctx.scale(.75+.25*p,p);ctx.translate(-104,-b.h*57);rr(0,0,205,b.h*120-18,13,b.co);const ink=b.co===C.purple?C.paper:C.ink;text(b.name,15,39,24,ink,650);if(b.name2){text(b.name2,15,72,24,ink,650)}if(b.h>1){text(b.code,15,b.h*120-38,13,ink,600,'left',1)}})})
    const sweep=prog(u,1.28,.6);if(sweep>0){line(38,122+sweep*590,925,122+sweep*590,C.lime,3);circle(34,122+sweep*590,5,C.lime)}
  })
  hud(t,'BUILD YOUR RHYTHM','03',true)
}
const coord=p=>[(p[0]-120.993)*101000,(p[1]-24.792)*111100]
let cam={angle:-.5,zoom:1,rise:1}
function project(x,y,z=0){const a=cam.angle,rx=x*Math.cos(a)-y*Math.sin(a),ry=x*Math.sin(a)+y*Math.cos(a);return [540+rx*cam.zoom,1110+ry*cam.zoom*.57-z*cam.zoom*1.55]}
function mapGeometry(u){
  cam={angle:-.62+u*.17,zoom:lerp(2.35,1.62,out(prog(u,0,1.4))),rise:out(prog(u,0,1))}
  save(()=>{ctx.beginPath();ctx.rect(0,530,W,1175);ctx.clip()
    const floor=[[-750,-820],[750,-820],[750,820],[-750,820]].map(p=>project(...p));poly(floor,'#21192e')
    for(let g=-800;g<900;g+=80){const a=project(g,-900),b=project(g,900),c=project(-900,g),d=project(900,g);line(...a,...b,'#c5a6ed0a');line(...c,...d,'#c5a6ed0a')}
    waters.forEach(w=>poly(w.map(p=>project(...p)),'#9e81bb'))
    roads.forEach(r=>{if(!r.length){return}ctx.beginPath();r.forEach((p,i)=>{const q=project(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.strokeStyle='#594b6c';ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke()})
    const sorted=buildings.slice().sort((a,b)=>project(...a.center)[1]-project(...b.center)[1])
    sorted.forEach((b,i)=>{const rise=out(prog(u,Math.min(.6,Math.hypot(...b.center)/1400),.65)),h=b.h*rise;const ground=b.points.map(p=>project(...p)),top=b.points.map(p=>project(...p,h));for(let j=0;j<top.length-1;j++){const p=top[j],q=top[j+1];if(q[0]>p[0])poly([ground[j],ground[j+1],q,p],b.focus?'#967538':j%3?'#70508d':'#806298')}let buildingColor;if(b.focus)buildingColor=C.lime;else if(b.h>22)buildingColor='#bea0d6';else buildingColor='#a586bf';poly(top,buildingColor,'#15121c35');if(b.points.length<12&&b.h>16){const ctr=project(...b.center,h+.3);circle(...ctr,2.5,'#efe8f855')}})
    const pin=project(190,22,42),p=out(prog(u,.55,.5));save(()=>{ctx.globalAlpha=p;line(pin[0],pin[1]+70,pin[0],pin[1]+5,C.lime,3);circle(pin[0],pin[1],22*p,C.lime);circle(pin[0],pin[1],7*p,C.ink);ctx.strokeStyle=C.lime;ctx.lineWidth=2;ctx.globalAlpha=.6*(1-prog((u%1.1),0,1.1));ctx.beginPath();ctx.ellipse(pin[0],pin[1]+72,20+(u%1.1)*50,10+(u%1.1)*22,0,0,Math.PI*2);ctx.stroke()})
    if(u>.95){const e=out(prog(u,.95,.4));save(()=>{ctx.globalAlpha=e;ctx.translate(0,30*(1-e));rr(543,875,439,195,20,C.paper);text('AT THIS PLACE',570,916,16,'#70508d',700,'left',1.5);text('Feng Yun Building',570,957,27,C.ink,750);line(570,978,955,978,'#15121c20');text('Touch Cafe',570,1019,24,C.ink,550);pill('2F',885,989,68,C.lilac)})}
  })
}
function campusShot(t){const u=t-8.4375;base(C.ink);reveal('BEYOND',65,376,157,u,.04);reveal('THE CLASS.',65,521,142,u,.14,C.lilac)
  mapGeometry(u)
  save(()=>{const fade=ctx.createLinearGradient(0,1430,0,1720);fade.addColorStop(0,'#15121c00');fade.addColorStop(.58,'#15121ccc');fade.addColorStop(1,C.ink);ctx.fillStyle=fade;ctx.fillRect(0,1430,W,290)})
  const p=out(prog(u,.75,.6));save(()=>{ctx.globalAlpha=p;text('A campus worth exploring.',66,1577,39,C.paper,550);text('Places. People. Possibilities.',66,1636,27,C.muted,450)})
  text('24.792° N / 120.993° E',66,640,18,C.lime,550,'left',2)
  text('MAP DATA © OPENSTREETMAP CONTRIBUTORS',66,1717,12,C.muted,500,'left',.8)
  hud(t,'EXPLORE YOUR CAMPUS','04')
}
function outro(t){const u=t-11.71875;base(C.purple)
  save(()=>{ctx.globalAlpha=.18;ctx.strokeStyle=C.paper;ctx.lineWidth=1.5;ctx.translate(540,850);ctx.rotate(u*.25);for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(0,0,250+i*115,350+i*70,.6,0,Math.PI*2);ctx.stroke()}})
  const gather=out(prog(u,0,.85))
  for(let i=0;i<8;i++){const a=i*Math.PI/4+u*.25,r=lerp(900,230,gather),sc=lerp(120,8,out(prog(u,.35,.6)));save(()=>{ctx.globalAlpha=1-out(prog(u,.65,.35));orbitTile(540+Math.cos(a)*r,835+Math.sin(a)*r,sc,a,C.paper,i%3)})}
  save(()=>{const s=spring(prog(u,.17,.95));ctx.translate(540,780);ctx.rotate(lerp(-.55,0,out(prog(u,.13,.9))));ctx.scale(s,s);ctx.shadowColor='#36144950';ctx.shadowBlur=45;ctx.shadowOffsetY=28;rr(-167,-167,334,334,74,C.paper);ctx.shadowColor='transparent';symbol(-102,-112,218,C.ink,C.paper,lerp(8,0,out(prog(u,.25,.9))))})
  const p=out(prog(u,.6,.7));save(()=>{ctx.globalAlpha=p;ctx.translate(0,50*(1-p));brand(105,1070,870,C.paper)})
  reveal('Your campus.',540,1326,69,u,.9,C.paper,650,'center')
  reveal('In sync.',540,1413,69,u,1.05,C.lime,650,'center')
  save(()=>{ctx.globalAlpha=out(prog(u,1.28,.5));pill('NTHUMODS.COM',353,1535,374,C.ink,C.paper);arrow(950,1582,65,C.lime)})
  text('BUILT FOR LIFE AT NTHU',540,390,21,C.paper,550,'center',4)
  hud(t,'YOUR NEXT CHAPTER','05')
}
function wipe(t,start,duration,color){const p=prog(t,start,duration);if(p<=0||p>=1){return}const e=io(p);save(()=>{ctx.translate(540,960);ctx.rotate(-.13);ctx.fillStyle=color;ctx.fillRect(-1500,-2400+e*4800,3000,2100)})}
function cardMatchCut(t){
  const p=prog(t,5.29,.69)
  if(p<=0||p>=1)return
  const e=io(p)
  // Course modules compress and arc into the next shot's timetable cells.
  save(()=>{ctx.globalAlpha=Math.sin(Math.PI*p)*.95
    for(let i=0;i<3;i++){
      const x=lerp(65,150+i*215,e),y=lerp(847+i*248,1170-i*55,e)-Math.sin(p*Math.PI)*210
      const w=lerp(950,188,e),h=lerp(218,255,e)
      ctx.translate(x+w/2,y+h/2);ctx.rotate(Math.sin(p*Math.PI)*(.16-i*.08));ctx.translate(-x-w/2,-y-h/2)
      rr(x,y,w,h,lerp(27,13,e),[C.purple,C.lime,C.lilac][i])
      if(p>.35){ctx.globalAlpha=Math.sin(Math.PI*p);text(courses[i].name.split(' ')[0],x+20,y+51,lerp(42,24,e),C.ink,650)}
    }
  })
}
function draw(t){t=clamp(t,0,14.99999);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=1
  if(t<2.8125)intro(t);else if(t<5.625)discover(t);else if(t<8.4375)planner(t);else if(t<11.71875)campusShot(t);else outro(t)
  wipe(t,5.42,.41,C.paper);cardMatchCut(t);wipe(t,8.23,.42,C.ink);wipe(t,11.49,.46,C.purple)
  // Subtle static texture, generated without bitmaps or external assets.
  save(()=>{ctx.globalAlpha=.035;for(let i=0;i<160;i++){const x=(i*719)%W,y=(i*1279)%H;circle(x,y,.7,i%2?'#fff':'#000')}})
}
window.renderFrame=draw
window.ready=(async()=>{if(locale.font){await document.fonts.load('850 120px '+locale.font,'選課');await document.fonts.load('450 28px '+locale.font,'風雲樓')}await document.fonts.load('850 120px Inter');await document.fonts.load('450 28px Inter');campus=await(await fetch('assets/campus.json')).json();wordmark=new Path2D(await(await fetch('assets/wordmark.json')).json());buildings=campus.buildings.map(b=>({points:b.geometry.footprint.map(coord),center:coord([b.location.lon,b.location.lat]),h:b.geometry.height||12,focus:b.source.id===138080029}));roads=campus.roads.map(r=>(r.points||[]).map(coord));waters=campus.water.map(w=>(w.polygon||w.points||[]).map(coord));draw(0);window.motionReady=true})()
let playing=false,started=0,audio
const button=document.getElementById('play')
button.addEventListener('click',async()=>{await window.ready;if(playing){playing=false;audio?.pause();button.textContent=tr('Replay with sound');return}audio ||= new Audio('soundtrack.wav');audio.currentTime=0;audio.play().catch(()=>{});playing=true;started=performance.now();button.textContent=tr('Pause');const tick=now=>{if(!playing){return}const t=(now-started)/1000;draw(Math.min(t,14.999));if(t<15)requestAnimationFrame(tick);else{playing=false;button.textContent=tr('Replay with sound')}};requestAnimationFrame(tick)})
