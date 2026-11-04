"""Installation guidée en une commande, sans dépendances Python externes.

    python outils/tout_installer.py [ZIP-ou-dossier-Football_Monde] [--sans-lancer]
    python outils/tout_installer.py --hors-ligne --sans-lancer

Le pack mondial est distinct du ZIP du code V12. Les étapes Internet complètent
la base ; leur échec est signalé dans un bilan et n'efface jamais les données.
"""
import argparse
import datetime as dt
import json
import pathlib
import subprocess
import sys
import time

from commun import BASE, DOSSIER_JEU_DONNEES, RACINE_JEU
from catalogue_fmb import Catalogue
import installer_donnees

OUTILS = RACINE_JEU / 'outils'
JOURNAL = DOSSIER_JEU_DONNEES / 'journal_installation.txt'
ETAT = DOSSIER_JEU_DONNEES / 'etat_installation.json'


def note(message):
    print(message, flush=True)
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(message + '\n')


def enregistrer(etat):
    ETAT.write_text(json.dumps(etat, ensure_ascii=False, indent=2), encoding='utf-8')


def commande(script, *args, timeout=900):
    path = OUTILS / script
    if not path.is_file():
        raise FileNotFoundError('Module absent : ' + str(path))
    with JOURNAL.open('a', encoding='utf-8') as out:
        out.write(f'\n$ {script} {" ".join(args)}\n')
        out.flush()
        result = subprocess.run([sys.executable, str(path), *args], cwd=RACINE_JEU,
                                stdout=out, stderr=subprocess.STDOUT, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f'{script} a échoué (code {result.returncode}). Voir {JOURNAL.name}.')


def etape(etat, titre, fn, obligatoire=False):
    note('\n→ ' + titre)
    debut = time.monotonic()
    try:
        detail = fn()
        statut = 'ignorée' if detail.startswith('ignorée') else 'ok'
    except Exception as exc:
        detail = str(exc)
        statut = 'échec'
    ligne = {'nom': titre, 'statut': statut, 'obligatoire': obligatoire,
             'detail': detail, 'secondes': round(time.monotonic() - debut, 1)}
    etat['etapes'].append(ligne)
    enregistrer(etat)
    note(f'  {statut.upper()} · {detail}')
    return ligne


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('pack', nargs='?', help='ZIP complet Football_Monde ou dossier extrait')
    ap.add_argument('--sans-lancer', action='store_true', help='installe sans ouvrir le jeu')
    ap.add_argument('--hors-ligne', action='store_true', help='saute les téléchargements et enrichissements Internet')
    ap.add_argument('--rapide', action='store_true', help='installe les packs locaux, sans enrichissements Internet')
    ap.add_argument('--verifier', action='store_true', help='contrôle les fichiers sans importer la base')
    a = ap.parse_args(argv)
    DOSSIER_JEU_DONNEES.mkdir(parents=True, exist_ok=True)
    JOURNAL.write_text('', encoding='utf-8')
    etat = {'debut': dt.datetime.now().isoformat(timespec='seconds'), 'etapes': [], 'fini': False}
    enregistrer(etat)
    note('Manager Foot · installation et vérification')
    note('Python ' + sys.version.split()[0] + ' · ' + str(RACINE_JEU))

    def pack():
        source = pathlib.Path(a.pack).expanduser().resolve() if a.pack else installer_donnees.discover()
        if not source:
            return 'ignorée : pack mondial absent. Les cinq pays et le catalogue inclus restent jouables ; place Football_Monde_JSON_Visuels.zip à côté du jeu pour la base géante.'
        if not source.exists():
            raise FileNotFoundError('Pack introuvable : ' + str(source))
        if source.is_file():
            manifest = installer_donnees.verifier_archive(source)
        else:
            fm = installer_donnees.local_pack(source)
            manifest = json.loads((fm / 'base_geante_v8/manifest.json').read_text(encoding='utf-8'))
        if a.verifier:
            return f'{source.name} : {manifest["players"]:,} joueurs annoncés, manifeste et lots présents'
        commande('installer_donnees.py', str(source), timeout=7200)
        return f'{source.name} importé ; {manifest["players"]:,} joueurs annoncés'

    p = etape(etat, 'Pack Football Monde V12', pack, obligatoire=bool(a.pack))
    if p['statut'] == 'échec' and a.pack:
        etat['fini'] = True; enregistrer(etat)
        note('Installation arrêtée : le pack indiqué n’a pas pu être vérifié ou importé. Aucune autre source ne sera substituée.')
        return 1

    if not a.verifier:
        etape(etat, 'Catalogue FMblog inclus', lambda: (Catalogue(), '20 528 fiches joueurs indexées')[1], obligatoire=True)
        if BASE.is_file() and p['statut'] == 'ok':
            etape(etat, 'Contrôle des doublons et homonymes',
                  lambda: (commande('auditer_doublons.py'), 'rapport_doublons.json et doublons_a_verifier.csv créés')[1], obligatoire=True)
        if BASE.is_file() and not (a.hors_ligne or a.rapide):
            for titre, script in [
                ('Identifiants de référence', 'importer_reep.py'),
                ('Effectifs et historique Transfermarkt', 'importer_transfermarkt.py'),
                ('Force des clubs ClubElo', 'importer_clubelo.py'),
                ('Maillots de clubs', 'importer_maillots.py'),
                ('Photos et informations Wikidata', 'enrichir_wikidata.py'),
            ]:
                etape(etat, titre, lambda s=script: (commande(s, timeout=1800), 'données ajoutées ou mises à jour')[1])
        elif BASE.is_file():
            note('Enrichissements Internet ignorés : mode hors ligne ou rapide.')
        else:
            note('Base géante absente : enrichissements externes non applicables.')

    etat['fin'] = dt.datetime.now().isoformat(timespec='seconds')
    etat['fini'] = True
    etat['complet'] = p['statut'] == 'ok' and all(x['statut'] == 'ok' for x in etat['etapes'] if x['obligatoire'])
    enregistrer(etat)
    note('\nBilan : ' + ' · '.join(f'{x["nom"]} : {x["statut"]}' for x in etat['etapes']))
    note('Journal : ' + str(JOURNAL))
    if a.verifier:
        return 1 if any(x['statut'] == 'échec' for x in etat['etapes']) else 0
    if not a.sans_lancer:
        note('Lancement du jeu. Garde cette fenêtre ouverte pendant la partie.')
        commande('serveur.py', '--ouvrir', timeout=None)
    return 1 if any(x['statut'] == 'échec' for x in etat['etapes']) else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print('\nInstallation interrompue ; relance la même commande pour reprendre.', flush=True)
        sys.exit(130)
