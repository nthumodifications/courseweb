from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import json

folder = Path(__file__).resolve().parent
source = folder / 'motion-zh.js'
locale = source.read_text(encoding='utf-8')
html = (folder / 'zh.html').read_text(encoding='utf-8')
font = TTFont('C:/Windows/Fonts/NotoSansTC-VF.ttf')
characters = set(locale + html)
requested = {ord(c) for c in characters if ord(c) >= 32}
requested.update(range(32,127))
missing = requested - font.getBestCmap().keys()
assert not missing, f'Missing glyphs: {sorted(missing)}'
metadata = []
for number in [0, 8, 9, 13, 14]:
    for record in font['name'].names:
        if record.nameID == number:
            value = record.toUnicode()
            if value not in metadata:
                metadata.append(value)
(folder / 'assets/NotoSansTC-license.txt').write_text('\n\n'.join(metadata), encoding='utf-8')
options = subset.Options()
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=requested)
subsetter.subset(font)
output = folder / 'assets/NotoSansTC-Motion.ttf'
font.save(output)
print(json.dumps({'font': output.name, 'bytes': output.stat().st_size, 'glyph_coverage': 'complete', 'characters': len(requested)}))
