const fs = require('node:fs/promises')
const path = require('node:path')
const http = require('node:http')
const {spawn} = require('node:child_process')
const {once} = require('node:events')
const ROOT=__dirname, REPO=path.resolve(ROOT,'../..')
const stills=process.argv.includes('--stills')
const zh=process.argv.includes('--zh')
const suffix=zh?'-zh-TW':''
const PORT=5188,CDP=9333
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
    const file=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname))
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
    const content=await fs.readFile(file)
    const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.wav':'audio/wav'}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'})
    res.end(content)
  }catch{res.writeHead(404).end()}
})
async function main(){
  await new Promise(resolve=>server.listen(PORT,'127.0.0.1',resolve))
  const chrome=path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1223/chrome-win64/chrome.exe')
  const proc=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling',`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(REPO,'.tmp/motion-chrome')}`,'about:blank'],{windowsHide:true,stdio:'ignore'})
  let ws,encoder,log='',browserVersion
  try{
    for(let i=0;i<60;i++){try{browserVersion=await(await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();break}catch{await delay(250)}}
     if(!browserVersion)throw new Error('Chrome did not start')
    const pages=await(await fetch(`http://127.0.0.1:${CDP}/json`)).json()
    ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
    await once(ws,'open')
    let seq=0
    const pending=new Map()
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
     ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')console.error(m.params.exceptionDetails.exception?.description)})
     const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails){throw new Error(r.exceptionDetails.exception?.description)}return r.result.value}
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride',{width:1080,height:1920,deviceScaleFactor:1,mobile:false})
    await send('Page.navigate',{url:`http://127.0.0.1:${PORT}/${zh?'zh.html':''}`})
     for(let i=0;i<100;i++){if(await evaluate('!!window.motionReady')){break}await delay(150)}
     if(!await evaluate('!!window.motionReady'))throw new Error('Artwork did not load')
    const frame=async t=>Buffer.from(await evaluate(`(window.renderFrame(${t}),document.getElementById('film').toDataURL('image/png').split(',')[1])`),'base64')
    const stillFolder=path.join(ROOT,'stills'+suffix)
    await fs.mkdir(stillFolder,{recursive:true})
    if(stills){
      for(const t of [0.9,2.1,3.95,5.1,7.25,9.9,11.1,13.8,14.95]){
        await fs.writeFile(path.join(stillFolder,`${t.toFixed(2)}.png`),await frame(t))
        console.log('Still',t)
      }
    }else{
      const binaries=path.join(REPO,'.tmp/motion-python/imageio_ffmpeg/binaries')
      const ffmpeg=path.join(binaries,(await fs.readdir(binaries)).find(f=>f.endsWith('.exe')))
      const dest=path.join(ROOT,`NTHUMods-In-Sync-1080x1920${suffix}.mp4`)
      encoder=spawn(ffmpeg,['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-framerate','60','-vcodec','png','-i','pipe:0','-i',path.join(ROOT,'soundtrack.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-level','4.2','-c:a','aac','-b:a','192k','-ar','48000','-t','15','-movflags','+faststart','-metadata','title=NTHUMods - In Sync','-metadata','comment=Original motion study. Map data: OpenStreetMap contributors.',dest],{windowsHide:true,stdio:['pipe','ignore','pipe']})
      encoder.stderr.on('data',d=>{log+=d.toString()})
      const done=once(encoder,'close')
      encoder.stdin.on('error',e=>console.error('Encoder input',e.message))
      for(let i=0;i<900;i++){
        const png=await frame(i/60)
        if(!encoder.stdin.write(png))await once(encoder.stdin,'drain')
        if(i%60===0)console.log(`Rendered ${i}/900 frames`)
      }
      encoder.stdin.end()
      const [code]=await done
       if(code!==0)throw new Error('Encoding failed '+log)
      console.log('Finished',dest)
      console.log('Bytes',(await fs.stat(dest)).size)
      if(log)console.log(log)
    }
    try{await send('Browser.close')}catch{}
  }finally{
    ws?.close()
    proc.kill()
    server.close()
  }
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1})
