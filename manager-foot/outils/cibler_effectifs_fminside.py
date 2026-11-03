"""Prépare une collecte FMInside limitée aux joueurs des clubs de la base du jeu.
Usage : python outils/cibler_effectifs_fminside.py --limite 1200 --sortie packs/cibles-effectifs.json
--limite 0 sélectionne toutes les fiches manquantes ; les équipes premières sont prioritaires.
"""
import argparse, collections, gzip, json, re
from pathlib import Path
from pack_fminside import lire_catalogue
PACKS=Path(__file__).resolve().parent.parent/'packs'

def selectionner(limite=1200, inclure_reserves=False):
    known={str(p['fmUid']) for p in lire_catalogue(PACKS)['players']}
    queues=[];metadata={}
    for file in sorted(PACKS.glob('monde-*.json.gz')):
        world=json.loads(gzip.decompress(file.read_bytes()));clubs={str(c['fmUid']):c for c in world['clubs']}
        for comp in world['competitions']:
            par_club=[]
            for uid in comp['clubs']:
                club=clubs[str(uid)];candidats=[]
                for p in club['players']:
                    ident=str(p['fmUid'])
                    if ident in known or len(p.get('attributes') or {})>=30:continue
                    if not inclure_reserves and not str(p.get('squad','')).startswith('First team'):continue
                    m=re.search(r'/players/(\d+-[^/?]+)',p.get('sourceUrl') or '')
                    if not m:continue
                    candidats.append(p)
                    metadata[ident]={'fmUid':ident,'name':p['name'],'club':club['name'],'clubUid':str(club['fmUid']),'country':world['country'],'competition':comp['name'],'url':'https://fminside.net/players/7-fm-26/'+m[1]}
                candidats.sort(key=lambda p:(not str(p.get('squad','')).startswith('First team'),-(p.get('rating') or 0)));par_club.append(candidats)
            ordered=[]
            for i in range(max(map(len,par_club),default=0)):
                for ps in par_club:
                    if i<len(ps):ordered.append(str(ps[i]['fmUid']))
            queues.append(ordered)
    selected=[];seen=set()
    for i in range(max(map(len,queues),default=0)):
        for queue in queues:
            if i<len(queue) and queue[i] not in seen:
                ident=queue[i];selected.append(metadata[ident]);seen.add(ident)
            if limite>0 and len(selected)>=limite:return selected
    return selected

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--limite',type=int,default=1200);ap.add_argument('--sortie',required=True);ap.add_argument('--reserves',action='store_true');a=ap.parse_args()
    if a.limite<0:ap.error('--limite doit être positif ou nul')
    rows=selectionner(a.limite,a.reserves);out=Path(a.sortie);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps([p['url'] for p in rows],ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    out.with_suffix('.mapping.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'targets':len(rows),'countries':dict(collections.Counter(p['country'] for p in rows))},ensure_ascii=False))
if __name__=='__main__':main()
