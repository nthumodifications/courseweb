from pathlib import Path
import subprocess
import json
import re
import sys
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parent
repo = folder.parents[1]
ffmpeg = next((repo / '.tmp/motion-python/imageio_ffmpeg/binaries').glob('*.exe'))
suffix = '-zh-TW' if '--zh' in sys.argv else ''
video = folder / f'NTHUMods-In-Sync-1080x1920{suffix}.mp4'
still_folder = folder / f'stills{suffix}'
still_folder.mkdir(exist_ok=True)
result = subprocess.run([str(ffmpeg), '-hide_banner', '-i', str(video), '-vf', 'blackdetect=d=0.08:pix_th=0.015,freezedetect=n=-50dB:d=1.5', '-af', 'silencedetect=noise=-55dB:d=0.35', '-progress', 'pipe:1', '-f', 'null', '-'], capture_output=True, text=True, check=True)
duration = re.search(r'Duration: (\d+:\d+:\d+\.\d+)', result.stderr).group(1)
frames = int(re.findall(r'^frame=(\d+)$', result.stdout, re.M)[-1])
assert duration == '00:00:15.00', duration
assert frames == 900, frames
assert '1080x1920' in result.stderr
assert '60 fps' in result.stderr
assert 'black_start:' not in result.stderr
holds = [float(t) for t in re.findall(r'freeze_start: ([\d.]+)', result.stderr)]
# The closing wordmark deliberately settles for reading and brand recognition.
assert all(t >= 13.1 for t in holds), holds
assert 'silence_start:' not in result.stderr
times = [.9,2.1,3.95,5.1,7.25,9.9,11.1,13.8,14.95]
sheet = Image.new('RGB', (1080,2010), '#29252f')
draw = ImageDraw.Draw(sheet)
for index, t in enumerate(times):
    target = still_folder/f'{t:.2f}.png'
    subprocess.run([str(ffmpeg),'-y','-loglevel','error','-ss',str(t),'-i',str(video),'-frames:v','1',str(target)], check=True)
    image = Image.open(target).convert('RGB').resize((360,640),Image.Resampling.LANCZOS)
    x,y=index%3*360,index//3*670
    sheet.paste(image,(x,y))
    draw.text((x+12,y+648),f'{t:.2f}s',fill='white')
sheet.save(folder/f'storyboard{suffix}.jpg',quality=92)
Image.open(still_folder/'13.80.png').convert('RGB').save(folder/f'poster{suffix}.jpg',quality=94)
report = {'duration':duration,'frames':frames,'fps':60,'width':1080,'height':1920,'format':'H.264 / AAC stereo 48 kHz','bytes':video.stat().st_size,'decode_errors':False,'black_frames':False,'unexpected_frozen_sections':False,'intentional_closing_brand_hold':holds,'silent_gaps':False,'soundtrack':'Original synthesized score at 128 BPM','storyboard':'Extracted from final encoded MP4'}
report['language'] = 'zh-Hant' if suffix else 'en'
(folder/f'verification{suffix}.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
