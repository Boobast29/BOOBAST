"""Installe un pack Football Monde local (ZIP ou dossier), puis importe joueurs, images et historiques."""
import argparse, hashlib, json, os, pathlib, re, shutil, sqlite3, subprocess, sys, zipfile
from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, BASE, trouver_football_monde

def verifier_archive(archive):
    """Valide le conteneur et le manifeste avant toute extraction."""
    try:
        with zipfile.ZipFile(archive) as z:
            required = 'Football_Monde/base_geante_v8/manifest.json'
            if required not in z.namelist():
                raise ValueError('Pack incomplet ou extension seule : le manifeste de la base mondiale est absent.')
            manifest = json.loads(z.read(required).decode('utf-8'))
            if not isinstance(manifest.get('players'), int) or manifest['players'] <= 0:
                raise ValueError('Manifeste de joueurs invalide.')
            return manifest
    except (zipfile.BadZipFile, EOFError) as exc:
        raise ValueError('Archive ZIP illisible ou téléchargement incomplet : ' + str(archive) +
                         '. Télécharge à nouveau le pack complet puis vérifie son ouverture dans Windows.') from exc


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
    if marker.is_file() and (target/'Football_Monde/base_geante_v8/manifest.json').is_file():return target/'Football_Monde'
    target.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        files=z.infolist();total=sum(i.file_size for i in files)
        if shutil.disk_usage(target).free<total+200*1024*1024:raise ValueError('Espace disque insuffisant pour extraire le pack et sa base.')
        for info in files:
            name=info.filename.replace('\\','/');parts=pathlib.PurePosixPath(name).parts
            if name.startswith('/') or '..' in parts or any(':' in part for part in parts) or not parts or parts[0]!='Football_Monde':raise ValueError('Chemin non autorisé dans le pack : '+name)
            dest=target.joinpath(*parts)
            try:dest.resolve().relative_to(target.resolve())
            except ValueError:raise ValueError('Chemin sortant du dossier de données.')
            if info.is_dir():dest.mkdir(parents=True,exist_ok=True);continue
            dest.parent.mkdir(parents=True,exist_ok=True)
            with z.open(info) as source,dest.open('wb') as out:shutil.copyfileobj(source,out)
    fm=target/'Football_Monde'
    if not (fm/'base_geante_v8/manifest.json').is_file():raise ValueError('Manifeste de joueurs absent.')
    marker.write_text(json.dumps({'sha256':digest.hexdigest(),'archive':archive.name}),encoding='utf8')
    return fm

def discover():
    folders=[RACINE_JEU,RACINE_JEU.parent,pathlib.Path.cwd(),pathlib.Path.home()/'Downloads',pathlib.Path.home()/'Téléchargements']
    candidates={p.resolve() for folder in folders if folder.is_dir() for p in folder.glob('Football_Monde*.zip')}
    def priority(p):
        m=re.search(r'_v(\d+)',p.stem,re.I);return (int(m.group(1)) if m else 0,p.stat().st_mtime)
    rejected=[]
    for candidate in sorted(candidates,key=priority,reverse=True):
        try:
            verifier_archive(candidate)
            return candidate
        except (ValueError, OSError, KeyError, UnicodeError) as exc:
            print('Pack ignoré :', candidate.name, '—', exc, flush=True)
            rejected.append(str(exc))
    folder=trouver_football_monde()
    if folder:return folder
    if rejected:raise ValueError('Aucun pack complet valide trouvé. ' + rejected[0])
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
    if not source:sys.exit('Place Football_Monde_JSON_Visuels_v12.zip à côté du jeu ou dans Téléchargements, puis relance Installer_Joueurs_Photos.bat.')
    print('Installation du pack local :',source,flush=True);fm=local_pack(source)
    subprocess.run([sys.executable,str(RACINE_JEU/'outils/importer_monde.py'),'--donnees',str(fm)],check=True)
    print(json.dumps(audit(fm),ensure_ascii=False,indent=2));print('Installation terminée. Lance Lancer_Manager_Foot.bat puis choisis un club réel.')
if __name__=='__main__':main()

