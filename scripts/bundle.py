"""Export the current game, including local artwork, as an offline HTML file."""
from pathlib import Path
import base64,json,mimetypes,re
root=Path(__file__).resolve().parents[1]
s=(root/'index.html').read_text()
s=re.sub(r'<link\s+rel="stylesheet"\s+href="([^"?]+)(?:\?[^\"]*)?"\s*/?>',lambda m:'<style>'+(root/m[1]).read_text()+'</style>',s)
s=re.sub(r'<script src="([^"?]+)(?:\?[^\"]*)?"></script>',lambda m:'<script>'+(root/m[1]).read_text()+'</script>',s)
paths=set(re.findall(r'assets/[A-Za-z0-9_.-]+\.(?:png|jpg|jpeg|webp|svg)',s))
paths.update(str(p.relative_to(root)) for p in (root/'assets').glob('scene-*-v2.png'))
assets={k:'data:'+mimetypes.guess_type(k)[0]+';base64,'+base64.b64encode((root/k).read_bytes()).decode() for k in paths}
s=s.replace("`url(assets/scene-${mode==='versus'?'garden':scene}-v2.png)`","'url('+window.CARROT_ASSETS['assets/scene-'+(mode==='versus'?'garden':scene)+'-v2.png']+')'")
# JavaScript image sources share the embedded resource table.
s=re.sub(r"(['\"])(assets/[A-Za-z0-9_.-]+\.(?:png|jpg|jpeg|webp|svg))\1",lambda m:'window.CARROT_ASSETS['+json.dumps(m[2])+']',s)
s=re.sub(r'url\((assets/[A-Za-z0-9_.-]+\.(?:png|jpg|jpeg|webp|svg))\)',lambda m:'url('+assets[m[1]]+')',s)
s=s.replace('<head>','<head><script>window.CARROT_ASSETS='+json.dumps(assets,separators=(',',':'))+';</script>',1)
out=root/'output/胡萝卜大盗-最新版-2026-10-27.html'
out.write_text(s)
print(out)
print(f'{out.stat().st_size/1024/1024:.1f} MB')
