"""Lecture vérifiée du complément public FMB, indépendant du catalogue FMInside."""
import gzip,hashlib,json
from pathlib import Path
from pack_fminside import PACKS

def lire_fmblog(root=PACKS):
    root=Path(root);path=root/'fmblog-fm26.manifest.json'
    if not path.exists():return {'players':[]}
    manifest=json.loads(path.read_text());parts=[]
    for p in manifest['parts']:
        if Path(p['file']).name!=p['file']:raise ValueError('Chemin de partie FMB invalide')
        b=(root/p['file']).read_bytes()
        if len(b)!=p['bytes'] or hashlib.sha256(b).hexdigest()!=p['sha256']:raise ValueError('Partie FMB corrompue')
        parts.append(b)
    data=json.loads(gzip.decompress(b''.join(parts)))
    if len(data['players'])!=manifest['profiles']:raise ValueError('Nombre de fiches FMB incohérent')
    return data
