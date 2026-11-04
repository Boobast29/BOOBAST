"""Installe un pack Football Monde local (ZIP ou dossier), puis importe joueurs, images et historiques."""
import argparse, hashlib, json, os, pathlib, re, shutil, sqlite3, subprocess, sys, zipfile
from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, BASE, trouver_football_monde

def verifier_archive(archive):
    from archives_installation import inspect_archive
    return inspect_archive(archive)['manifest']


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
    from archives_installation import extract_pack
    fm, info = extract_pack(archive, target)
    marker.write_text(json.dumps({'sha256':digest.hexdigest(),'archive':archive.name}),encoding='utf8')
    return fm

def search_folders():
    folders=[RACINE_JEU,RACINE_JEU.parent,pathlib.Path.cwd(),pathlib.Path.home()/'Downloads',pathlib.Path.home()/'Téléchargements']
    if os.name=='nt':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER,r'Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders') as key:
                folders.append(pathlib.Path(os.path.expandvars(winreg.QueryValueEx(key,'{374DE290-123F-4565-9164-39C4925E467B}')[0])))
        except OSError:pass
    return list(dict.fromkeys(folders))

def discover():
    folders=search_folders()
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

def audit(fm, base=None):
    with sqlite3.connect(base or BASE) as c:
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
    if not source:sys.exit('Place Football_Monde_JSON_Visuels_v12.zip à côté du jeu ou dans Téléchargements, puis relance Lancer_Manager_Foot.bat.')
    print('Installation du pack local :',source,flush=True);fm=local_pack(source)
    subprocess.run([sys.executable,str(RACINE_JEU/'outils/importer_monde.py'),'--donnees',str(fm)],check=True)
    print(json.dumps(audit(fm),ensure_ascii=False,indent=2));print('Données importées. Le lanceur poursuit la vérification et ouvrira ensuite le jeu.',flush=True)
if __name__=='__main__':main()

