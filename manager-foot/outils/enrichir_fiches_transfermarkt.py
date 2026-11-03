"""Enrichit par nom normalisé ET naissance exacte, depuis l'export CC0 daté.
Usage : python outils/enrichir_fiches_transfermarkt.py DOSSIER_CSV_GZ
Aucun statut contractuel n'est inféré des clubs ou contrats de cet export historique.
"""
import csv,gzip,json,unicodedata,re,sys,datetime,collections
from pathlib import Path
from pack_fminside import lire_catalogue,publier,PACKS

def normal(s):
    return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def naissance(s):
    months='January February March April May June July August September October November December'.split()
    try:
        d,m,y=s.split();return f'{int(y):04d}-{months.index(m)+1:02d}-{int(d):02d}'
    except (ValueError,AttributeError):return None
def rows(root,name):
    with gzip.open(root/(name+'.csv.gz'),'rt',encoding='utf-8') as f:yield from csv.DictReader(f)
def enrichir(root):
    data=lire_catalogue();index=collections.defaultdict(list)
    for r in rows(root,'players'):index[(normal(r['name']),r['date_of_birth'][:10])].append(r)
    matched={}
    for p in data['players']:
        found=index.get((normal(p['name']),naissance(p.get('birthDateText'))),[])
        if len(found)!=1:continue
        r=found[0];tm={'id':r['player_id'],'url':r['url'],'snapshotAsOf':'2026-07-06','birthDate':r['date_of_birth'][:10]}
        for src,dst in [('country_of_citizenship','nationality'),('country_of_birth','birthCountry'),('city_of_birth','birthCity'),('foot','foot'),('agent_name','agent'),('image_url','portraitUrl'),('sub_position','position')]:
            if r[src]:tm[dst]=r[src].strip()
        for src,dst in [('height_in_cm','heightCm'),('international_caps','internationalCaps'),('international_goals','internationalGoals'),('market_value_in_eur','marketValueSnapshot'),('highest_market_value_in_eur','peakMarketValueSnapshot')]:
            if r[src]:tm[dst]=int(float(r[src]))
        # Historique descriptif : jamais utilisé comme effectif ou valeur de simulation.
        tm['lastSeasonRecorded']=r['last_season'];tm['appearancesBySeason']={};tm['transfers']=[]
        p['transfermarkt']=tm;matched[r['player_id']]=tm
    for r in rows(root,'appearances'):
        tm=matched.get(r['player_id']);date=r['date']
        if tm is None or date>'2026-06-28':continue
        year=int(date[:4])-(int(date[5:7])<7);season=f'{year}/{str(year+1)[2:]}'
        s=tm['appearancesBySeason'].setdefault(season,dict(matches=0,minutes=0,goals=0,assists=0,yellowCards=0,redCards=0));s['matches']+=1
        for src,dst in [('minutes_played','minutes'),('goals','goals'),('assists','assists'),('yellow_cards','yellowCards'),('red_cards','redCards')]:s[dst]+=int(r[src] or 0)
    for r in rows(root,'transfers'):
        tm=matched.get(r['player_id'])
        if tm is None or r['transfer_date']>'2026-07-06':continue
        tm['transfers'].append({'date':r['transfer_date'],'from':r['from_club_name'],'to':r['to_club_name'],'fee':float(r['transfer_fee']) if r['transfer_fee'] else None})
    for tm in matched.values():tm['transfers']=sorted(tm['transfers'],key=lambda r:r['date'],reverse=True)[:10]
    # Profils publics recoupés séparément : le cache de recherche n'est pas une lecture en direct.
    statuses={'45026':('retired','2025-12-10','rui-patricio'),'129473':('retired','2025-12-22','rafinha'),'42710':('retired','2025-07-01','toby-alderweireld'),'25557':('free','2026-01-01','sergio-ramos')}
    for p in data['players']:
        tm=p.get('transfermarkt',{});status=statuses.get(tm.get('id'))
        if status:
            state,since,slug=status;p['transfermarktStatus']={'status':state,'since':since,'url':f'https://www.transfermarkt.fr/{slug}/profil/spieler/{tm["id"]}','observedAt':'2026-11-03','retrieval':'search-index','freshness':'unknown'}
    data['transfermarktEnrichment']={'matchedProfiles':len(matched),'identityRule':'unique normalized name + exact birth date','dataset':'https://github.com/dcaribou/transfermarkt-datasets','license':'CC0','snapshotAsOf':'2026-07-06','notice':'Historique partiel des compétitions couvertes. Aucun statut actuel déduit des contrats expirés.'}
    payload=json.dumps(data,ensure_ascii=False,indent=2).encode();(PACKS/'fminside-fm26.json').write_bytes(payload);(PACKS/'fminside-fm26.json.gz').write_bytes(gzip.compress(payload,mtime=0));publier()
    print(json.dumps(data['transfermarktEnrichment'],ensure_ascii=False))
    print([(p['name'],p['transfermarktStatus']['status']) for p in data['players'] if p.get('transfermarktStatus')])
if __name__=='__main__':enrichir(Path(sys.argv[1]))
