"""Installe et met à jour TOUT en une commande : base mondiale, données réelles, photos, logos, maillots, visages.

    python outils/tout_installer.py               # tout, puis lance le jeu
    python outils/tout_installer.py --sans-lancer # tout, sans lancer le jeu (utilisé par le bouton du jeu)

Étapes (une étape qui échoue n'arrête pas les suivantes ; bilan à la fin, journal dans donnees_jeu/journal_installation.txt) :
  1. Pack Football_Monde (ZIP ou dossier à côté du jeu, dans Téléchargements ou sur le Bureau ; la version la plus haute
     gagne, ex. v12 avant v11 ; --pack "chemin" pour imposer un pack) → base mondiale, portraits et logos du pack
  2. Registre reep (liens Wikidata / Transfermarkt / EA)
  3. transfermarkt-datasets : effectifs actuels, valeurs, contrats, transferts, statistiques
  4. ClubElo : force des clubs
  5. Maillots réels
  6. Wikidata : entraîneurs, photos et logos libres, effectifs des petites divisions
  7. openfootball (football.json + europe) : palmarès réels, championnats européens, calibrage
  8. Nationalités des joueurs du monde étendu
  9. Visages des joueurs sans photo : pack NewGAN (dossier « NewGAN » trouvé) ou Stable Diffusion local (s'il tourne)
 10. Fiches FM26 détaillées de tous les joueurs des clubs du jeu, réserves comprises, et des vrais joueurs libres (FMInside)
 11. Complément de 1 000 fiches FM26 (Football Manager Blog) et contrôle de couverture
Les étapes 10 et 11 sont longues (plusieurs heures la première fois) ; chaque fiche est gardée, une relance reprend
où elle s'était arrêtée. --rapide les saute. Internet nécessaire. Rien n'est supprimé : chaque étape complète la base.
"""
import argparse
import datetime
import io
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, BASE  # noqa: E402

OUTILS = RACINE_JEU / 'outils'
JOURNAL = DOSSIER_JEU_DONNEES / 'journal_installation.txt'
ETAT = DOSSIER_JEU_DONNEES / 'etat_installation.json'
DOSSIERS_RECHERCHE = [RACINE_JEU, RACINE_JEU.parent, pathlib.Path.home() / 'Downloads', pathlib.Path.home() / 'Téléchargements', pathlib.Path.home() / 'Desktop', pathlib.Path.home() / 'Bureau']


def ecrire(msg, etat=None):
    ligne = f'[{datetime.datetime.now():%H:%M:%S}] {msg}'
    print(ligne, flush=True)
    DOSSIER_JEU_DONNEES.mkdir(parents=True, exist_ok=True)
    with open(JOURNAL, 'a', encoding='utf-8') as f:
        f.write(ligne + '\n')
    if etat is not None:
        ETAT.write_text(json.dumps(etat, ensure_ascii=False, indent=1), encoding='utf-8')


def lancer(script, *args, delai=None):
    r = subprocess.run([sys.executable, str(OUTILS / script), *args], cwd=str(RACINE_JEU), timeout=delai)
    if r.returncode != 0:
        raise RuntimeError(f'{script} a échoué (code {r.returncode})')


def telecharger_depot(depot, dest):
    """Archive ZIP d'un dépôt GitHub (branche principale) → dossier ; renvoie le dossier racine extrait."""
    for branche in ('master', 'main'):
        url = f'https://codeload.github.com/{depot}/zip/refs/heads/{branche}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'manager-foot-installation'})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                for info in z.infolist():
                    cible = (dest / info.filename).resolve()
                    if dest.resolve() not in cible.parents and cible != dest.resolve():
                        raise ValueError('chemin hors du dossier')
                z.extractall(dest)
                return dest / z.namelist()[0].split('/')[0]
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
    raise RuntimeError(f'dépôt {depot} introuvable')


def recuperer_depot(depot, dest):
    """ZIP GitHub, sinon git clone (réseaux qui bloquent les archives)."""
    try:
        return telecharger_depot(depot, dest)
    except Exception as e:
        cible = dest / depot.split('/')[1]
        if (cible / '.git').is_dir():
            subprocess.run(['git', '-C', str(cible), 'pull', '-q'], check=True, timeout=300)
            return cible
        try:
            subprocess.run(['git', 'clone', '-q', '--depth', '1', f'https://github.com/{depot}.git', str(cible)], check=True, timeout=600)
            return cible
        except Exception:
            raise RuntimeError(f'téléchargement de {depot} impossible ({e})')


PACK_CHOISI = None


def etape_pack():
    import installer_donnees
    src = PACK_CHOISI or installer_donnees.discover(verbeux=True)
    if not src:
        return 'ignorée : aucun pack Football_Monde (ZIP) trouvé — place-le dans Téléchargements puis relance'
    lancer('installer_donnees.py', str(src))
    return f'pack installé ({pathlib.Path(src).name})'


def etape_openfootball():
    tmp = DOSSIER_JEU_DONNEES / 'sources' / 'openfootball'
    tmp.mkdir(parents=True, exist_ok=True)
    fj = recuperer_depot('openfootball/football.json', tmp)
    eu = recuperer_depot('openfootball/europe', tmp)
    lancer('palmares_reel.py', str(fj))
    lancer('openfootball_europe.py', str(eu))
    lancer('ligues_europe_clubs.py', str(fj), str(eu))
    return 'palmarès, championnats européens et calibrage à jour'


def trouver_newgan():
    for d in DOSSIERS_RECHERCHE:
        if not d.is_dir():
            continue
        for c in d.iterdir():
            if c.is_dir() and 'newgan' in c.name.lower():
                sous = [x for x in c.rglob('*') if x.is_dir() and x.name.lower() in ('african', 'caucasian', 'central european', 'scandinavian')]
                if sous:
                    return sous[0].parent
    return None


def etape_visages():
    if not BASE.exists():
        return 'ignorée : base mondiale absente (étape 1)'
    ng = trouver_newgan()
    if ng:
        lancer('visages_newgan.py', str(ng))
        return f'visages du pack NewGAN attribués ({ng})'
    try:
        urllib.request.urlopen('http://127.0.0.1:7860/sdapi/v1/sd-models', timeout=3)
        lancer('generer_visages_ia.py', '--moteur', 'local', '--max', '300')
        return 'portraits générés par Stable Diffusion (300 joueurs sans photo les mieux notés)'
    except Exception:
        return 'ignorée : ni dossier « NewGAN » ni Stable Diffusion local trouvés (visages dessinés par le jeu en attendant)'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--sans-lancer', action='store_true')
    ap.add_argument('--rapide', action='store_true', help='sauter les longues collectes de fiches (étapes 10 et 11)')
    ap.add_argument('--pack', help='chemin du ZIP ou du dossier Football_Monde à installer (sinon : le plus récent trouvé)')
    a = ap.parse_args()
    global PACK_CHOISI
    PACK_CHOISI = a.pack
    DOSSIER_JEU_DONNEES.mkdir(parents=True, exist_ok=True)
    JOURNAL.write_text('', encoding='utf-8')
    base_ok = lambda: BASE.exists()
    etapes = [
        ('Pack Football_Monde (base, portraits, logos)', etape_pack),
        ('Registre reep (liens Wikidata, Transfermarkt, EA)', lambda: (lancer('importer_reep.py'), 'liens à jour')[1] if base_ok() else 'ignorée : base absente'),
        ('Transfermarkt (effectifs actuels, valeurs, contrats)', lambda: (lancer('importer_transfermarkt.py'), 'données à jour')[1] if base_ok() else 'ignorée : base absente'),
        ('ClubElo (force des clubs)', lambda: (lancer('importer_clubelo.py'), 'classement Elo à jour')[1] if base_ok() else 'ignorée : base absente'),
        ('Maillots réels', lambda: (lancer('importer_maillots.py'), 'maillots à jour')[1] if base_ok() else 'ignorée : base absente'),
        ('Wikidata (entraîneurs, photos et logos libres)', lambda: (lancer('enrichir_wikidata.py'), 'données à jour')[1] if base_ok() else 'ignorée : base absente'),
        ('openfootball (palmarès, championnats européens)', etape_openfootball),
        ('Nationalités des joueurs du monde étendu', lambda: (lancer('nationalites_monde.py'), 'nationalités appariées (nom + âge)')[1]),
        ('Visages des joueurs sans photo', etape_visages),
    ]
    if not a.rapide:
        etapes += [
            ('Fiches FM26 des clubs du jeu et joueurs libres (FMInside, long)', lambda: (lancer('enrichir_effectifs.py', '--tout', '--libres', '--pages-libres', '0'), 'fiches complétées (relancer pour reprendre si interrompu)')[1]),
            ('Complément Football Manager Blog (1 000 fiches)', lambda: (lancer('importer_fmblog.py', '--limite', '1000', '--workers', '4'), lancer('auditer_couverture_fmi.py'), 'complément à jour')[2]),
        ]
    etat = {'debut': datetime.datetime.now().isoformat(timespec='seconds'), 'fini': False, 'etapes': []}
    ecrire('Installation complète de Manager Foot — chaque étape complète la base, une étape en échec n\'arrête pas les autres.', etat)
    for i, (nom, f) in enumerate(etapes, 1):
        etat['etapes'].append({'nom': nom, 'statut': 'en cours'})
        ecrire(f'Étape {i}/{len(etapes)} : {nom}…', etat)
        t0 = time.time()
        try:
            res, ok = f(), True
        except Exception as e:
            res, ok = f'échec : {str(e)[:200]}', False
        etat['etapes'][-1] = {'nom': nom, 'statut': 'ok' if ok and not str(res).startswith('ignorée') else 'ignorée' if ok else 'échec', 'detail': res, 'secondes': round(time.time() - t0)}
        ecrire(f'  → {res} ({round(time.time() - t0)} s)', etat)
    etat['fini'] = True
    etat['fin'] = datetime.datetime.now().isoformat(timespec='seconds')
    ecrire('Bilan :', etat)
    for e in etat['etapes']:
        ecrire(f"  {'✔' if e['statut'] == 'ok' else '–' if e['statut'] == 'ignorée' else '✘'} {e['nom']} : {e['detail']}")
    if not a.sans_lancer:
        ecrire('Lancement du jeu…')
        subprocess.run([sys.executable, str(OUTILS / 'serveur.py'), '--ouvrir'], cwd=str(RACINE_JEU))


if __name__ == '__main__':
    main()
