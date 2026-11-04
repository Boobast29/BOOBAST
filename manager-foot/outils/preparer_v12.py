"""Produit une V12 nettoyée et enrichie, sans changer ses joueurs ni leurs attributs EA.
Usage : python outils/preparer_v12.py SOURCE.zip SORTIE.zip [--base monde.db]
"""
import argparse,copy,datetime,gzip,hashlib,json,pathlib,shutil,sqlite3,zipfile
from archives_installation import inspect_archive
from enrichir_pack_local import catalogue
from commun import BASE,DOSSIER_JEU_DONNEES
from lanceur import file_sha256

def preparer(source,destination,base=None):
    source=pathlib.Path(source).resolve();destination=pathlib.Path(destination).resolve()
    if source==destination:raise ValueError('La sortie doit être distincte du ZIP source.')
    info=inspect_archive(source);prefix=info['prefix'];rows=catalogue();blob=gzip.compress(json.dumps({'players':rows},ensure_ascii=False,separators=(',',':')).encode(),mtime=0)
    base=pathlib.Path(base or BASE);links=[]
    if base.exists():
        with sqlite3.connect(base) as c:
            if c.execute("select 1 from sqlite_master where name='complements_fm'").fetchone():links=[{'v12_id':r[0],'fm_uid':r[1],'source':r[2]} for r in c.execute('select id,fm_uid,source from complements_fm order by id')]
    manifest={'version':'12.1','profiles':len(rows),'catalogue_sha256':hashlib.sha256(blob).hexdigest(),'linked_v12_profiles':len(links),'identity_rule':'unique normalized name + exact birth date','original_players_unchanged':info['manifest']['players'],'ea_attributes_replaced':0,'source_dates_preserved':True}
    with zipfile.ZipFile(source) as z:json_count=sum(i.filename.endswith('.json') for i in z.infolist())
    report={'version':'12.1','created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_zip_sha256':file_sha256(source),'source_json_files_validated':json_count,'temporary_files_removed':[],'players':info['manifest']['players'],'profiles_added_to_documentary_catalogue':len(rows),'v12_profiles_enriched':len(links),'new_player_identities':0,'note':'Aucune fusion des homonymes ; chaque famille de notes conserve sa provenance et sa version.'}
    destination.parent.mkdir(parents=True,exist_ok=True);temp=destination.with_suffix('.zip.tmp');copied=[]
    with zipfile.ZipFile(source) as original,zipfile.ZipFile(temp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as output:
        for i in original.infolist():
            name=i.filename.replace('\\','/')
            if not name.startswith(prefix) or i.is_dir():continue
            rel=name[len(prefix):]
            if any(p.startswith('.') for p in pathlib.PurePosixPath(rel).parts) or rel.endswith(('.tmp','.download','.part','.crdownload')):
                report['temporary_files_removed'].append(rel);continue
            if rel.startswith('complement_manager_foot/'):continue
            if rel=='base_geante_v8/manifest.json':
                m=copy.deepcopy(info['manifest']);m['manager_foot_complement']='complement_manager_foot/manifest.json';output.writestr('Football_Monde/'+rel,json.dumps(m,ensure_ascii=False,indent=2));continue
            if '/' not in rel and (rel.startswith(('COMMENCER_ICI_','PROMPT_CLAUDE','INSTRUCTIONS_CLAUDE')) or rel=='LIRE_MOI.txt'):rel='documentation/versions_precedentes/'+rel
            target=copy.copy(i);target.filename='Football_Monde/'+rel
            with original.open(i) as src,output.open(target,'w') as dest:shutil.copyfileobj(src,dest,1024*1024)
            copied.append((i.filename,target.filename,i.CRC,i.file_size))
        output.writestr('Football_Monde/complement_manager_foot/catalogue_fm.json.gz',blob)
        output.writestr('Football_Monde/complement_manager_foot/manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
        output.writestr('Football_Monde/complement_manager_foot/liaisons_v12.json',json.dumps(links,ensure_ascii=False,indent=2))
        output.writestr('Football_Monde/complement_manager_foot/audit.json',json.dumps(report,ensure_ascii=False,indent=2))
        output.writestr('Football_Monde/LIRE_MOI.txt','V12 complète + complément Manager Foot 12.1\n\nNe lance aucun script de ce dossier.\nPlace ce ZIP dans Téléchargements, puis utilise le raccourci BOOBAST Manager Foot\nou Lancer_Manager_Foot.bat. Le lanceur extrait, importe et contrôle la base.\n\nLes 436 020 identités et leurs notes EA sont conservées. Les notes FM sont\nun complément séparé, relié par nom ET naissance exacts. Les dates des sources\nne constituent pas une vérification des clubs ou contrats réels actuels.\n\nLes anciennes notices sont rangées dans documentation/versions_precedentes.\n')
    with zipfile.ZipFile(temp) as output:
        for old,new,crc,size in copied:
            i=output.getinfo(new)
            if i.CRC!=crc or i.file_size!=size:raise ValueError('Fichier altéré : '+old)
        bad=output.testzip()
        if bad:raise ValueError('CRC invalide : '+bad)
        for i in output.infolist():
            if i.filename.endswith('.json'):json.loads(output.read(i).decode('utf-8-sig'))
    inspect_archive(temp);temp.replace(destination)
    result={**report,'zip_bytes':destination.stat().st_size,'zip_sha256':file_sha256(destination)}
    print(json.dumps(result,ensure_ascii=False,indent=2));return result
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('source');ap.add_argument('sortie');ap.add_argument('--base');a=ap.parse_args();preparer(a.source,a.sortie,a.base)
