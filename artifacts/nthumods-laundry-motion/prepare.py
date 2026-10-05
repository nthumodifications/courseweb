"""Prepare project branding and a clearly illustrative, source-checked laundry scene."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import hashlib
import json
import re
import shutil

folder = Path(__file__).resolve().parent
repo = folder.parents[1]
assets = folder / 'assets'
assets.mkdir(exist_ok=True)
shutil.copyfile(repo / 'apps/web/public/fonts/InterVariable.woff2', assets / 'InterVariable.woff2')
logo = (repo / 'apps/web/src/components/Branding/FullLogo.tsx').read_text(encoding='utf-8')
(assets / 'wordmark.json').write_text(json.dumps(re.search(r'\bd="([^"]+)"', logo).group(1)), encoding='utf-8')
shutil.copyfile(folder.parent / 'nthumods-motion/assets/NotoSansTC-license.txt', assets / 'NotoSansTC-license.txt')

machine_path = repo / 'apps/web/src/const/laundry-machines.ts'
source = machine_path.read_text(encoding='utf-8')
area = re.search(r'area: "明齋",\s*dorm: "明齋",.*?washers: \[(.*?)\],\s*dryers: \[(.*?)\]', source, re.S)
assert area, 'The sample dorm no longer exists'
counts = [len(re.findall(r'"[a-f0-9]{12}"', group)) for group in area.groups()]
assert counts == [3, 3], f'Update storyboard to match the new machine inventory {counts}'
dorm_block = re.search(r'LAUNDRY_DORMS = \{(.*?)\} as const', source, re.S).group(1)
dorms = re.findall(r'zh: "([^"]+)"', dorm_block)
assert dorms[1] == '明齋' and len(dorms) == 13, dorms
dictionary = json.loads((repo / 'apps/web/src/dictionaries/zh.json').read_text(encoding='utf-8'))['laundry']
demo = {
    'dorm': '明齋',
    'dorms': dorms,
    'illustrative': True,
    'description': 'Actual dorm inventory, illustrative states. No live telemetry captured.',
    'washers': [{'number': 1, 'state': 'available'}, {'number': 2, 'state': 'running', 'seconds': 708}, {'number': 3, 'state': 'available'}],
    'dryers': [{'number': 1, 'state': 'available'}, {'number': 2, 'state': 'running', 'seconds': 984, 'totalSeconds': 2400}, {'number': 3, 'state': 'pickup'}],
    'labels': {key: dictionary[key] for key in ['washer', 'dryer', 'available', 'running', 'pickup', 'ready_now', 'connection_live', 'all', 'all_dorms', 'gender_all', 'machine_number']},
    'inventory_source': 'apps/web/src/const/laundry-machines.ts',
    'inventory_sha256': hashlib.sha256(machine_path.read_bytes()).hexdigest(),
    'ui_source': 'apps/web/src/app/[lang]/(mods-pages)/laundry/page.tsx',
    'route': '/zh/laundry',
}
(assets / 'demo.json').write_text(json.dumps(demo, ensure_ascii=False, indent=2), encoding='utf-8')
copy = (folder / 'motion.js').read_text(encoding='utf-8') + (folder / 'index.html').read_text(encoding='utf-8') + json.dumps(demo, ensure_ascii=False)
chars = {ord(c) for c in copy if ord(c) >= 32} | set(range(32, 127))
font = TTFont('C:/Windows/Fonts/NotoSansTC-VF.ttf')
assert not chars - font.getBestCmap().keys(), 'Missing Chinese font glyphs'
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
sub = subset.Subsetter(options=options)
sub.populate(unicodes=chars)
sub.subset(font)
font.save(assets / 'NotoSansTC-Laundry.ttf')
print(f'Prepared Ming dorm: {counts[0]} washers, {counts[1]} dryers, {len(chars)} glyphs')
