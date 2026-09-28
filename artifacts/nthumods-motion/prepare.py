from pathlib import Path
import json
import re
import shutil

root = Path(__file__).resolve().parents[2]
assets = Path(__file__).resolve().parent / 'assets'
assets.mkdir(parents=True, exist_ok=True)
shutil.copyfile(root / 'apps/web/public/fonts/InterVariable.woff2', assets / 'InterVariable.woff2')
data = json.loads((root / 'apps/web/public/data/nthu-main-campus.json').read_text(encoding='utf-8'))
(assets / 'campus.json').write_text(json.dumps({k: data[k] for k in ['buildings', 'roads', 'water', 'origin']}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
source = (root / 'apps/web/src/components/Branding/FullLogo.tsx').read_text(encoding='utf-8')
path = re.search(r'\bd="([^"]+)"', source).group(1)
(assets / 'wordmark.json').write_text(json.dumps(path), encoding='utf-8')
print('Campus assets prepared', len(data['buildings']), 'buildings')
print('Road and water assets copied from the project')
