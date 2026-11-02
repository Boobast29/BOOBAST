"""Maillots réels (open-jersey-db, licence ODbL 1.0) : couleurs, équipementier et sponsor principal.

    python outils/importer_maillots.py                 # télécharge dist/teams.json et dist/kits.json depuis GitHub
    python outils/importer_maillots.py --dossier DIST  # fichiers déjà présents

Source : https://github.com/dmnk-rdr/open-jersey-db — « Contains information from open-jersey-db, which is made available
under the Open Database License (ODbL) ». Les données importées restent sous ODbL (attribution affichée dans le jeu).
Usage dans le jeu : couleurs du club (maillot domicile), équipementier et sponsor sur la fiche club.
"""
import argparse
import json
import os
import pathlib
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
from importer_reep import nom_club  # noqa: E402

BRUT = 'https://raw.githubusercontent.com/dmnk-rdr/open-jersey-db/main/dist/{}'
PAYS = {'France': 'FR', 'England': 'GB', 'Germany': 'DE', 'Spain': 'ES', 'Italy': 'IT'}
# noms de couleurs (allemand / anglais de la base) -> hexadécimal
COULEURS = {'weiß': '#ffffff', 'weiss': '#ffffff', 'white': '#ffffff', 'off-white': '#f4f1e8', 'creme': '#f3ead3', 'chalk': '#f3ead3', 'cloud': '#f3ead3',
            'rot': '#d32f2f', 'red': '#d32f2f', 'dunkelrot': '#8e1b1b', 'bordeaux': '#6d1a2c', 'vinotinto': '#6d1a2c', 'koralle': '#ff6f61',
            'blau': '#1565c0', 'blue': '#1565c0', 'royal': '#1e3fa8', 'hellblau': '#6cace4', 'clear blue': '#4fa3e0', 'aero': '#8fd3e8', 'mintblau': '#9fe0e0',
            'marineblau': '#0d1b3e', 'dunkelblau': '#0d2a5c', 'navy': '#0d1b3e', 'aquamarin': '#4fd1c5',
            'schwarz': '#111111', 'black': '#111111', 'grün': '#2e7d32', 'gruen': '#2e7d32', 'green': '#2e7d32', 'dunkelgrün': '#1b4d2b',
            'mintgrün': '#98e3b5', 'mint': '#98e3b5', 'gold': '#c9a227', 'gelb': '#fdd835', 'yellow': '#fdd835', 'zitronengelb': '#f4e842',
            'orange': '#f57c00', 'rosa': '#f48fb1', 'pink': '#f48fb1', 'lila': '#7b1fa2', 'lavendel': '#b39ddb', 'grau': '#9e9e9e', 'steingrau': '#8d8a85',
            'grey': '#9e9e9e', 'kupfer': '#b87333', 'copper': '#b87333', 'braun': '#6d4c41', 'dunkelbraun': '#4e342e', 'brown': '#6d4c41', 'silber': '#c0c0c0'}
SCHEMA = """CREATE TABLE IF NOT EXISTS maillots(club_id TEXT, saison TEXT, type TEXT, couleurs TEXT, noms TEXT, equipementier TEXT, sponsor TEXT,
  PRIMARY KEY(club_id, saison, type));"""


def hexa(nom):
    n = nom.lower()
    for k in sorted(COULEURS, key=len, reverse=True):  # le mot le plus précis d'abord (« dunkelblau » avant « blau »)
        if k in n:
            return COULEURS[k]
    return None


def charger(dossier, nom):
    if dossier:
        return json.load(open(pathlib.Path(dossier) / nom, encoding='utf-8'))
    req = urllib.request.Request(BRUT.format(nom), headers={'User-Agent': 'ManagerFoot/1.0 (jeu personnel)'})
    return json.loads(urllib.request.urlopen(req, timeout=60).read().decode('utf-8'))


def importer(con, teams, kits):
    teams = teams if isinstance(teams, list) else teams.get('teams', [])
    kits = kits if isinstance(kits, list) else kits.get('kits', [])
    con.executescript(SCHEMA)
    index = {}
    for t in teams:
        if t.get('sport') != 'football' or t.get('type') != 'club':
            continue
        for n in [t['name']] + (t.get('aliases') or []):
            index.setdefault(((t.get('country') or '')[:2], nom_club(n)), set()).add(t['slug'])
    lien = {}
    for c in con.execute('SELECT id, nom, pays FROM clubs').fetchall():
        s = index.get((PAYS.get(c['pays'], ''), nom_club(c['nom'] or '')))
        if s and len(s) == 1:
            lien.setdefault(next(iter(s)), []).append(c['id'])
    n = 0
    with con:
        con.execute('DELETE FROM maillots')
        for k in kits:
            if k.get('sport') != 'football' or k.get('team') not in lien:
                continue
            cols = [h for h in (hexa(x) for x in (k.get('colors') or [])) if h]
            for cid in lien[k['team']]:
                con.execute('INSERT OR REPLACE INTO maillots VALUES (?,?,?,?,?,?,?)', (cid, k['season'], k['kit_type'], json.dumps(cols),
                            ', '.join(k.get('colors') or []) or None, k.get('manufacturer'), k.get('main_sponsor'))); n += 1
    print(f'open-jersey-db : {len(lien)} clubs reliés, {n} maillots importés (ODbL)', flush=True)
    return {'clubs': len(lien), 'maillots': n}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dossier')
    a = ap.parse_args()
    importer(commun.connexion(), charger(a.dossier, 'teams.json'), charger(a.dossier, 'kits.json'))


if __name__ == '__main__':
    main()
