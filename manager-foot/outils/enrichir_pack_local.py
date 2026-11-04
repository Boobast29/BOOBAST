"""Complément local sourcé, sans réseau et sans modification des identités V12.
Rapprochement unique par nom normalisé ET date de naissance exacte.
Les notes EA sont conservées ; les notes FM sont un complément distinct.
"""
import datetime, gzip, hashlib, json, pathlib, sqlite3
from contextlib import closing
from commun import BASE,DOSSIER_JEU_DONNEES,RACINE_JEU,normaliser,pack,unpack,lire_config
from pack_fminside import lire_catalogue
from pack_fmblog import lire_fmblog

def naissance(p):
    if (p.get('transfermarkt') or {}).get('birthDate'):return p['transfermarkt']['birthDate']
    months='January February March April May June July August September October November December'.split()
    try:
        d,m,y=(p.get('birthDateText') or '').split();return datetime.date(int(y),months.index(m)+1,int(d)).isoformat()
    except (KeyError,ValueError,TypeError):return None

def catalogue():
    root=RACINE_JEU/'packs';rows={};error=None
    try:
        fmi=lire_catalogue(root);fmb=lire_fmblog(root);rows={str(p['fmUid']):p for p in fmb['players']};rows.update({str(p['fmUid']):p for p in fmi['players']})
    except (OSError,ValueError) as e:error=e
    configured=lire_config().get('football_monde')
    if configured:
        folder=pathlib.Path(configured)/'complement_manager_foot';manifest=folder/'manifest.json'
        if manifest.is_file():
            m=json.loads(manifest.read_text(encoding='utf8'));raw=(folder/'catalogue_fm.json.gz').read_bytes()
            if hashlib.sha256(raw).hexdigest()!=m['catalogue_sha256']:raise ValueError('Complément V12 corrompu.')
            bundled=json.loads(gzip.decompress(raw))['players']
            if len(bundled)!=m['profiles'] or len({str(p['fmUid']) for p in bundled})!=len(bundled):raise ValueError('Complément V12 incohérent.')
            if len(bundled)>len(rows):return bundled
    if error and not rows:raise error
    return list(rows.values())

def enrichir(base=None,records=None,force=False):
    base=pathlib.Path(base or BASE)
    if not base.exists():return {'statut':'base absente'}
    rows=catalogue() if records is None else records
    raw=json.dumps(rows,ensure_ascii=False,sort_keys=True,separators=(',',':'));digest=hashlib.sha256(raw.encode()).hexdigest()
    with closing(sqlite3.connect(base)) as con:
        con.row_factory=sqlite3.Row
        con.execute('CREATE TABLE IF NOT EXISTS complements_fm(id TEXT PRIMARY KEY,fm_uid TEXT,source TEXT,fiche TEXT)')
        con.execute('CREATE TABLE IF NOT EXISTS complements_meta(cle TEXT PRIMARY KEY,valeur TEXT)')
        old=con.execute("SELECT valeur FROM complements_meta WHERE cle='empreinte'").fetchone()
        if old and old[0]==digest and not force:return {'statut':'déjà à jour','catalogue':len(rows)}
        candidates={};ambiguous=0
        for p in rows:
            dob=naissance(p)
            if not dob:continue
            key=(normaliser(p.get('name')),dob)
            candidates.setdefault(key,[]).append(p)
        linked=0
        with con:
            for old_id in con.execute('SELECT id FROM complements_fm').fetchall():
                previous=con.execute('SELECT fiche FROM fiches WHERE id=?',(old_id[0],)).fetchone()
                if previous:
                    original=unpack(previous[0]);original.pop('complement_fm',None);con.execute('UPDATE fiches SET fiche=? WHERE id=?',(pack(original),old_id[0]))
            con.execute('DELETE FROM complements_fm')
            for (name,dob),profiles in candidates.items():
                ids=con.execute('SELECT id FROM joueurs WHERE nom_norm=? AND substr(naissance,1,10)=?',(name,dob)).fetchall()
                if len(ids)!=1 or len(profiles)!=1:
                    if ids:ambiguous+=1
                    continue
                p=profiles[0];attrs=p.get('attributes',{})
                if len(attrs)<30 or not all(isinstance(v,(int,float)) and not isinstance(v,bool) and 1<=v<=99 for v in attrs.values()):continue
                ident=ids[0]['id'];descriptor={**p,'identityMatch':'unique normalized name + exact birth date','v12Id':ident}
                con.execute('INSERT INTO complements_fm VALUES(?,?,?,?)',(ident,str(p['fmUid']),p['sourceUrl'],json.dumps(descriptor,ensure_ascii=False)))
                record=con.execute('SELECT fiche FROM fiches WHERE id=?',(ident,)).fetchone()
                if record:
                    original=unpack(record[0]);original['complement_fm']=descriptor;con.execute('UPDATE fiches SET fiche=? WHERE id=?',(pack(original),ident))
                linked+=1
            report={'catalogue':len(rows),'fiches_v12_enrichies':linked,'identites_ambigues_non_fusionnees':ambiguous,'identites_ajoutees':0,'notes_ea_remplacees':0,'empreinte':digest,'regle':'Nom et naissance exacts, correspondance unique. Clubs, contrats et activité actuelle non déduits.'}
            con.execute('INSERT OR REPLACE INTO complements_meta VALUES(?,?)',('empreinte',digest));con.execute('INSERT OR REPLACE INTO complements_meta VALUES(?,?)',('rapport',json.dumps(report,ensure_ascii=False)))
    DOSSIER_JEU_DONNEES.mkdir(parents=True,exist_ok=True);dest=DOSSIER_JEU_DONNEES/'rapport_complement_fm.json';tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');tmp.replace(dest)
    print(f"Complément local : {linked} fiches V12 enrichies, {ambiguous} identités ambiguës laissées séparées.",flush=True)
    return report
if __name__=='__main__':print(json.dumps(enrichir(),ensure_ascii=False,indent=2))
