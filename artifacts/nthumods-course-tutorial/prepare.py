from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import json
import shutil

folder = Path(__file__).resolve().parent
repo = folder.parents[1]
assets = folder / 'assets'
assets.mkdir(exist_ok=True)
previous = folder.parent / 'nthumods-motion' / 'assets'
for name in ['wordmark.json', 'InterVariable.woff2', 'NotoSansTC-license.txt']:
    shutil.copyfile(previous / name, assets / name)
data = json.loads((repo / 'apps/web/src/lib/local-search/__fixtures__/courses-11510-full.json').read_text(encoding='utf-8'))
fields = ['raw_id','department','course','class','name_zh','teacher_zh','times','venues','credits']
selected = [{k: course[k] for k in fields} for course in data if course['name_zh'] == '資料結構']
selected.sort(key=lambda course: course['raw_id'])
assert len(selected) == 3
assert selected[0]['raw_id'] == '11510CS  235101'
assert selected[0]['times'] == ['T3T4R3']
(assets / 'courses.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
copy = ''.join((folder / name).read_text(encoding='utf-8') for name in ['tutorial.js','index.html']) + json.dumps(selected,ensure_ascii=False)
chars = {ord(c) for c in copy if ord(c) >= 32} | set(range(32,127))
font = TTFont('C:/Windows/Fonts/NotoSansTC-VF.ttf')
missing = chars - font.getBestCmap().keys()
assert not missing, f'Missing glyphs {missing}'
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
sub = subset.Subsetter(options=options)
sub.populate(unicodes=chars)
sub.subset(font)
font.save(assets / 'NotoSansTC-Tutorial.ttf')
print('Prepared 3 real example courses and',len(chars),'font characters')
