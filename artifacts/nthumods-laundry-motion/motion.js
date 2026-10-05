/* NTHUMods / 洗衣前，先看一眼. Deterministic vector artwork, 32 beats at 128 BPM. */
const W = 1080, H = 1920, DURATION = 15, BEAT = 60/128
// Every cut and accent lands on the score's beat grid.
const CUT1 = 6*BEAT, CUT2 = 14*BEAT, CUT3 = 24*BEAT
const MORPH = 12.7*BEAT, FF = 16*BEAT, DONE = 20*BEAT
const canvas = document.getElementById('film')
const ctx = canvas.getContext('2d', {alpha:false})
const C = {ink:'#15121c', paper:'#f4f0e8', purple:'#9659c3', lilac:'#c5a6ed', lime:'#dafa87', muted:'#a298b0', green:'#286747', amber:'#98601b', sand:'#efcf98'}
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v))
const lerp = (a,b,t) => a+(b-a)*t
const p = (t,start,duration) => clamp((t-start)/duration)
const out = t => 1-Math.pow(1-clamp(t),4)
const io = t => (t=clamp(t))<.5 ? 8*t*t*t*t : 1-Math.pow(-2*t+2,4)/2
const smooth = t => (t=clamp(t))<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2
const expo = t => (t=clamp(t))>=1 ? 1 : 1-Math.pow(2,-10*t)
const inCubic = t => Math.pow(clamp(t),3)
const back = (t,c=1.9) => {t=clamp(t);return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)}
const spring = t => t<=0?0:1-Math.exp(-8*t)*Math.cos(11*t)
const hash = n => {const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)}
const TAU = Math.PI*2
let wordmark, demo
const measuredOverflow = new Set()
window.textOverflow = measuredOverflow

function save(fn){ctx.save();fn();ctx.restore()}
function fade(a){ctx.globalAlpha*=clamp(a)}
function rgb(c){const n=parseInt(c.slice(1,7),16);return [n>>16&255,n>>8&255,n&255]}
function mix(a,b,t){const x=rgb(a),y=rgb(b);return `rgb(${x.map((v,i)=>Math.round(lerp(v,y[i],clamp(t)))).join(',')})`}
function rr(x,y,w,h,r=20,fill=C.paper,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function circle(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,Math.max(.01,r),0,TAU);ctx.fillStyle=fill;ctx.fill()}
function line(x,y,xx,yy,color='#ffffff24',width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function arc(x,y,r,start,end,color,width=5){ctx.beginPath();ctx.arc(x,y,Math.max(.01,r),start,end);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke()}
const family = s => [...s].some(ch=>{const c=ch.codePointAt(0);return c>=0x3000&&c<=0x9fff||c>=0xff00&&c<=0xffef})?'NotoTC':'Inter'
function text(s,x,y,size=28,color=C.paper,weight=500,align='left',maxWidth){
  ctx.font=`${weight} ${size}px ${family(s)}`
  ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='alphabetic'
  if(maxWidth&&ctx.measureText(s).width>maxWidth)measuredOverflow.add(s)
  ctx.fillText(s,x,y)
}
// Per-character kinetic type: each glyph rises through a mask with a soft overshoot, and can exit upward.
function kinetic(s,x,y,size,t,delay=0,color=C.paper,weight=850,align='left',exit=Infinity,stagger=.034){
  ctx.font=`${weight} ${size}px ${family(s)}`
  const chars=[...s],widths=chars.map(ch=>ctx.measureText(ch).width),total=widths.reduce((a,b)=>a+b,0)
  if(total>948)measuredOverflow.add(s)
  let cx=align==='center'?x-total/2:align==='right'?x-total:x
  save(()=>{
    ctx.beginPath();ctx.rect(0,y-size*1.14,W,size*1.42);ctx.clip()
    ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic'
    chars.forEach((ch,i)=>{
      const q=p(t,delay+i*stagger,.6),gone=inCubic(p(t,exit+i*stagger*.7,.32))
      if(q>0&&gone<1)save(()=>{
        const e=back(q,1.5)
        ctx.translate(cx+widths[i]/2,y-size*.36+(1-e)*size*1.3-gone*size*1.4)
        ctx.rotate((1-expo(q))*.32-gone*.18)
        ctx.fillText(ch,-widths[i]/2,size*.36)
      })
      cx+=widths[i]
    })
  })
}
function brand(x,y,w,color=C.paper){save(()=>{ctx.translate(x,y);ctx.scale(w/168,w/168);ctx.fillStyle=color;ctx.fill(wordmark)})}
function pill(s,x,y,w,color=C.lime,ink=C.ink,size=22){rr(x,y,w,50,25,color);text(s,x+w/2,y+34,size,ink,600,'center',w-24)}
function arrow(x,y,s=45,color=C.ink,angle=-Math.PI/4){save(()=>{ctx.translate(x,y);ctx.rotate(angle);ctx.lineCap='round';line(-s*.45,0,s*.4,0,color,s*.09);line(s*.06,-s*.32,s*.4,0,color,s*.09);line(s*.4,0,s*.06,s*.32,color,s*.09)})}
function chevron(x,y,s,color=C.ink){ctx.lineCap='round';line(x-s/2,y-s/4,x,y+s/4,color,3);line(x,y+s/4,x+s/2,y-s/4,color,3)}
function check(x,y,s=24,color=C.ink){ctx.lineCap='round';line(x-s*.45,y,x-s*.1,y+s*.32,color,4);line(x-s*.1,y+s*.32,x+s*.48,y-s*.37,color,4)}
function star(x,y,r,t,color=C.lime){save(()=>{ctx.translate(x,y);ctx.rotate(t);for(let i=0;i<4;i++){ctx.rotate(Math.PI/4);rr(-r*.12,-r,r*.24,r*2,r*.1,color)}})}
function base(color){ctx.fillStyle=color;ctx.fillRect(0,0,W,H)}
function grid(dark=true){save(()=>{fade(.13);const col=dark?C.lilac:'#745582';for(let x=72;x<W;x+=156)line(x,220,x,1720,col);for(let y=260;y<1740;y+=156)line(55,y,1025,y,col)})}
function orbit(x,y,t,color=C.lilac){save(()=>{fade(.2);ctx.translate(x,y);ctx.rotate(t*.15);for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(0,0,290+i*68,490+i*63,.65,0,TAU);ctx.strokeStyle=color;ctx.lineWidth=1.1;ctx.stroke()}})}
function washerIcon(x,y,s,color=C.ink){save(()=>{ctx.translate(x,y);ctx.scale(s/32,s/32);ctx.lineWidth=2;rr(-14,-15,28,30,4,null,color);line(-13,-7,13,-7,color,2);circle(-8,-11,1,color);circle(-3,-11,1,color);arc(0,4,8,0,TAU,color,2);arc(0,4,5,.1,2.5,color,1.5)})}
function windIcon(x,y,s,color=C.ink){save(()=>{ctx.translate(x,y);ctx.scale(s/32,s/32);ctx.lineCap='round';for(let i=0;i<3;i++){const yy=(i-1)*8;line(-14,yy,6-i*4,yy,color,2.5);arc(6-i*4,yy-3,3,-Math.PI/2,Math.PI/2,color,2.5)}})}
function tap(x,y,t,start,color=C.ink){const q=p(t,start,.6);if(q<=0||q>=1)return;save(()=>{fade(1-q);arc(x,y,15+out(q)*52,0,TAU,color,3);circle(x,y,10*(1-q),color)})}
function brandSymbol(x,y,size,color=C.ink,fill=C.paper){save(()=>{ctx.translate(x,y);ctx.scale(size/81,size/81);ctx.lineWidth=3.7;rr(2,5,61,61,13,fill,color);rr(15,0,5,11,2.5,color);rr(45,0,5,11,2.5,color);rr(11,18,61,61,13,fill,color);rr(21,32,11,33,5.5,color);rr(51,32,11,33,5.5,color);rr(36,39,11,11,5.5,color);rr(24,13,5,11,2.5,color);rr(54,13,5,11,2.5,color)})}
const clock = s => String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')

/* Laundry, drawn as simple vector shapes that read at any zoom. */
function shirt(color){ctx.beginPath();ctx.moveTo(-17,-33);ctx.quadraticCurveTo(0,-20,17,-33);ctx.lineTo(43,-19);ctx.lineTo(33,1);ctx.lineTo(24,-5);ctx.lineTo(25,35);ctx.lineTo(-25,35);ctx.lineTo(-24,-5);ctx.lineTo(-33,1);ctx.lineTo(-43,-19);ctx.closePath();ctx.lineJoin='round';ctx.fillStyle=color;ctx.fill()}
function sock(color){ctx.beginPath();ctx.moveTo(-10,-34);ctx.lineTo(10,-34);ctx.lineTo(10,8);ctx.quadraticCurveTo(10,16,20,18);ctx.lineTo(30,20);ctx.quadraticCurveTo(40,24,36,34);ctx.lineTo(4,34);ctx.quadraticCurveTo(-10,34,-10,20);ctx.closePath();ctx.fillStyle=color;ctx.fill();rr(-10,-34,20,9,3,'#15121c30')}
function towel(color){rr(-36,-24,72,48,8,color);rr(-36,10,72,6,2,'#9659c3aa');rr(-36,-16,72,4,2,'#9659c355')}
function drum(t,iris){
  const r=116
  const glass=ctx.createRadialGradient(-45,-52,8,0,0,r)
  glass.addColorStop(0,'#4a3557');glass.addColorStop(1,'#1d1625')
  circle(0,0,r,glass)
  const spin=t*2.25
  save(()=>{ctx.rotate(spin);for(let ring=0;ring<2;ring++)for(let i=0;i<14+ring*6;i++){const a=i/(14+ring*6)*TAU;circle(Math.cos(a)*(64+ring*34),Math.sin(a)*(64+ring*34),2.3,'#ffffff12')}})
  const items=[[0,50,shirt,C.lilac],[2.1,55,sock,C.lime],[4.2,46,towel,C.paper],[5.4,30,sock,C.purple]]
  // A short shutter trail sells the drum speed without blurring the whole frame.
  for(const [lag,alpha] of [[.16,.16],[.08,.3],[0,1]])save(()=>{
    fade(alpha);ctx.rotate(spin-lag)
    for(const [a,d,shape,color] of items)save(()=>{ctx.translate(Math.cos(a)*d,Math.sin(a)*d);ctx.rotate(a+t*1.3);ctx.scale(.92,.92);shape(color)})
  })
  // Water keeps its level while the drum turns.
  for(const [offset,color,alpha,amp] of [[0,C.lilac,.42,7],[9,C.purple,.5,5]])save(()=>{
    fade(alpha);ctx.beginPath();ctx.moveTo(-r,r)
    for(let x=-r;x<=r;x+=6)ctx.lineTo(x,26+offset+Math.sin(x*.05+t*6.2+offset)*amp+Math.sin(x*.021-t*3.3)*4)
    ctx.lineTo(r,r);ctx.closePath();ctx.fillStyle=color;ctx.fill()
  })
  for(let i=0;i<16;i++){
    const q=(t*.55+hash(i))%1,bx=(hash(i+40)-.5)*r*1.4+Math.sin(t*2.4+i)*7,by=lerp(r*.92,-r*.35,q)
    save(()=>{fade((1-q)*.85);arc(bx,by,2.5+hash(i+9)*6,0,TAU,'#ffffffc0',1.6)})
  }
  if(iris>0)circle(0,0,r*1.02*iris,C.lilac)
}
function machine(x,y,size,rotation,t,iris=0){
  save(()=>{
    ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(size/420,size/420)
    ctx.shadowColor='#09040c55';ctx.shadowBlur=40;ctx.shadowOffsetY=30
    rr(-202,-245,414,484,62,'#52326a');ctx.shadowColor='transparent'
    rr(-216,-260,414,484,56,C.purple)
    line(-182,-148,162,-148,'#15121c40',3)
    rr(-171,-218,130,33,9,C.ink);text('WASH',-106,-194,18,C.lilac,650,'center')
    circle(116,-201,23,C.ink);arc(116,-201,13,-2+t*.8,.4+t*.8,C.lime,4)
    for(let i=0;i<3;i++)circle(i*21,-202,4,i===Math.floor(t*4)%3?C.lime:C.ink)
    circle(-9,39,148,C.ink);arc(-9,39,137,-2.8,1.6,C.paper,3)
    save(()=>{ctx.translate(-9,39);ctx.beginPath();ctx.arc(0,0,122,0,TAU);ctx.clip();drum(t,iris)})
    arc(-9,39,109,-2.7,-1.4,'#ffffff55',8)
    rr(130,6,17,62,8,C.paper)
    for(let i=0;i<4;i++)rr(-168+i*20,184,10,4,2,'#15121c65')
    circle(148,184,5,C.lime)
  })
}

/* 01 — inside the drum, pull back, then dive through the porthole. */
function intro(t){
  base(C.ink)
  const pull=.07*out(p(t,0,.45))+.93*expo(p(t,BEAT*.82,1.05)),push=inCubic(p(t,2.36,CUT1-2.36))
  const mx=547,my=1115+Math.sin(t*1.5)*12,rot=-.12+Math.sin(t)*.055,k=422/420
  const px=mx+(-9*Math.cos(rot)-39*Math.sin(rot))*k,py=my+(-9*Math.sin(rot)+39*Math.cos(rot))*k
  const zoom=lerp(9.6,1,pull)*lerp(1,11.5,push),toCenter=1-pull+push
  const camera=(depth=1)=>{const z=1+(zoom-1)*depth;ctx.translate(lerp(px,540,toCenter*depth),lerp(py,960,toCenter*depth));ctx.scale(z,z);ctx.translate(-px,-py)}
  save(()=>{camera(.12);grid();orbit(540,1080,t)})
  save(()=>{
    camera()
    machine(mx,my,422,rot,t,io(p(t,2.5,.3)))
    save(()=>{const q=back(p(t,2*BEAT,.5));fade(p(t,2*BEAT,.12));ctx.translate(190,1003);ctx.rotate(-.035-(1-q)*.3);ctx.scale(q,q);rr(-118,-46,235,93,24,C.lime);circle(-81,0,9,C.green);text(demo.labels.available,-50,14,39,C.ink,750)})
    save(()=>{
      const q=back(p(t,2.5*BEAT,.5));fade(p(t,2.5*BEAT,.12));ctx.translate(874,1300);ctx.rotate(.08+(1-q)*.3);ctx.scale(q,q)
      rr(-132,-53,264,106,25,C.paper);washerIcon(-91,0,35);text(demo.labels.running,-57,10,28,C.ink,700);text(clock(demo.washers[1].seconds+4+Math.ceil(CUT1-t)),97,38,20,C.purple,650,'right')
    })
  })
  const leave=2.24
  save(()=>{fade(p(t,.42,.25)*(1-p(t,leave,.25)));pill('宿舍洗衣・即時狀態',66,260,348,C.lilac)})
  kinetic('洗衣前，',60,510,157,t,BEAT-.05,C.paper,850,'left',leave)
  kinetic('先看一眼。',60,690,157,t,BEAT+.17,C.lilac,850,'left',leave+.06)
  save(()=>{fade(out(p(t,3*BEAT,.5))*(1-p(t,leave,.22)));ctx.translate(0,26*(1-out(p(t,3*BEAT,.5))));text('洗衣機、烘衣機',66,1545,39,C.paper,650);text('出門之前，就知道。',66,1604,34,C.muted,500);arrow(948,1570,77,C.lime)})
}

/* 02 — choose a dorm on a slot reel of the real dorm list, then read the area card. */
const reelOptions = () => [demo.labels.all_dorms,...demo.dorms]
const reelPosition = u => (reelOptions().length+2)*back(p(u,.36,.7),1.05)
function rollDigit(value,x,y,size,color,mod=10,weight=750){
  ctx.font=`${weight} ${size}px Inter`
  const w=ctx.measureText('0').width,whole=Math.floor(value),frac=value-whole
  save(()=>{
    ctx.beginPath();ctx.rect(x-4,y-size*.92,w+8,size*1.1);ctx.clip()
    ctx.fillStyle=color;ctx.textAlign='center'
    ctx.fillText(String(((whole%mod)+mod)%mod),x+w/2,y-frac*size*1.05)
    if(frac>0)ctx.fillText(String((((whole+1)%mod)+mod)%mod),x+w/2,y+(1-frac)*size*1.05)
  })
  return w
}
function miniTile(item,x,y,w,type,t,u){
  const available=item.state==='available',running=item.state==='running'
  const color=available?C.green:running?C.purple:C.amber
  rr(x,y,w,116,14,available?'#e9f1df':running?'#e9e0f0':'#f3e7d5')
  text(String(item.number),x+17,y+36,29,C.ink,750)
  arrow(x+w-24,y+24,16,'#766d7b')
  text(demo.labels[item.state],x+17,y+76,24,color,650)
  if(running){
    const seconds=item.seconds+4-Math.floor(u),total=type==='dryer'?item.totalSeconds:2160
    text(clock(seconds),x+w-14,y+76,23,color,650,'right')
    rr(x+17,y+96,w-34,4,2,'#dacfe2');rr(x+17,y+96,(w-34)*(total-seconds)/total,4,2,C.purple)
  }
}
function tileRect(i,type){return [102+i*296,type==='washer'?1209:1399,283,116]}
function dashboard(t){
  const u=t-CUT1,morph=smooth(p(t,MORPH,CUT2-MORPH)),gone=out(p(t,MORPH,.3))
  base(mix(C.lilac,C.paper,morph));grid(false)
  kinetic('選宿舍，',65,417,146,u,.05,C.ink,850,'left',MORPH-CUT1-.05)
  kinetic('找空機。',65,585,146,u,.17,C.ink,850,'left',MORPH-CUT1+.03)
  save(()=>{fade(p(u,.3,.2)*(1-gone));star(929,479,43*back(p(u,.3,.5)),u*.9,C.ink)})
  const options=reelOptions(),pos=reelPosition(u),selected=u>=1.14
  const bar=out(p(u,.1,.55))
  save(()=>{
    fade(bar*(1-gone));ctx.translate(0,80*(1-bar)+gone*40)
    rr(66,671,948,108,27,C.paper)
    text(selected?demo.dorm:demo.labels.all_dorms,101,742,36,C.ink,700)
    chevron(393,724,22)
    line(436,698,436,751,'#15121c20',2)
    rr(461,691,113,68,15,C.purple);text(demo.labels.all,517,737,29,C.paper,600,'center')
    washerIcon(630,725,40);windIcon(734,725,40)
    line(790,699,790,751,'#15121c20',2)
    text(demo.labels.gender_all,815,739,27,C.ink,500);chevron(970,725,18)
    tap(331,725,u,.24)
    const enter=out(p(u,1.24,.55))
    save(()=>{
      fade(enter);ctx.translate(0,70*(1-enter))
      ctx.shadowColor='#3b1e4d28';ctx.shadowBlur=35;ctx.shadowOffsetY=20
      rr(66,816,948,757,30,C.paper);ctx.shadowColor='transparent'
      text(demo.dorm,102,883,41,C.ink,750)
      const beat=(u%(2*BEAT))/(2*BEAT)
      save(()=>{fade(1-beat);arc(817,869,7+beat*16,0,TAU,C.green,2)})
      circle(817,869,7,C.green);text(demo.labels.connection_live,978,879,25,C.green,550,'right')
      line(102,913,978,913,'#15121c20',2)
      washerIcon(121,958,34);text(demo.labels.washer,154,971,29,C.ink,650)
      windIcon(563,958,34);text(demo.labels.dryer,596,971,29,C.ink,650)
      const free=type=>demo[type].filter(m=>m.state==='available').length
      for(const [type,x] of [['washers',102],['dryers',544]]){
        const roll=smooth(p(u,1.42+(x>300?.08:0),.5))
        const w=rollDigit(free(type)*roll,x,1053,68,C.ink)
        text('/'+demo[type].length,x+w,1053,68,C.ink,750)
        text(demo.labels.available,x+137,1050,30,C.green,650)
        save(()=>{fade(p(u,1.75,.25));text(demo.labels.ready_now,x,1101,27,C.green,500)})
      }
      line(102,1134,978,1134,'#15121c20',2)
      text(demo.labels.washer,102,1186,27,C.ink,650)
      text(demo.labels.dryer,102,1376,27,C.ink,650)
      for(const type of ['washers','dryers'])demo[type].forEach((item,i)=>{
        if(type==='dryers'&&i===1&&t>=MORPH)return
        const [x,y,w]=tileRect(i,type.slice(0,-1)),q=back(p(u,1.5+i*.07+(type==='dryers'?.12:0),.5),1.4)
        save(()=>{fade(p(u,1.5+i*.07+(type==='dryers'?.12:0),.15));ctx.translate(x+w/2,y+58);ctx.scale(q,q);ctx.translate(-x-w/2,-y-58);miniTile(item,x,y,w,type.slice(0,-1),t,u)})
      })
    })
    // Dorm picker: a slot reel through every dorm in the inventory, settling on the sample dorm.
    const open=io(p(u,.3,.2))*(1-io(p(u,1.16,.18)))
    if(open>0)save(()=>{
      const h=318*open
      rr(66,792,404,h,24,C.ink)
      ctx.beginPath();ctx.rect(66,792,404,h);ctx.clip()
      text(demo.labels.all_dorms,100,846,26,C.muted,500)
      rr(82,958,372,84,16,C.lime)
      const speed=Math.abs(pos-reelPosition(u-1/60))
      const draw=(color)=>{
        for(let i=Math.floor(pos)-3;i<=Math.ceil(pos)+3;i++){
          const y=1000+(i-pos)*84,name=options[((i%options.length)+options.length)%options.length]
          for(let g=speed>.05?3:0;g>=0;g--)save(()=>{fade(g?.18:speed>.05?.75:1);text(name,106,y+13+g*speed*30,34,color,700)})
        }
      }
      save(()=>{ctx.beginPath();ctx.rect(66,874,404,252);ctx.clip();fade(.8);draw(C.paper)})
      save(()=>{ctx.beginPath();ctx.rect(82,958,372,84);ctx.clip();draw(C.ink)})
      const ok=back(p(u,1.04,.3),2.2);if(ok>0)save(()=>{ctx.translate(414,1000);ctx.scale(ok,ok);check(0,0,24)})
      tap(300,1000,u,1.0)
    })
  })
  save(()=>{fade(p(u,1.9,.4)*(1-gone));text('空機數量，一眼掌握。',66,1650,32,C.ink,550);text('明齋實際配置 · 狀態為示意',66,1703,21,'#46344f',500)})
  // Shared-element transition: the dryer tile grows into the next scene's status card.
  if(t>=MORPH){
    const [x,y,w,h]=tileRect(1,'dryer'),q=morph
    rr(lerp(x,66,q),lerp(y,664,q),lerp(w,948,q),lerp(h,843,q),lerp(14,32,q),mix('#e9e0f0',C.ink,out(p(t,MORPH,.35))))
    save(()=>{fade(1-p(t,MORPH,.14));miniTile(demo.dryers[1],x,y,w,'dryer',t,u)})
  }
}

/* 03 — countdown, fast-forward, and the beat drop when the cycle finishes. */
function remaining(t){
  if(t>=DONE)return 0
  const u=t-CUT2
  if(t<FF)return 984-Math.floor(u)+(1-out(clamp((u%1)/.22)))
  return 984*(1-smooth(p(t,FF,DONE-FF)))
}
function countdown(t,x,y,size,color){
  // Odometer digits with a short shutter so the fast-forward reads as motion blur.
  const places=[[600,10],[60,10],null,[10,6],[1,10]]
  ctx.font=`750 ${size}px Inter`
  const w=ctx.measureText('0').width,colon=ctx.measureText(':').width
  let cx=x
  for(const place of places){
    if(!place){text(':',cx,y-size*.06,size,color,750);cx+=colon;continue}
    const [unit,mod]=place,value=s=>{const v=s/unit,whole=Math.floor(v);return (whole%mod)+(unit===1?v-whole:clamp(s-whole*unit-(unit-1)))}
    const samples=[0,1,2,3,4].map(k=>value(remaining(t-k/300)))
    const moving=Math.abs(samples[0]-samples[4])>.4
    if(!moving)rollDigit(samples[0],cx,y,size,color,mod)
    else samples.forEach(v=>save(()=>{fade(.34);rollDigit(v,cx,y,size,color,mod)}))
    cx+=w
  }
}
function legend(u,t){
  const states=[{label:demo.labels.available,note:demo.labels.ready_now,color:C.lime},{label:demo.labels.running,note:'查看倒數',color:C.lilac},{label:demo.labels.pickup,note:'等待取衣',color:C.sand}]
  const bump=t>=DONE?Math.sin(p(t,DONE,.45)*Math.PI)*.08:0
  states.forEach((state,i)=>{
    const q=spring(p(u,.4+i*.1,.75))
    save(()=>{
      ctx.translate(243+i*296,1360);ctx.scale(q*(1+(i===2?bump:0)),q*(1+(i===2?bump:0)))
      rr(-133,-94,267,187,20,state.color)
      if(i===0)check(-94,-51,24);else if(i===1)arc(-94,-51,12,-Math.PI/2+t*3,-Math.PI/2+TAU*.72+t*3,C.ink,3);else{line(-98,-63,-98,-39,C.ink,4);line(-89,-63,-89,-39,C.ink,4)}
      text(state.label,-113,0,38,C.ink,750)
      text(state.note,-113,52,25,C.ink,500)
    })
  })
  // Selection ring follows the machine's live state.
  const slot=lerp(1,2,back(p(t,DONE,.4),1.6)),ring=out(p(u,.9,.4))
  if(ring>0)save(()=>{fade(ring);ctx.lineWidth=5;rr(243+slot*296-143,1360-104,286,208,28,null,C.lime)})
}
function burst(t,x,y){
  const q=t-DONE
  if(q<=0||q>1.3)return
  for(let i=0;i<26;i++)save(()=>{
    const a=i/26*TAU+hash(i)*.4,speed=420+hash(i+3)*620,d=speed*(1-Math.exp(-3.2*q))/3.2
    fade(1-p(q,.35,.8))
    ctx.translate(x+Math.cos(a)*d,y+Math.sin(a)*d+300*q*q);ctx.rotate(a+q*6*(hash(i+5)-.5))
    const s=8+hash(i+7)*12,color=[C.lime,C.paper,C.lilac,C.sand][i%4]
    if(i%3)rr(-s/2,-s*.3,s,s*.6,s*.3,color);else star(0,0,s*.7,q*4,color)
  })
  save(()=>{fade(1-p(q,0,.5));arc(x,y,40+out(p(q,0,.5))*360,0,TAU,C.lime,6*(1-p(q,0,.5))+1)})
}
function detail(t){
  const u=t-CUT2,done=t>=DONE
  base(C.paper);grid(false)
  kinetic('洗・烘狀態',65,421,135,u,.06,C.ink)
  kinetic('一目瞭然。',65,587,144,u,.18,C.purple)
  const hit=done?Math.sin(p(t,DONE,.3)*Math.PI)*.012:0
  save(()=>{
    ctx.translate(540,1085);ctx.scale(1+hit,1+hit);ctx.translate(-540,-1085)
    save(()=>{fade(p(u,0,.4));ctx.shadowColor='#3b1e4d30';ctx.shadowBlur=45;ctx.shadowOffsetY=24;rr(66,664,948,843,32,C.ink)})
    rr(66,664,948,843,32,C.ink)
    const show=(delay,fn)=>{const q=out(p(u,delay,.45));if(q>0)save(()=>{fade(q);ctx.translate(0,26*(1-q));fn()})}
    show(.06,()=>{
      windIcon(113,723,39,C.lilac);text(demo.labels.machine_number.replace('{type}',demo.dorm+' · '+demo.labels.dryer).replace('{number}',demo.dryers[1].number),151,737,32,C.paper,650)
      const flip=p(t,DONE,.3),sy=Math.abs(Math.cos(flip*Math.PI))
      save(()=>{ctx.translate(898,723);ctx.scale(1,Math.max(.02,sy));ctx.translate(-898,-723);flip<.5?pill(demo.labels.running,817,698,163,C.lilac,C.ink,24):pill(demo.labels.pickup,817,698,163,C.sand,C.ink,24)})
      line(102,778,978,778,'#ffffff24',2)
    })
    show(.12,()=>{
      text(done?'烘衣完成，等待取衣':'剩餘時間',109,858,29,done?C.lime:C.muted,500)
      const ff=p(t,FF,DONE-FF)
      if(ff>0&&ff<1)save(()=>{
        fade(p(t,FF,.12)*(1-p(t,DONE-.12,.12)));rr(780,826,198,46,23,'#ffffff18')
        for(let j=0;j<2;j++){ctx.beginPath();ctx.moveTo(806+j*17,836);ctx.lineTo(822+j*17,849);ctx.lineTo(806+j*17,862);ctx.closePath();ctx.fillStyle=C.lime;ctx.fill()}
        text('快轉示意',958,858,22,C.paper,600,'right')
      })
    })
    show(.16,()=>countdown(t,103,1040,170,done?C.lime:C.paper))
    show(.22,()=>{
      const progress=(2400-remaining(t))/2400
      rr(109,1093,860,14,7,'#3b3046');rr(109,1093,860*progress,14,7,done?C.lime:C.lilac)
      circle(109+860*progress,1100,11+Math.sin(p(t,DONE,.3)*Math.PI)*8,C.lime)
      text('掌握進度，再安排時間。',109,1178,32,C.paper,500)
      line(102,1231,978,1231,'#ffffff24',2)
    })
    legend(u,t)
    burst(t,835,1360)
  })
  line(67,1575,1013,1575,'#15121c22',2)
  for(let i=0;i<3;i++)circle(66+((u*.28+i/3)%1)*948,1575,5,C.purple)
  save(()=>{fade(out(p(u,.7,.5)));text('算好時間，再下樓。',66,1650,38,C.ink,650);text('示意倒數 · 實際狀態以即時頁面為準',66,1703,21,'#655a6e',500)})
  // The pickup card opens into the closing frame.
  const iris=io(p(t,CUT3-.44,.44))
  if(iris>0)circle(835,1360,2300*iris,C.purple)
}

/* 04 — machines orbit in and lock into the NTHUMods mark. */
function outro(t){
  const u=t-CUT3
  base(C.purple);orbit(540,850,u,C.paper)
  // A slow push keeps the lockup alive while it holds for reading.
  const push=1+.045*smooth(p(u,.9,2.85))
  ctx.translate(540,1000);ctx.scale(push,push);ctx.translate(-540,-1000)
  save(()=>{fade(p(u,.05,.3));text('為清華生活而打造',540,361,24,C.paper,500,'center')})
  kinetic('少點空等。',540,534,92,u,.1,C.paper,800,'center')
  kinetic('多點生活。',540,649,92,u,.24,C.lime,800,'center')
  const gather=out(p(u,0,.95))
  for(let i=0;i<6;i++)save(()=>{
    fade(1-out(p(u,.6,.5)));const a=i*TAU/6+u*.9,r=lerp(950,90,gather)
    ctx.translate(540+Math.cos(a)*r,931+Math.sin(a)*r);ctx.rotate(-a)
    const size=lerp(165,35,gather);rr(-size/2,-size/2,size,size,size*.2,[C.lilac,C.paper,C.lime][i%3])
    if(i%2)windIcon(0,0,size*.55);else washerIcon(0,0,size*.55)
  })
  const land=p(u,BEAT,.6)
  if(land>0&&land<1)save(()=>{fade(1-land);arc(540,929,170+out(land)*330,0,TAU,C.lime,8*(1-land)+1)})
  save(()=>{
    const q=spring(p(u,.2,1.05));ctx.translate(540,929);ctx.rotate(lerp(-.3,0,out(p(u,.2,1))));ctx.scale(q,q)
    ctx.shadowColor='#31134550';ctx.shadowBlur=45;ctx.shadowOffsetY=26;rr(-160,-160,320,320,70,C.paper);ctx.shadowColor='transparent'
    brandSymbol(-103,-106,218)
  })
  for(const [x,y,r,d] of [[748,742,30,BEAT+.03],[318,1100,20,BEAT+.11],[770,1080,14,BEAT+.17]]){const q=back(p(u,d,.45),2);if(q>0)save(()=>{fade(1-p(u,d+.9,.5)*.6);star(x,y,r*q*(1+.12*Math.sin(u*7+x)),u*1.4,C.lime)})}
  save(()=>{const q=out(p(u,.75,.7));fade(q);ctx.translate(0,38*(1-q));brand(105,1186,870,C.paper)})
  // Lime light sweep across the wordmark on beat 28.
  const sweep=io(p(u,4*BEAT,.7))
  if(sweep>0&&sweep<1)save(()=>{
    ctx.translate(105,1186);ctx.scale(870/168,870/168);ctx.clip(wordmark)
    const x=lerp(-40,210,sweep),g=ctx.createLinearGradient(x-22,0,x+22,0)
    g.addColorStop(0,'#dafa8700');g.addColorStop(.5,C.lime);g.addColorStop(1,'#dafa8700')
    ctx.fillStyle=g;ctx.fillRect(x-22,-40,44,120)
  })
  save(()=>{
    const q=out(p(u,1,.55));fade(q);ctx.translate(0,24*(1-q))
    text('宿舍洗衣機・烘衣機即時狀態',540,1404,34,C.paper,550,'center')
    rr(166,1480,748,98,49,C.ink)
    text('nthumods.com/zh/laundry',508,1543,33,C.paper,550,'center',626)
    const nudge=Math.sin(((u%(2*BEAT))/(2*BEAT))*Math.PI)**4*8
    arrow(863+nudge,1529-nudge,35,C.lime)
  })
}

/* Shared chrome: the HUD crossfades color and chapter label across every cut. */
function hud(t){
  const dark=io(p(t,CUT1-.25,.4))*(1-io(p(t,CUT3-.3,.4)))
  const col=mix(C.paper,C.ink,dark),rule=dark>.5?'#15121c30':'#ffffff30'
  const chapters=[['01','先看狀態'],['02','選擇你的宿舍'],['03','洗衣與烘衣，一起掌握'],['04','讓日常，與你同步']]
  const index=t<CUT1?0:t<CUT2?1:t<CUT3?2:3
  const near=Math.min(...[CUT1,CUT2,CUT3].map(c=>Math.abs(t-c)))
  save(()=>{
    fade(.88);brand(66,79,212,col);text('校園生活，與你同步',1014,108,19,col,500,'right');line(66,144,1014,144,rule)
    save(()=>{fade(clamp(near/.16));text(chapters[index].join(' / '),66,1790,20,col,550)})
    text('清華大學 · 臺灣',1014,1790,18,col,500,'right');line(66,1830,1014,1830,dark>.5?'#15121c25':'#ffffff25',2);line(66,1830,66+948*t/DURATION,1830,col,3)
  })
}
function draw(t){
  t=clamp(t,0,DURATION-1/6000)
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=1;ctx.lineCap='butt';ctx.lineJoin='miter'
  save(()=>{
    if(t<CUT1)intro(t)
    else if(t<CUT2)dashboard(t)
    else if(t<CUT3)detail(t)
    else outro(t)
  })
  hud(t)
  save(()=>{fade(.035);for(let i=0;i<160;i++)circle((i*719)%W,(i*1279)%H,.7,i%2?'#fff':'#000')})
}
window.renderFrame=draw
window.ready=(async()=>{
  await Promise.all([document.fonts.load('850 150px NotoTC','洗衣機'),document.fonts.load('500 30px NotoTC','即時狀態'),document.fonts.load('750 170px Inter')])
  const assets=await Promise.all(['wordmark','demo'].map(async name=>(await fetch(`assets/${name}.json`)).json()))
  wordmark=new Path2D(assets[0]);demo=assets[1]
  draw(2.0);window.motionReady=true
})()
let playing=false,audio,tickId
const button=document.getElementById('play')
button.addEventListener('click',async()=>{
  await window.ready
  if(playing){playing=false;audio.pause();cancelAnimationFrame(tickId);button.textContent='重新播放';return}
  audio ||= new Audio('soundtrack.wav')
  audio.currentTime=0
  try{await audio.play()}catch{button.textContent='音訊載入失敗，點此重試';return}
  playing=true;button.textContent='暫停'
  const tick=()=>{
    if(!playing)return
    draw(audio.currentTime)
    if(audio.ended||audio.currentTime>=DURATION-.005){playing=false;button.textContent='重新播放';draw(DURATION-.01)}
    else tickId=requestAnimationFrame(tick)
  }
  tickId=requestAnimationFrame(tick)
})
