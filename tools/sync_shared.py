"""Inline tools/landscape-shared.js into the single-file app (between the SHARED markers).
Same file, same code in registry-app.html and pattern-bench.html. Usage: python3 tools/sync_shared.py <app.html>"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'tools', 'landscape-shared.js'), encoding='utf-8').read().strip()
app = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'registry-app.html')
html = open(app, encoding='utf-8').read()
start, end = '/* === SHARED landscape helpers', '/* === END SHARED landscape helpers === */'
block = '<script id="landscape-shared">\n' + src + '\n</script>'
pat = re.compile(r'<script id="landscape-shared">.*?' + re.escape(end) + r'\s*</script>', re.S)
if pat.search(html): html = pat.sub(lambda m: block, html)
else:
    i = html.index('<script>\n"use strict";') if '<script>\n"use strict";' in html else html.index('<script>\n(function(){')
    html = html[:i] + block + '\n' + html[i:]
open(app, 'w', encoding='utf-8').write(html)
print('synced shared helpers into', app)
