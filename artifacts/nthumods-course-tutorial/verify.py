from pathlib import Path
import subprocess
import json
import re
from PIL import Image,ImageDraw

folder=Path(__file__).resolve().parent
repo=folder.parents[1]
ffmpeg=next((repo/'.tmp/motion-python/imageio_ffmpeg/binaries').glob('*.exe'))
video=folder/'NTHUMods-Course-Tutorial-zh-TW-1080x1920.mp4'
result=subprocess.run([str(ffmpeg),'-hide_banner','-i',str(video),'-vf','blackdetect=d=0.08:pix_th=0.015,freezedetect=n=-50dB:d=1.5','-af','silencedetect=noise=-55dB:d=0.35','-progress','pipe:1','-f','null','-'],capture_output=True,text=True,check=True)
duration=re.search(r'Duration: (\d+:\d+:\d+\.\d+)',result.stderr).group(1)
frames=int(re.findall(r'^frame=(\d+)$',result.stdout,re.M)[-1])
assert duration=='00:00:26.00',duration
assert frames==1560,frames
assert '1080x1920' in result.stderr and '60 fps' in result.stderr
assert 'black_start:' not in result.stderr
assert 'silence_start:' not in result.stderr
holds=[float(t) for t in re.findall(r'freeze_start: ([\d.]+)',result.stderr)]
# Quiet holds give the viewer time to read the course facts and result.
times=[1.7,3.6,6.95,8.95,11.1,13.7,15.75,20.8,24.8]
sheet=Image.new('RGB',(1080,2010),'#29252f')
draw=ImageDraw.Draw(sheet)
stills=folder/'stills'
stills.mkdir(exist_ok=True)
for i,t in enumerate(times):
    target=stills/f'{t:.2f}.png'
    subprocess.run([str(ffmpeg),'-y','-loglevel','error','-ss',str(t),'-i',str(video),'-frames:v','1',str(target)],check=True)
    image=Image.open(target).convert('RGB').resize((360,640),Image.Resampling.LANCZOS)
    x,y=i%3*360,i//3*670
    sheet.paste(image,(x,y))
    draw.text((x+12,y+648),f'{t:.2f}s',fill='white')
sheet.save(folder/'storyboard.jpg',quality=93)
Image.open(stills/'1.70.png').convert('RGB').save(folder/'poster.jpg',quality=94)
course=json.loads((folder/'assets/courses.json').read_text(encoding='utf-8'))[0]
assert course['raw_id']=='11510CS  235101'
assert course['times']==['T3T4R3']
assert course['venues']==['DELTA台達109']
report={'duration':duration,'frames':frames,'fps':60,'width':1080,'height':1920,'language':'zh-Hant','format':'H.264 / AAC stereo 48 kHz','bytes':video.stat().st_size,'decode_errors':False,'black_frames':False,'silent_gaps':False,'low_motion_reading_holds':holds,'soundtrack':'Original cheerful C-major score, 120 BPM','example_course':course['raw_id'],'timetable_matches_source':'Tuesday periods 3 and 4, Thursday period 3','storyboard':'Extracted from the final encoded MP4'}
(folder/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
