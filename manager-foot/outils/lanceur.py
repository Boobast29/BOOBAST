"""Lanceur unique : met à jour le jeu et, si un pack V12 change, ses données puis démarre le serveur.

Python 3.9+ requis. Le pack V12 reste sur le PC de l'utilisateur et n'est pas envoyé au dépôt.
Au premier lancement, le lanceur cherche dans les dossiers habituels puis propose de choisir le ZIP.
Le chemin choisi est mémorisé. Remplacer le ZIP par sa nouvelle version déclenche son réimport.
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile

RACINE = pathlib.Path(__file__).resolve().parent.parent
OUTILS = RACINE / 'outils'
DONNEES = RACINE / 'donnees_jeu'
CONFIG = DONNEES / 'launcher.json'
ETAT = DONNEES / 'launcher_state.json'
OWNER, REPO, BRANCH = 'Boobast29', 'BOOBAST', 'Manager-foot'
API_COMMIT = f'https://api.github.com/repos/{OWNER}/{REPO}/commits/{BRANCH}'
ZIP_URL = f'https://codeload.github.com/{OWNER}/{REPO}/zip/'


def lire_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def ecrire_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temp, path)


def ouvrir(url, timeout=30, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'BOOBAST-launcher/1.0', **(headers or {})})
    return urllib.request.urlopen(req, timeout=timeout)


def mettre_a_jour_code(etat):
    """Télécharge la révision GitHub ciblée, sans toucher au dossier local des données/sauvegardes."""
    try:
        with ouvrir(API_COMMIT, timeout=12) as response:
            commit = json.load(response)['sha']
        if etat.get('code_commit') == commit:
            print(f'Code déjà à jour ({commit[:10]}).')
            return etat
        print('Vérification des mises à jour du jeu…')
        with tempfile.TemporaryDirectory(prefix='boobast-code-') as tmp:
            archive_path = pathlib.Path(tmp) / 'source.zip'
            with ouvrir(ZIP_URL + commit, timeout=120) as response, archive_path.open('wb') as out:
                shutil.copyfileobj(response, out, 1024 * 1024)
            with zipfile.ZipFile(archive_path) as archive:
                names = set(archive.namelist())
                prefix = next((name.rsplit('manager-foot/index.html', 1)[0] + 'manager-foot/'
                               for name in names if name.endswith('/manager-foot/index.html')), None)
                if not prefix:
                    raise RuntimeError('archive GitHub invalide : manager-foot/index.html absent')
                count = 0
                for item in archive.infolist():
                    if item.is_dir() or not item.filename.startswith(prefix):
                        continue
                    rel = pathlib.PurePosixPath(item.filename[len(prefix):])
                    if not rel.parts or rel.is_absolute() or any(x in ('.', '..', '.git', '__pycache__', 'donnees_jeu') for x in rel.parts) or ':' in rel.parts[0]:
                        continue
                    dest = (RACINE / pathlib.Path(*rel.parts)).resolve()
                    try:
                        dest.relative_to(RACINE.resolve())
                    except ValueError:
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    staged = dest.with_name(dest.name + '.update-tmp')
                    with archive.open(item) as source, staged.open('wb') as target:
                        shutil.copyfileobj(source, target, 1024 * 1024)
                    os.replace(staged, dest)
                    count += 1
                if not count:
                    raise RuntimeError('aucun fichier du jeu trouvé dans le ZIP')
        etat['code_commit'] = commit
        ecrire_json(ETAT, etat)
        print(f'Jeu actualisé ({count} fichiers, {commit[:10]}).')
    except Exception as exc:
        print(f'Mise à jour du code impossible ({exc}). Utilisation de la version déjà installée.')
    return etat


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def valider_zip(path):
    try:
        with zipfile.ZipFile(path) as archive:
            if archive.testzip() is not None:
                return False
            name = 'Football_Monde/base_geante_v8/manifest.json'
            if name not in archive.namelist():
                return False
            manifest = json.loads(archive.read(name).decode('utf-8'))
            return isinstance(manifest.get('players'), int) and manifest['players'] > 0
    except (OSError, ValueError, zipfile.BadZipFile, KeyError):
        return False


def dossiers_recherche():
    home = pathlib.Path.home()
    return [RACINE, RACINE.parent, pathlib.Path.cwd(), home / 'Downloads', home / 'Téléchargements',
            home / 'Desktop', home / 'Bureau', home / 'Documents']


def choisir_zip():
    """Cherche le ZIP dans les emplacements habituels ; affiche un sélecteur si introuvable."""
    config = lire_json(CONFIG)
    memorise = pathlib.Path(config.get('pack_path', '')).expanduser() if config.get('pack_path') else None
    if memorise and memorise.is_file() and valider_zip(memorise):
        return memorise.resolve()

    candidats = set()
    for dossier in dossiers_recherche():
        if not dossier.is_dir():
            continue
        for motif in ('*Football_Monde*.zip', '*v12*.zip', '*V12*.zip'):
            try:
                candidats.update(p.resolve() for p in dossier.glob(motif) if p.is_file())
            except OSError:
                continue
    def ordre(path):
        nom = path.name.lower()
        return (3 if 'v12' in nom else 2 if 'football_monde' in nom else 1, path.stat().st_mtime)
    for path in sorted(candidats, key=ordre, reverse=True):
        if valider_zip(path):
            return path
        print(f'ZIP ignoré (incomplet ou non reconnu) : {path}')

    # L'utilisateur peut avoir rangé le ZIP dans n'importe quel autre dossier.
    if not (DONNEES / 'monde.db').is_file():
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            selection = filedialog.askopenfilename(
                title='Choisir le pack Football Monde V12',
                filetypes=[('Pack Football Monde (ZIP)', '*.zip'), ('Tous les fichiers', '*.*')],
            )
            root.destroy()
            if selection:
                path = pathlib.Path(selection).resolve()
                if valider_zip(path):
                    return path
                print('Le ZIP sélectionné est incomplet ou ne contient pas la base Football_Monde attendue.')
        except Exception as exc:
            print(f'Sélecteur de fichiers indisponible : {exc}')
    return None


def telecharger_pack(url, etat):
    if not url:
        return None
    if not url.lower().startswith('https://'):
        raise ValueError('Le lien du pack doit utiliser HTTPS.')
    target = DONNEES / 'downloads' / 'Football_Monde_update.zip'
    target.parent.mkdir(parents=True, exist_ok=True)
    headers = {}
    if target.is_file() and etat.get('pack_etag'):
        headers['If-None-Match'] = etat['pack_etag']
    if target.is_file() and etat.get('pack_modified'):
        headers['If-Modified-Since'] = etat['pack_modified']
    try:
        response = ouvrir(url, timeout=120, headers=headers)
    except urllib.error.HTTPError as exc:
        if exc.code == 304 and target.is_file():
            print('Pack joueur déjà à jour.')
            return target
        raise
    temp = target.with_suffix('.download')
    with response, temp.open('wb') as out:
        shutil.copyfileobj(response, out, 1024 * 1024)
        etat['pack_etag'] = response.headers.get('ETag')
        etat['pack_modified'] = response.headers.get('Last-Modified')
    if not valider_zip(temp):
        temp.unlink(missing_ok=True)
        raise ValueError('Le téléchargement reçu n’est pas un pack Football Monde valide.')
    if target.is_file() and sha256(target) == sha256(temp):
        temp.unlink(missing_ok=True)
    else:
        os.replace(temp, target)
        print('Nouveau pack de joueurs téléchargé et vérifié.')
    ecrire_json(ETAT, etat)
    return target


def mettre_a_jour_donnees(etat):
    config = lire_json(CONFIG)
    try:
        url = os.environ.get('FOOTBALL_MONDE_URL') or config.get('pack_url')
        pack = telecharger_pack(url, etat) if url else choisir_zip()
        if not pack:
            print('Pack V12 non trouvé : le jeu démarre quand même avec les données déjà installées.')
            return etat
        pack = pathlib.Path(pack).resolve()
        digest = sha256(pack)
        if etat.get('pack_sha256') == digest and (DONNEES / 'monde.db').is_file():
            print('Fiches joueurs, photos et notes déjà à jour.')
            return etat
        print(f'Import/mise à jour du pack local : {pack.name}')
        subprocess.run([sys.executable, str(OUTILS / 'installer_donnees.py'), str(pack)], cwd=RACINE, check=True)
        etat['pack_sha256'] = digest
        ecrire_json(ETAT, etat)
        config['pack_path'] = str(pack)
        ecrire_json(CONFIG, config)
        print('Fiches, photos et notes importées.')
    except Exception as exc:
        print(f'Mise à jour des données V12 impossible ({exc}). Les données déjà installées sont conservées.')
    return etat


def main():
    parser = argparse.ArgumentParser(description='Met à jour Manager Foot puis le lance.')
    parser.add_argument('--installer-seul', action='store_true', help='mettre à jour sans lancer le jeu')
    args = parser.parse_args()
    DONNEES.mkdir(parents=True, exist_ok=True)
    etat = lire_json(ETAT)
    etat = mettre_a_jour_code(etat)
    etat = mettre_a_jour_donnees(etat)
    if args.installer_seul:
        return 0
    serveur = OUTILS / 'serveur.py'
    if not serveur.is_file():
        print('Le serveur est introuvable : vérifie que le dossier manager-foot est complet.')
        return 1
    print('Démarrage du jeu…')
    return subprocess.call([sys.executable, str(serveur), '--ouvrir'], cwd=RACINE)


if __name__ == '__main__':
    raise SystemExit(main())
