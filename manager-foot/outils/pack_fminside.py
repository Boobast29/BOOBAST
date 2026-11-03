"""Lecture et publication du catalogue FMInside en parties vérifiées."""
import argparse, gzip, hashlib, json
from pathlib import Path
PACKS=Path(__file__).resolve().parent.parent/'packs'

def lire_catalogue(root=PACKS):
    root=Path(root);manifest_path=root/'fminside-fm26.manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else None
    candidates=[]
    for name in ('fminside-fm26.json','fminside-fm26.json.gz'):
        file=root/name
        if not file.exists():continue
        try:
            content=file.read_bytes();data=json.loads(gzip.decompress(content) if name.endswith('.gz') else content)
            candidates.append(data)
        except (OSError,ValueError,EOFError):continue
    if candidates:
        data=max(candidates,key=lambda d:(len(d['players']),d.get('retrievedAt','')))
        if not manifest or len(data['players'])>=manifest['profiles']:return data
    if manifest:
        parts=[]
        for entry in manifest['parts']:
            name=entry['file']
            if Path(name).name!=name:raise ValueError('Chemin de partie invalide')
            content=(root/name).read_bytes()
            if len(content)!=entry['bytes'] or hashlib.sha256(content).hexdigest()!=entry['sha256']:raise ValueError('Partie FMInside corrompue : '+name)
            parts.append(content)
        return json.loads(gzip.decompress(b''.join(parts)))
    return json.loads((root/'fminside-fm26.json').read_text(encoding='utf-8'))

def publier(root=PACKS):
    root=Path(root);data=lire_catalogue(root);raw=gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),mtime=0)
    version=hashlib.sha256(raw).hexdigest()[:12];parts=[]
    for i,offset in enumerate(range(0,len(raw),60000),1):
        name=f'fminside-{version}.{i:03d}.part';content=raw[offset:offset+60000];(root/name).write_bytes(content)
        parts.append({'file':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
    manifest={'version':1,'profiles':len(data['players']),'sourceVersion':'FM26 26.2.0','retrievedAt':data.get('retrievedAt'),'parts':parts}
    (root/'fminside-fm26.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'profiles':manifest['profiles'],'parts':len(parts),'bytes':len(raw)}));return manifest
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--racine',type=Path,default=PACKS);a=ap.parse_args();publier(a.racine)
