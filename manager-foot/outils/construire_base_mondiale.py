"""Construit les pays/compétitions/effectifs depuis le pack FMB versionné et FMInside.
Les attributs absents restent absents ; les estimations jouables sont faites explicitement côté jeu.
"""
from pack_fminside import lire_catalogue
import collections, gzip, hashlib, io, json, pathlib, zipfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
PACKS = ROOT/'packs'

def construire():
    manifest = json.loads((PACKS/'football-monde-fmb.json').read_text(encoding='utf-8'))
    content = b''.join((PACKS/p['file']).read_bytes() for p in manifest['parts'])
    if hashlib.sha256(content).hexdigest() != manifest['sha256']: raise ValueError('Pack FMB corrompu')
    with zipfile.ZipFile(io.BytesIO(content)) as z:
        name = next(n for n in z.namelist() if n.endswith('catalogue_fmb_v15.json'))
        data = json.loads(z.read(name))
    fmi = {str(p['fmUid']):p for p in lire_catalogue(PACKS)['players']}
    details = {(p['entity_type'],str(p['fm_uid'])):p for p in data['detailed_profiles']}
    clubs = {str(c['fm_uid']):c for c in data['clubs']}
    memberships = collections.defaultdict(list)
    for m in data['memberships']:
        if str(m['owner_club_fm_uid']) in clubs: memberships[(m['entity_type'],str(m['person_fm_uid']))].append(m)
    people = collections.defaultdict(list); ambiguities = 0
    for p in data['people']:
        uid = str(p['fm_uid']); key = (p['entity_type'],uid)
        ms = memberships[key]
        if not ms: continue
        d = details.get(key,{})
        preferred = str((d.get('club_source') or {}).get('fm_uid',''))
        def rank(m):
            return (str(m['owner_club_fm_uid']) == preferred, m.get('squad_label_source','').startswith('First team'))
        best = max(map(rank,ms)); candidates = {str(m['owner_club_fm_uid']) for m in ms if rank(m)==best}
        if len(candidates)!=1: ambiguities+=1; continue
        owner = candidates.pop(); membership = next(m for m in ms if str(m['owner_club_fm_uid'])==owner)
        fields = membership.get('fields_source') or (p.get('observations') or [{}])[0].get('fields_source',{})
        attrs = {a.get('label_source',k):a['value'] for group in d.get('attributes_1_99',{}).values() for k,a in group.items() if isinstance(a.get('value'),(int,float))}
        def number(v):
            try:return int(v)
            except (ValueError,TypeError):return None
        x = {'fmUid':uid,'name':p['name'],'positions':fields.get('position') or fields.get('job') or d.get('role_or_position_source'),
             'age':number(fields.get('age')),'rating':number(fields.get('abi')),'potential':number(fields.get('pot')),
             'squad':membership.get('squad_label_source'),'sourceUrl':p.get('profile_url'),'sourceDatabase':'FM26 FMB 26.3.2',
             'attributes':attrs or None, 'sourceGender':'male'}
        if key[0]=='players' and uid in fmi:
            x.update({k:v for k,v in fmi[uid].items() if v is not None});x['attributes']=fmi[uid]['attributes'];x['sourceGender']='male'
        if key[0]=='staff': x['role']=fields.get('job') or d.get('role_or_position_source')
        people[(owner,key[0])].append(x)
    country_names={'England':'Angleterre','France':'France','Germany':'Allemagne','Italy':'Italie','Spain':'Espagne'}
    index={'version':1,'source':'Pack FMB v15 + fiches FMInside FM26','countries':[], 'ambiguousMembershipsExcluded':ambiguities,
           'notice':'Affectations selon instantané FM26, non vérifiées en temps réel. Les notes manquantes sont estimées pour la simulation et signalées. Budgets et stades inconnus utilisent les valeurs du moteur.'}
    for country in country_names:
        comps = [c for c in data['competitions'] if c['country']==country]
        ids = {str(c['fm_uid']) for c in data['clubs'] if any(r['country']==country for r in c['competition_refs'])}
        out={'country':country,'label':country_names[country], 'competitions':[{'fmUid':str(c['fm_uid']),'name':c['name'],'tier':c['requested_tier'],'clubs':[str(r['fm_uid']) for r in c['club_refs']]} for c in comps], 'clubs':[]}
        # Certains liens de D3 italienne renvoient au club parent de D1,
        # sans UID propre à la réserve : ne pas faire jouer le même club deux fois.
        assigned=set(); out['unresolvedReserveTeams']=[]
        for competition in sorted(out['competitions'],key=lambda c:c['tier']):
            clean=[]
            for uid in competition['clubs']:
                if uid in assigned:
                    out['unresolvedReserveTeams'].append({'parentClubUid':uid,'competitionUid':competition['fmUid']})
                else: clean.append(uid);assigned.add(uid)
            competition['clubs']=clean
        for uid in sorted(ids):
            c=clubs[uid]
            out['clubs'].append({'fmUid':uid,'name':c['name'],'players':people[(uid,'players')], 'staff':people[(uid,'staff')],
                                 'logo':c.get('logo',{}).get('url'),'sourceUrl':c.get('source_url')})
        raw=json.dumps(out,ensure_ascii=False,separators=(',',':')).encode()
        dest=PACKS/('monde-'+country.lower()+'.json.gz');dest.write_bytes(gzip.compress(raw,mtime=0))
        ps=[p for c in out['clubs'] for p in c['players']]
        index['countries'].append({'key':country,'label':country_names[country],'file':dest.name,'clubs':len(out['clubs']), 'competitions':len(comps),'players':len(ps),'staff':sum(len(c['staff']) for c in out['clubs']), 'detailedPlayers':sum(bool(p['attributes']) for p in ps),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    index['totals']={k:sum(c[k] for c in index['countries']) for k in ('clubs','competitions','players','staff','detailedPlayers')}
    (PACKS/'monde-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    print(json.dumps(index['totals'],ensure_ascii=False))
if __name__=='__main__':construire()
