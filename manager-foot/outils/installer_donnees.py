"""Installe un pack Football Monde local (ZIP ou dossier), puis importe joueurs, images et historiques."""
import argparse, hashlib, json, os, pathlib, re, shutil, sqlite3, subprocess, sys, zipfile
from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, BASE, trouver_football_monde

def verifier_archive(archive):
    """Rejette une archive de code, tronquée ou sans base de joueurs avant extraction."""
    try:
        with zipfile.ZipFile(archive) as z:
            required='Football_Monde/base_geante_v8/manifest.json'
            infos=z.infolist()
            names=set()
            names_windows=set()
            total=0
            for info in infos:
                name=info.filename.replace('\\','/')
                parts=pathlib.PurePosixPath(name).parts
                if (not parts or parts[0]!='Football_Monde' or name.startswith('/')
                    or any(part in ('.','..') or ':' in part for part in parts)
                    or (info.external_attr >> 16) & 0o170000 == 0o120000):
                    raise ValueError('Chemin ou lien non autorisé dans le pack : '+name)
                key=name.rstrip('/').casefold()
                if key in names_windows:
                    raise ValueError('Entrées ZIP en double ou incompatibles avec Windows : '+name)
                names_windows.add(key)
                names.add(name)
                total += info.file_size
            if len(infos)>100000 or total>20*1024**3:
                raise ValueError('Pack trop volumineux ou trop de fichiers.')
            if required not in names:
                raise ValueError('Ce ZIP ne contient pas la base Football_Monde complète (manifest.json absent). Le ZIP BOOBAST/V12 contient le code du jeu : il faut le décompresser, puis fournir séparément Football_Monde_JSON_Visuels.zip.')
            m=json.loads(z.read(required).decode('utf-8'))
            if not isinstance(m.get('players'),int) or m['players']<=0 or not isinstance(m.get('player_files'),list):
                raise ValueError('Manifeste de la base mondiale invalide.')
            for name in m['player_files']:
                if not isinstance(name,str) or '/' in name or '..' in name or f'Football_Monde/base_geante_v8/joueurs/{name}' not in names:
                    raise ValueError('Pack incomplet : un lot de joueurs manque ('+str(name)+').')
            return m
    except (zipfile.BadZipFile, EOFError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Archive ZIP illisible ou incomplète : '+str(archive)) from exc

def local_pack(archive):
    archive=pathlib.Path(archive).expanduser().resolve()
    if archive.is_dir():
        found=trouver_football_monde(str(archive)) or trouver_football_monde(str(archive/'Football_Monde'))
        if not found: raise ValueError('Ce dossier ne contient pas de pack Football_Monde reconnu.')
        return found
    verifier_archive(archive)
    digest=hashlib.sha256()
    with archive.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):digest.update(chunk)
    target=DOSSIER_JEU_DONNEES/'packs'/digest.hexdigest()[:16]
    marker=target/'installation_complete.json'
    fm=target/'Football_Monde'
    if marker.is_file() and (fm/'base_geante_v8/manifest.json').is_file():
        try:
            if json.loads(marker.read_text(encoding='utf-8')).get('sha256') == digest.hexdigest():
                return fm
        except (OSError, ValueError):
            pass
    target.parent.mkdir(parents=True,exist_ok=True)
    temp=target.with_name(target.name+'.extraction')
    if temp.exists():shutil.rmtree(temp)
    temp.mkdir(parents=True)
    try:
        with zipfile.ZipFile(archive) as z:
            files=z.infolist();total=sum(i.file_size for i in files)
            if len(files)>100000 or total>20*1024**3:raise ValueError('Pack trop volumineux ou trop de fichiers.')
            if shutil.disk_usage(temp).free<total+200*1024*1024:raise ValueError('Espace disque insuffisant pour extraire le pack et sa base.')
            for info in files:
                name=info.filename.replace('\\','/');parts=pathlib.PurePosixPath(name).parts
                if name.startswith('/') or '..' in parts or any(':' in part for part in parts) or not parts or parts[0]!='Football_Monde':raise ValueError('Chemin non autorisé dans le pack : '+name)
                if (info.external_attr>>16)&0o170000==0o120000:raise ValueError('Lien symbolique interdit dans le pack : '+name)
                dest=temp.joinpath(*parts)
                try:dest.resolve().relative_to(temp.resolve())
                except ValueError:raise ValueError('Chemin sortant du dossier de données.')
                if info.is_dir():dest.mkdir(parents=True,exist_ok=True);continue
                dest.parent.mkdir(parents=True,exist_ok=True)
                with z.open(info) as source,dest.open('wb') as out:shutil.copyfileobj(source,out)
        if not (temp/'Football_Monde/base_geante_v8/manifest.json').is_file():raise ValueError('Manifeste absent après extraction.')
        if target.exists():shutil.rmtree(target)
        temp.rename(target)
    finally:
        if temp.exists():shutil.rmtree(temp)
    marker.write_text(json.dumps({'sha256':digest.hexdigest(),'archive':archive.name}),encoding='utf8')
    return fm

def discover():
    folders=[RACINE_JEU,RACINE_JEU.parent,pathlib.Path.cwd(),pathlib.Path.home()/'Downloads',pathlib.Path.home()/'Téléchargements']
    candidates={p.resolve() for folder in folders if folder.is_dir() for p in folder.glob('Football_Monde*.zip')}
    def priority(p):
        m=re.search(r'_v(\d+)',p.stem,re.I);return (int(m.group(1)) if m else 0,p.stat().st_mtime)
    rejected=[]
    for candidate in sorted(candidates,key=priority,reverse=True):
        try:verifier_archive(candidate);return candidate
        except (ValueError,OSError) as exc:
            print('Pack ignoré :',candidate.name,'—',exc,flush=True);rejected.append(str(exc))
    folder=trouver_football_monde()
    if folder:return folder
    if rejected:raise ValueError('Aucun pack complet valide trouvé. '+rejected[0])
    return None

def audit(fm):
    with sqlite3.connect(BASE) as c:
        count=c.execute('select count(*) from joueurs').fetchone()[0]
        duplicate=c.execute('select count(*)-count(distinct id) from joueurs').fetchone()[0]
        pics=c.execute('select photo_local from joueurs where photo_local is not null').fetchall()
        logos=c.execute('select logo_local from clubs where logo_local is not null').fetchall()
        def exists(rel):
            p=(fm/rel).resolve()
            try:p.relative_to(fm.resolve())
            except ValueError:return False
            return p.is_file()
        report={'joueurs':count,'identifiants_dupliques':duplicate,'portraits_locaux_disponibles':sum(exists(r[0]) for r in pics),'logos_locaux_disponibles':sum(exists(r[0]) for r in logos),'historiques':dict(c.execute('select tab,count(*) from historiques group by tab')),'mode':'sources réelles conservées ; contrats/salaires de simulation distincts'}
    expected=json.loads((fm/'base_geante_v8/manifest.json').read_text(encoding='utf8'))['players']
    if count!=expected or duplicate:raise ValueError('Contrôle du nombre de joueurs ou des identifiants échoué.')
    (DOSSIER_JEU_DONNEES/'rapport_installation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    return report

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('pack',nargs='?',help='ZIP ou dossier Football_Monde');a=ap.parse_args();source=a.pack or discover()
    if not source:sys.exit('Place Football_Monde_JSON_Visuels.zip à côté du jeu ou dans Téléchargements, puis relance Tout_Installer.bat.')
    print('Installation du pack local :',source,flush=True);fm=local_pack(source)
    subprocess.run([sys.executable,str(RACINE_JEU/'outils/importer_monde.py'),'--donnees',str(fm)],check=True)
    print(json.dumps(audit(fm),ensure_ascii=False,indent=2));print('Installation terminée. Lance Lancer_Manager_Foot.bat puis choisis un club réel.')
if __name__=='__main__':main()
