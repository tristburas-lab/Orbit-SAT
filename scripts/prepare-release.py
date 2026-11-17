"""Package the portable source and version the offline cache; no third-party packages."""
from pathlib import Path
import hashlib
import re
import zipfile

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
(dist / 'README_FOR_MIT.md').write_text((root / 'README_FOR_MIT.md').read_text())
for route in ['plan', 'tutor', 'guide', 'go']:
    folder = dist / route
    folder.mkdir(exist_ok=True)
    (folder / 'index.html').write_text((dist / 'index.html').read_text())
digest = hashlib.sha256()
for path in sorted(dist.rglob('*')):
    if not path.is_file() or path.name == 'orbit-source.zip':
        continue
    data = path.read_bytes()
    if path.name == 'sw.js':
        data = re.sub(rb"const CACHE='[^']+'", b"const CACHE='VERSION'", data)
    digest.update(str(path.relative_to(dist)).encode())
    digest.update(data)
cache_name = 'orbit-static-v1-' + digest.hexdigest()[:12]
sw = dist / 'sw.js'
sw.write_text(re.sub(r"const CACHE='[^']+'", "const CACHE='" + cache_name + "'", sw.read_text()))

archive = dist / 'orbit-source.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for path in sorted(root.rglob('*')):
        if not path.is_file() or path == archive:
            continue
        relative = path.relative_to(root)
        if any(part in {'.git', '.openai', 'node_modules', '__pycache__'} for part in relative.parts):
            continue
        if path.name.startswith('.env') or path.suffix in {'.tar', '.gz'}:
            continue
        bundle.write(path, 'orbit-sat/' + str(relative))
print(f'Release ready: {cache_name}; portable source {archive.stat().st_size:,} bytes.')
