import collections,gzip,hashlib,json,pathlib,zipfile
import argparse
ROOT=pathlib.Path(__file__).resolve().parents[1]/'packs'
ap=argparse.ArgumentParser(description='Ajoute les équipes affiliées omises du monde FM sans doublon UID.');ap.add_argument('source_zip');ap.add_argument('--rapport');args=ap.parse_args()
z=zipfile.ZipFile(args.source_zip);data=json.loads(z.read('Football_Monde/extension_fmb_v15/catalogue_fmb_v15.json'))
idx=json.loads((ROOT/'monde-index.json').read_text());worlds={v['key']:json.loads(gzip.decompress((ROOT/v['file']).read_bytes())) for v in idx['countries']};known={str(p['fmUid']) for w in worlds.values() for c in w['clubs'] for p in c['players']};clubs={str(c['fmUid']):(w,c) for w in worlds.values() for c in w['clubs']};people={str(p['fm_uid']):p for p in data['people'] if p['entity_type']=='players'};parents=collections.defaultdict(set)
for r in data['referenced_linked_clubs']:
 if str(r['source_parent_club_fm_uid']) in clubs:parents[str(r['fm_uid'])].add(str(r['source_parent_club_fm_uid']))
members=collections.defaultdict(list)
for m in data['memberships']:
 if m['entity_type']=='players' and str(m['person_fm_uid']) not in known and len(parents[str(m['owner_club_fm_uid'])])==1:members[str(m['person_fm_uid'])].append(m)
report={'players_added':0,'by_country':collections.Counter(),'ambiguous_affiliations':[],'note':'Équipes affiliées conservées en réserve du club de rattachement, avec UID et affectation source. Aucune inscription en équipe première déduite.'}
def number(v):
 try:return int(v)
 except (TypeError,ValueError):return None
for uid,ms in members.items():
 targets={next(iter(parents[str(m['owner_club_fm_uid'])])) for m in ms}
 if len(targets)!=1:report['ambiguous_affiliations'].append(uid);continue
 target=targets.pop();w,c=clubs[target];m=ms[0];p=people[uid];fields=m.get('fields_source') or {}
 c['players'].append({'fmUid':uid,'name':p['name'],'positions':fields.get('position'),'age':number(fields.get('age')),'rating':number(fields.get('abi')),'potential':number(fields.get('pot')),'attributes':None,'squad':'Reserve · '+m['squad_label_source'],'sourceSquadLabel':m['squad_label_source'],'sourceTeamUid':str(m['owner_club_fm_uid']),'sourceParentClubUid':target,'affiliatedTeamReference':True,'sourceUrl':p['profile_url'],'sourceDatabase':'FM26 FMB 26.3.2','sourceGender':'male','photo':p.get('photo'),'membershipSourceUrl':m['source_url'],'realWorldAffiliationVerified':False})
 known.add(uid);report['players_added']+=1;report['by_country'][w['country']]+=1
for country in idx['countries']:
 w=worlds[country['key']];dest=ROOT/country['file'];dest.write_bytes(gzip.compress(json.dumps(w,ensure_ascii=False,separators=(',',':')).encode(),mtime=0));country['players']=sum(len(c['players']) for c in w['clubs']);country['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
idx['totals']['players']=sum(c['players'] for c in idx['countries']);idx['affiliatedSquadsIncluded']=True;idx['affiliatedSquadNotice']=report['note'];(ROOT/'monde-index.json').write_text(json.dumps(idx,ensure_ascii=False,indent=2)+'\n');pathlib.Path(args.rapport or ROOT/'rapport_effectifs_affilies.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
