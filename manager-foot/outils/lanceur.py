"""Lanceur unique : met à jour le code, synchronise le pack de données configuré, puis lance le jeu.

Python 3.9+ et accès internet sont nécessaires pour recevoir les mises à jour.
Le jeu peut encore démarrer hors ligne avec la dernière version déjà installée.

Pour recevoir aussi les nouvelles fiches/photos/notes, ajouter dans
`donnees_jeu/launcher.json` : {"pack_url": "https://.../Football_Monde.zip"}.
Le pack reste séparé du dépôt Git, car il est volumineux.
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

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from commun import RACINE_JEU, DOSSIER_JEU_DONNEES  # noqa: E402

OWNER = 'Boobast29'
REPO = 'BOOBAST'
BRANCH = 'Manager-foot'
API_COMMIT = f'https://api.github.com/repos/{OWNER}/{REPO}/commits/{BRANCH}'
ARCHIVE = f'https://codeload.github.com/{OWNER}/{REPO}/zip/'
META = DOSSIER_JEU_DONNEES / 'launcher_state.json'
CONFIG = DOSSIER_JEU_DONNEES / 'launcher.json'


def request(url, timeout=30, method=None, headers=None):
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'BOOBAST-launcher/1.0', **(headers or {})},
        method=method,
    )
    return urllib.request.urlopen(req, timeout=timeout)


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default if default is not None else {}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temp, path)


def update_code(state):
    """Overlay files from the trusted upstream branch; never touches local game data."""
    try:
        with request(API_COMMIT, timeout=12) as response:
            info = json.load(response)
        commit = info['sha']
        if state.get('code_commit') == commit:
            print(f'Code déjà à jour ({commit[:10]}).')
            return state

        print('Recherche/téléchargement de la mise à jour du jeu…')
        with tempfile.TemporaryDirectory(prefix='boobast-update-') as tmp:
            archive_path = pathlib.Path(tmp) / 'source.zip'
            url = ARCHIVE + commit
            with request(url, timeout=120) as response, archive_path.open('wb') as out:
                shutil.copyfileobj(response, out, length=1024 * 1024)
            if archive_path.stat().st_size == 0:
                raise RuntimeError('archive GitHub vide')

            with zipfile.ZipFile(archive_path) as archive:
                names = archive.namelist()
                roots = [n.split('/')[0] for n in names if n.startswith('')]
                prefix = next((f'{root}/manager-foot/' for root in roots if f'{root}/manager-foot/index.html' in names), None)
                if not prefix:
                    raise RuntimeError('archive GitHub invalide : dossier manager-foot/index.html absent')
                copied = 0
                for member in archive.infolist():
                    if member.is_dir() or not member.filename.startswith(prefix):
                        continue
                    rel = pathlib.PurePosixPath(member.filename[len(prefix):])
                    if not rel.parts or any(part in ('..', '.git', '__pycache__', 'donnees_jeu') for part in rel.parts):
                        continue
                    # Ignore any unexpected absolute or drive-qualified paths.
                    if rel.is_absolute() or ':' in rel.parts[0]:
                        continue
                    target = (RACINE_JEU / pathlib.Path(*rel.parts)).resolve()
                    try:
                        target.relative_to(RACINE_JEU.resolve())
                    except ValueError:
                        continue
                    target.parent.mkdir(parents=True, exist_ok=True)
                    staged = target.with_name(target.name + '.update-tmp')
                    with archive.open(member) as source, staged.open('wb') as dest:
                        shutil.copyfileobj(source, dest, length=1024 * 1024)
                    os.replace(staged, target)
                    copied += 1
                if copied == 0:
                    raise RuntimeError('aucun fichier du jeu extrait')
        state['code_commit'] = commit
        write_json(META, state)
        print(f'Jeu mis à jour ({copied} fichiers, {commit[:10]}).')
    except (OSError, urllib.error.URLError, KeyError, ValueError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f'Mise à jour du code indisponible : {exc}')
        print('Le lanceur continue avec les fichiers déjà installés.')
    return state


def file_sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def configured_pack_url():
    cfg = read_json(CONFIG)
    return os.environ.get('FOOTBALL_MONDE_URL') or cfg.get('pack_url')


def download_pack(url):
    if not url:
        return None
    if not url.lower().startswith('https://'):
        raise ValueError('pack_url doit utiliser HTTPS')
    folder = DOSSIER_JEU_DONNEES / 'downloads'
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / 'Football_Monde_update.zip'
    headers = {}
    state = read_json(META)
    if target.is_file() and state.get('pack_etag'):
        headers['If-None-Match'] = state['pack_etag']
    if target.is_file() and state.get('pack_last_modified'):
        headers['If-Modified-Since'] = state['pack_last_modified']
    try:
        response = request(url, timeout=90, headers=headers)
    except urllib.error.HTTPError as exc:
        if exc.code == 304 and target.is_file():
            print('Pack joueur déjà à jour (serveur : HTTP 304).')
            return target
        raise
    temp = target.with_suffix('.download')
    with response, temp.open('wb') as out:
        shutil.copyfileobj(response, out, length=1024 * 1024)
        etag = response.headers.get('ETag')
        modified = response.headers.get('Last-Modified')
    try:
        import zipfile as _zipfile
        with _zipfile.ZipFile(temp) as archive:
            manifest = 'Football_Monde/base_geante_v8/manifest.json'
            if manifest not in archive.namelist():
                raise ValueError('le ZIP reçu ne contient pas la base Football_Monde attendue')
            data = json.loads(archive.read(manifest).decode('utf-8'))
            if not isinstance(data.get('players'), int) or data['players'] <= 0:
                raise ValueError('manifeste de joueurs invalide')
    except Exception:
        temp.unlink(missing_ok=True)
        raise
    digest = file_sha256(temp)
    if target.is_file() and file_sha256(target) == digest:
        temp.unlink(missing_ok=True)
    else:
        os.replace(temp, target)
        print('Nouvelle version du pack joueur téléchargée et vérifiée.')
    state.update({'pack_etag': etag, 'pack_last_modified': modified})
    write_json(META, state)
    return target


def find_local_pack():
    import installer_donnees
    return installer_donnees.discover()


def install_data_pack(state):
    """Importe seulement un pack nouveau/modifié; la reprise par fichier est gérée par l'importeur."""
    pack = None
    try:
        url = configured_pack_url()
        pack = download_pack(url) if url else find_local_pack()
        if not pack:
            print('Pack mondial absent : le jeu démarre quand même en mode disponible (monde fictif/catalogue).')
            return state
        pack = pathlib.Path(pack).resolve()
        digest = file_sha256(pack) if pack.is_file() else hashlib.sha256(
            (pack / 'base_geante_v8' / 'manifest.json').read_bytes()
        ).hexdigest()
        if state.get('pack_sha256') == digest and (DOSSIER_JEU_DONNEES / 'monde.db').is_file():
            print('Données joueurs/photos/notes déjà importées pour ce pack.')
            return state
        print(f'Installation/mise à jour des données joueurs depuis {pack.name}…')
        script = pathlib.Path(__file__).resolve().parent / 'installer_donnees.py'
        subprocess.run([sys.executable, str(script), str(pack)], cwd=str(RACINE_JEU), check=True)
        state['pack_sha256'] = digest
        write_json(META, state)
        print('Données joueurs mises à jour.')
    except Exception as exc:
        print(f'Mise à jour des données joueurs ignorée/échouée : {exc}')
        print('Le jeu démarre avec les données locales déjà installées.')
    return state


def main():
    parser = argparse.ArgumentParser(description='Met à jour Manager Foot puis le lance.')
    parser.add_argument('--installer-seul', action='store_true', help='met à jour le code et les données, sans lancer le serveur')
    parser.add_argument('--sans-lancer', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    DOSSIER_JEU_DONNEES.mkdir(parents=True, exist_ok=True)
    state = read_json(META)
    state = update_code(state)
    state = install_data_pack(state)
    if args.installer_seul or args.sans_lancer:
        print('Mise à jour terminée.')
        return 0
    server = OUTILS / 'serveur.py'
    if not server.is_file():
        print('Serveur absent : vérifie que le dossier manager-foot est complet.')
        return 1
    print('Démarrage de Manager Foot…')
    return subprocess.call([sys.executable, str(server), '--ouvrir'], cwd=str(RACINE_JEU))


OUTILS = RACINE_JEU / 'outils'

if __name__ == '__main__':
    raise SystemExit(main())
