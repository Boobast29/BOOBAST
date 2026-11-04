"""Installation guidée V12 sous Windows, sans PowerShell ni contournement de politique."""
import hashlib
import json
import pathlib
import subprocess
import sys
import time
import urllib.request
import webbrowser
import zipfile

from commun import RACINE_JEU, DOSSIER_JEU_DONNEES
from installer_donnees import verifier_archive

V12_SHA256 = '1e8d791af8928f60f8482358ec80a503cdc216d28716b117819ef87100a8fe59'
V12_BYTES = 432068140
LIBRARY_PAGE = 'https://chatgpt.com/library?file_id=libfile_3e6b2a50e79c8191957071c90e15e93a&account_id=personal'


def candidats():
    dirs = (RACINE_JEU, RACINE_JEU.parent, pathlib.Path.home() / 'Downloads', pathlib.Path.home() / 'Téléchargements')
    return sorted({p.resolve() for d in dirs if d.is_dir() for p in d.glob('Football_Monde_JSON_Visuels_v12*.zip')},
                  key=lambda p: p.stat().st_mtime, reverse=True)


def choisir_pack():
    for p in candidats():
        if p.name.endswith('.crdownload') or p.name.endswith('.part'): continue
        if p.stat().st_size != V12_BYTES:
            print('V12 ignorée : taille incorrecte :', p, flush=True)
            continue
        h = hashlib.sha256()
        with p.open('rb') as f:
            for chunk in iter(lambda: f.read(4 * 1024 * 1024), b''):
                h.update(chunk)
        if h.hexdigest() != V12_SHA256:
            print('V12 ignorée : empreinte différente :', p, flush=True)
            continue
        try:
            if verifier_archive(p)['players'] != 436020:
                raise ValueError('Nombre de joueurs inattendu')
        except (ValueError, OSError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as e:
            print('V12 ignorée :', e, flush=True)
            continue
        return p
    return None


def executer(script, *args):
    return subprocess.run([sys.executable, str(RACINE_JEU / 'outils' / script), *map(str, args)],
                          cwd=RACINE_JEU, check=True)


def main():
    print('Manager Foot — installation guidée V12', flush=True)
    pack = choisir_pack()
    if pack is None:
        print('La V12 complète est absente ou incorrecte. La page de téléchargement va s’ouvrir.', flush=True)
        print('Dans cette page, clique Télécharger. Garde ce programme ouvert ; il détectera le ZIP dans Téléchargements.', flush=True)
        webbrowser.open(LIBRARY_PAGE)
        until = time.monotonic() + 20 * 60
        previous = None
        while time.monotonic() < until:
            time.sleep(5)
            files = tuple((str(p), p.stat().st_size, p.stat().st_mtime_ns) for p in candidats())
            if files == previous: continue
            previous = files
            pack = choisir_pack()
            if pack: break
        if not pack:
            raise RuntimeError('V12 introuvable après 20 minutes. Télécharge le ZIP complet de 432 068 140 octets puis relance ce fichier.')
    print('V12 vérifiée :', pack, flush=True)
    executer('installer_donnees.py', pack)
    print('Base V12 installée. Mise à jour des autres contenus du jeu…', flush=True)
    executer('tout_installer.py', '--sans-lancer')
    state = DOSSIER_JEU_DONNEES / 'etat_installation.json'
    if state.is_file():
        failures = [e['nom'] for e in json.loads(state.read_text(encoding='utf-8')).get('etapes', []) if e.get('statut') == 'échec']
        if failures: print('Mises à jour à reprendre :', ', '.join(failures), flush=True)
    try:
        urllib.request.urlopen('http://127.0.0.1:7860/sdapi/v1/sd-models', timeout=2).close()
    except Exception:
        print('Visages IA : générateur local absent. Les portraits réels V12 sont conservés ; aucun portrait fictif attribué à une personne réelle.', flush=True)
    print('Installation terminée. Le jeu va démarrer. Laisse la fenêtre ouverte pendant la partie.', flush=True)
    executer('serveur.py', '--ouvrir')


if __name__ == '__main__':
    try: main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print('Erreur :', exc, flush=True)
        sys.exit(1)
