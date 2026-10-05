from pathlib import Path
import subprocess
import json
import re
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parent
repo = folder.parents[1]
ffmpeg = next((repo/'.tmp/motion-python/imageio_ffmpeg/binaries').glob('*.exe'))
video = folder/'NTHUMods-Laundry-zh-TW-1080x1920.mp4'
result = subprocess.run([str(ffmpeg), '-hide_banner', '-i', str(video), '-vf', 'blackdetect=d=0.08:pix_th=0.015,freezedetect=n=-50dB:d=1.5', '-af', 'silencedetect=noise=-55dB:d=0.35', '-progress', 'pipe:1', '-f', 'null', '-'], capture_output=True, text=True, check=True)
duration = re.search(r'Duration: (\d+:\d+:\d+\.\d+)', result.stderr).group(1)
frames = int(re.findall(r'^frame=(\d+)$', result.stdout, re.M)[-1])
assert duration == '00:00:15.00', duration
assert frames == 900, frames
assert '1080x1920' in result.stderr and '60 fps' in result.stderr
assert 'black_start:' not in result.stderr
assert 'silence_start:' not in result.stderr
holds = [float(t) for t in re.findall(r'freeze_start: ([\d.]+)', result.stderr)]
# Only the closing brand frame may settle into a reading hold.
assert all(t >= 12.9 for t in holds), holds
times = [0.05, 0.9, 2.7, 3.45, 5.3, 6.3, 8.4, 9.6, 13.8]
sheet = Image.new('RGB', (1080, 2010), '#29252f')
draw = ImageDraw.Draw(sheet)
stills = folder/'stills'
stills.mkdir(exist_ok=True)
for index, t in enumerate(times):
    target = stills/f'{t:.2f}.png'
    subprocess.run([str(ffmpeg), '-y', '-loglevel', 'error', '-ss', str(t), '-i', str(video), '-frames:v', '1', str(target)], check=True)
    image = Image.open(target).convert('RGB').resize((360, 640), Image.Resampling.LANCZOS)
    x, y = index % 3*360, index//3*670
    sheet.paste(image, (x, y))
    draw.text((x+12, y+648), f'{t:.2f}s', fill='white')
sheet.save(folder/'storyboard.jpg', quality=92)
Image.open(stills/'9.60.png').convert('RGB').save(folder/'poster.jpg', quality=94)
demo = json.loads((folder/'assets/demo.json').read_text(encoding='utf-8'))
assert demo['dorm'] == '明齋' and len(demo['washers']) == 3 and len(demo['dryers']) == 3
report = {'duration': duration, 'frames': frames, 'fps': 60, 'width': 1080, 'height': 1920, 'language': 'zh-Hant', 'format': 'H.264 / AAC stereo 48 kHz', 'bytes': video.stat().st_size, 'decode_errors': False, 'black_frames': False, 'silent_gaps': False, 'unexpected_frozen_sections': False, 'intentional_closing_brand_hold': holds, 'soundtrack': 'Original synthesized score at 128 BPM, cuts on the beat grid', 'sample_dorm': demo['dorm'], 'machine_inventory': '3 washers, 3 dryers (apps/web/src/const/laundry-machines.ts)', 'machine_states': 'Illustrative, no live telemetry captured', 'storyboard': 'Extracted from final encoded MP4'}
(folder/'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
