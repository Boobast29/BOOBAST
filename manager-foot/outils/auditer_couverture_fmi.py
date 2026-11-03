"""Vérifie le complément FMInside et actualise les compteurs de couverture par UID.
Ne modifie ni les effectifs ni les fichiers des pays ; le complément est appliqué au chargement.
"""
import argparse, collections, datetime, gzip, json
from pathlib import Path
from pack_fminside import lire_catalogue
PACKS=Path(__file__).resolve().parent.parent/'packs'
def audit(baseline=None):
    data=lire_catalogue(PACKS)
    players=data['players'];uids=[str(p['fmUid']) for p in players]
    if len(uids)!=len(set(uids)):raise ValueError('Doublon UID dans le complément')
    for p in players:
        if len(p.get('attributes',{}))<30 or not all(isinstance(v,(int,float)) and 1<=v<=99 for v in p['attributes'].values()):
            raise ValueError('Attributs incomplets ou hors échelle : '+p['name'])
        if p['sourceDatabase']!='26.2.0':raise ValueError('Mélange de versions FMInside')
    known=set(uids);index=json.loads((PACKS/'monde-index.json').read_text(encoding='utf-8'))
    countries=[];owners={}
    for country in index['countries']:
        world=json.loads(gzip.decompress((PACKS/country['file']).read_bytes()))
        ps=[p for club in world['clubs'] for p in club['players']]
        for club in world['clubs']:
            comp=next((c for c in world['competitions'] if str(club['fmUid']) in {str(uid) for uid in c['clubs']}),{})
            for player in club['players']:owners[str(player['fmUid'])]={'clubUid':str(club['fmUid']),'country':country['key'],'competition':comp.get('name','Non classé')}
        documented=sum(bool(p.get('attributes')) or str(p['fmUid']) in known for p in ps)
        country['detailedPlayers']=documented
        countries.append({'country':country['key'],'label':country['label'],'players':len(ps),'documentedPlayers':documented})
    index['totals']['detailedPlayers']=sum(c['documentedPlayers'] for c in countries)
    index['fmInsideProfiles']=len(players);index['attributesOverlay']='fminside-fm26.json.gz'
    report={'auditedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'fmInsideProfiles':len(players),
            'attributesPerProfile':dict(collections.Counter(len(p['attributes']) for p in players)),
            'uniqueUids':len(known),'documentedPlayersInGame':index['totals']['detailedPlayers'],
            'countries':countries,'collectionErrors':data.get('errors',[]),
            'note':'Données du jeu FM26, situation réelle actuelle non vérifiée. Les profils hors effectifs connus ne sont pas affectés arbitrairement.'}
    if baseline:
        before=set(json.loads(Path(baseline).read_text(encoding='utf-8')))
        added=[p for p in players if str(p['fmUid']) not in before]
        if any(str(p['fmUid']) not in owners for p in added):raise ValueError('Une nouvelle fiche ne correspond pas aux effectifs du jeu')
        report['targeting']={'newProfilesInGame':len(added),'allNewProfilesInGame':True,'enrichedClubs':len({owners[str(p['fmUid'])]['clubUid'] for p in added}),'countries':dict(collections.Counter(owners[str(p['fmUid'])]['country'] for p in added)),'competitions':dict(collections.Counter(owners[str(p['fmUid'])]['competition'] for p in added))}
    (PACKS/'monde-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    (PACKS/'couverture-attributs.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--baseline',help='Liste des UID présents avant le lot ciblé');a=ap.parse_args();audit(a.baseline)
