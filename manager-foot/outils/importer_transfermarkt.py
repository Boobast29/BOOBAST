"""transfermarkt-datasets (CC0) : entraîneurs, stades, valeurs marchandes, contrats et transferts réels.

    python outils/importer_transfermarkt.py                  # télécharge les CSV (~60 Mo compressés)
    python outils/importer_transfermarkt.py --dossier CHEMIN # CSV déjà téléchargés (clubs.csv[.gz], players.csv[.gz], transfers.csv[.gz])

Source : https://github.com/dcaribou/transfermarkt-datasets (licence CC0 1.0). Couverture : premières divisions
(Premier League, Ligue 1, Bundesliga, LaLiga, Serie A…) et joueurs passés par ces championnats.
Tables créées : tm_clubs, tm_joueurs, tm_transferts, tm_saisons (statistiques par saison), tm_valeurs (historique des valeurs) ; liens club -> club Transfermarkt (vote des joueurs de l'effectif).
Les fiches d'origine ne sont pas modifiées ; le scénario lit ces tables en complément.
"""
import argparse
import csv
import gzip
import io
import os
import pathlib
import sys
import time
import urllib.request
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402

URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/{}.csv.gz'
FICHIERS = ('clubs', 'players', 'transfers', 'appearances', 'player_valuations')
SCHEMA = """
CREATE TABLE IF NOT EXISTS tm_clubs(tm TEXT PRIMARY KEY, nom TEXT, championnat TEXT, entraineur TEXT, stade TEXT, places INTEGER,
  valeur_totale INTEGER, effectif INTEGER, age_moyen REAL, etrangers INTEGER, url TEXT);
CREATE TABLE IF NOT EXISTS tm_joueurs(tm TEXT PRIMARY KEY, nom TEXT, club_tm TEXT, naissance TEXT, nat TEXT, poste TEXT, sous_poste TEXT,
  pied TEXT, taille INTEGER, valeur INTEGER, valeur_max INTEGER, agent TEXT, fin_contrat TEXT, selections INTEGER, buts_selection INTEGER,
  photo_url TEXT, derniere_saison INTEGER);
CREATE INDEX IF NOT EXISTS tmj_club ON tm_joueurs(club_tm);
CREATE TABLE IF NOT EXISTS tm_transferts(joueur_tm TEXT, date TEXT, saison TEXT, de_tm TEXT, de_nom TEXT, vers_tm TEXT, vers_nom TEXT,
  indemnite INTEGER, valeur INTEGER);
CREATE INDEX IF NOT EXISTS tmt_j ON tm_transferts(joueur_tm);
CREATE TABLE IF NOT EXISTS tm_saisons(joueur_tm TEXT, saison TEXT, matchs INTEGER, minutes INTEGER, buts INTEGER, passes INTEGER,
  jaunes INTEGER, rouges INTEGER, PRIMARY KEY(joueur_tm, saison));
CREATE TABLE IF NOT EXISTS tm_valeurs(joueur_tm TEXT, date TEXT, valeur INTEGER, club_tm TEXT, PRIMARY KEY(joueur_tm, date));
CREATE TABLE IF NOT EXISTS liens(type TEXT, id TEXT, qid TEXT, reep_id TEXT, methode TEXT, confiance REAL, PRIMARY KEY(type, id));
CREATE TABLE IF NOT EXISTS liens_tm(type TEXT, id TEXT, tm TEXT, methode TEXT, confiance REAL, PRIMARY KEY(type, id));
"""


def ouvrir(dossier, nom):
    for ext in ('.csv', '.csv.gz'):
        p = dossier / (nom + ext)
        if p.is_file():
            return io.TextIOWrapper(gzip.open(p), encoding='utf-8') if ext.endswith('gz') else open(p, encoding='utf-8')
    return None


def telecharger(dossier):
    dossier.mkdir(parents=True, exist_ok=True)
    for n in FICHIERS:
        p = dossier / (n + '.csv.gz')
        if p.is_file():
            continue
        print(f'Téléchargement {n}.csv.gz…', flush=True)
        req = urllib.request.Request(URL.format(n), headers={'User-Agent': 'ManagerFoot/1.0 (jeu personnel)'})
        with urllib.request.urlopen(req, timeout=180) as r:
            p.write_bytes(r.read())


def entier(x):
    try:
        return int(float(x)) if x not in (None, '') else None
    except ValueError:
        return None


def importer(con, dossier, verbeux=True):
    con.executescript(SCHEMA)
    t0 = time.perf_counter()
    st = {}
    with con:
        f = ouvrir(dossier, 'clubs')
        if f:
            con.execute('DELETE FROM tm_clubs')
            rows = [(r['club_id'], r['name'], r.get('domestic_competition_id'), r.get('coach_name') or None, r.get('stadium_name') or None,
                     entier(r.get('stadium_seats')), entier(r.get('total_market_value')), entier(r.get('squad_size')),
                     float(r['average_age']) if r.get('average_age') else None, entier(r.get('foreigners_number')), r.get('url'))
                    for r in csv.DictReader(f)]
            con.executemany('INSERT OR REPLACE INTO tm_clubs VALUES (?,?,?,?,?,?,?,?,?,?,?)', rows); st['clubs'] = len(rows)
        f = ouvrir(dossier, 'players')
        if f:
            con.execute('DELETE FROM tm_joueurs')
            rows = [(r['player_id'], r['name'], r.get('current_club_id') or None, (r.get('date_of_birth') or '')[:10] or None,
                     r.get('country_of_citizenship') or None, r.get('position') or None, r.get('sub_position') or None, r.get('foot') or None,
                     entier(r.get('height_in_cm')), entier(r.get('market_value_in_eur')), entier(r.get('highest_market_value_in_eur')),
                     r.get('agent_name') or None, (r.get('contract_expiration_date') or '')[:10] or None, entier(r.get('international_caps')),
                     entier(r.get('international_goals')), r.get('image_url') or None, entier(r.get('last_season')))
                    for r in csv.DictReader(f)]
            con.executemany('INSERT OR REPLACE INTO tm_joueurs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', rows); st['joueurs'] = len(rows)
        f = ouvrir(dossier, 'transfers')
        if f:
            con.execute('DELETE FROM tm_transferts')
            rows = [(r['player_id'], (r.get('transfer_date') or '')[:10], r.get('transfer_season'), r.get('from_club_id'), r.get('from_club_name'),
                     r.get('to_club_id'), r.get('to_club_name'), entier(r.get('transfer_fee')), entier(r.get('market_value_in_eur')))
                    for r in csv.DictReader(f)]
            con.executemany('INSERT INTO tm_transferts VALUES (?,?,?,?,?,?,?,?,?)', rows); st['transferts'] = len(rows)
        f = ouvrir(dossier, 'appearances')
        if f:  # agrégat par joueur et par saison (juillet -> juin) : matchs, minutes, buts, passes décisives, cartons
            agg = {}
            for r in csv.DictReader(f):
                d = r.get('date') or ''
                if len(d) < 7:
                    continue
                y, m = int(d[:4]), int(d[5:7])
                sa = f'{y}/{(y + 1) % 100:02d}' if m >= 7 else f'{y - 1}/{y % 100:02d}'
                a = agg.setdefault((r['player_id'], sa), [0, 0, 0, 0, 0, 0])
                a[0] += 1; a[1] += entier(r.get('minutes_played')) or 0; a[2] += entier(r.get('goals')) or 0
                a[3] += entier(r.get('assists')) or 0; a[4] += entier(r.get('yellow_cards')) or 0; a[5] += entier(r.get('red_cards')) or 0
            con.execute('DELETE FROM tm_saisons')
            con.executemany('INSERT OR REPLACE INTO tm_saisons VALUES (?,?,?,?,?,?,?,?)', [(k[0], k[1], *v) for k, v in agg.items()]); st['saisons_joueurs'] = len(agg)
        f = ouvrir(dossier, 'player_valuations')
        if f:  # historique de la valeur marchande (courbe sur la fiche joueur)
            con.execute('DELETE FROM tm_valeurs')
            rows = [(r['player_id'], (r.get('date') or '')[:10], entier(r.get('market_value_in_eur')), r.get('current_club_id') or None)
                    for r in csv.DictReader(f) if r.get('date')]
            con.executemany('INSERT OR REPLACE INTO tm_valeurs VALUES (?,?,?,?)', rows); st['valeurs'] = len(rows)
    st.update(lier(con))
    if verbeux:
        print(f'transfermarkt-datasets : {st} ({time.perf_counter() - t0:.1f} s)', flush=True)
    return st


def lier(con):
    """Club de la base -> club Transfermarkt : vote majoritaire des joueurs de l'effectif (tm_id -> club actuel)."""
    n = 0
    with con:
        con.execute("DELETE FROM liens_tm WHERE type='club'")
        votes = {}
        for r in con.execute('SELECT j.club_id, t.club_tm FROM joueurs j JOIN tm_joueurs t ON t.tm = j.tm_id WHERE j.club_id IS NOT NULL AND t.club_tm IS NOT NULL'):
            votes.setdefault(r['club_id'], Counter())[r['club_tm']] += 1
        for cid, v in votes.items():
            (tm, k), tot = v.most_common(1)[0], sum(v.values())
            if k >= 3 and k / tot >= .6:
                con.execute('INSERT OR REPLACE INTO liens_tm VALUES (?,?,?,?,?)', ('club', cid, tm, f'vote {k}/{tot}', round(k / tot, 2))); n += 1
    return {'clubs_lies': n}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dossier', help='dossier contenant clubs/players/transfers .csv ou .csv.gz')
    a = ap.parse_args()
    dossier = pathlib.Path(a.dossier) if a.dossier else commun.DOSSIER_JEU_DONNEES / 'transfermarkt'
    if not a.dossier:
        telecharger(dossier)
    importer(commun.connexion(), dossier)


if __name__ == '__main__':
    main()
