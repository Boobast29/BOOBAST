"""ClubElo (http://clubelo.com) : force Elo du jour des clubs européens (internet nécessaire).

    python outils/importer_clubelo.py               # classement du jour
    python outils/importer_clubelo.py --date 2026-08-01
    python outils/importer_clubelo.py --fichier elo.csv   # CSV déjà téléchargé (Rank,Club,Country,Level,Elo,From,To)

Utilisation dans le jeu : pour les clubs sans joueurs notés (divisions inférieures), la réputation est déduite de l'Elo
au lieu d'une valeur fixe par niveau. Les clubs ayant des joueurs notés gardent leur réputation calculée sur l'effectif.
"""
import argparse
import csv
import datetime
import io
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
from importer_reep import nom_club  # noqa: E402

API = 'http://api.clubelo.com/{}'
PAYS_ELO = {'FRA': 'France', 'ENG': 'England', 'GER': 'Germany', 'ESP': 'Spain', 'ITA': 'Italy'}
# noms abrégés de ClubElo -> nom complet
ALIAS = {'Paris SG': 'Paris Saint-Germain', 'Man City': 'Manchester City', 'Man United': 'Manchester United', 'Bayern': 'Bayern Munchen',
         'Inter': 'Internazionale', 'Atletico': 'Atletico Madrid', 'Sheffield United': 'Sheffield United', 'Forest': 'Nottingham Forest',
         'Gladbach': 'Borussia Monchengladbach', 'Dortmund': 'Borussia Dortmund', 'Leverkusen': 'Bayer Leverkusen', 'Wolves': 'Wolverhampton',
         'Spurs': 'Tottenham Hotspur', 'Saint-Etienne': 'Saint Etienne', 'Betis': 'Real Betis', 'Sociedad': 'Real Sociedad'}
SCHEMA = """
CREATE TABLE IF NOT EXISTS clubelo(nom TEXT, nom_norm TEXT, pays TEXT, niveau INTEGER, elo REAL, date TEXT, PRIMARY KEY(nom, pays));
CREATE TABLE IF NOT EXISTS liens_elo(club_id TEXT PRIMARY KEY, nom TEXT, elo REAL, methode TEXT);
"""


def elo_vers_rep(elo):
    """Elo -> réputation du jeu (30-95) : ~1300 (bas de 3e division) -> 38, ~1650 (milieu de D1) -> 66, ~2000 -> 93."""
    return max(30, min(95, round(38 + (elo - 1300) * .08)))


def importer(con, texte, date):
    con.executescript(SCHEMA)
    lignes = list(csv.DictReader(io.StringIO(texte)))
    with con:
        con.execute('DELETE FROM clubelo')
        con.executemany('INSERT OR REPLACE INTO clubelo VALUES (?,?,?,?,?,?)',
                        [(r['Club'], nom_club(r['Club']), PAYS_ELO.get(r['Country'], r['Country']), int(r['Level'] or 0), float(r['Elo']), date)
                         for r in lignes if r.get('Elo')])
        con.execute('DELETE FROM liens_elo')
        elo = {}
        for r in con.execute('SELECT * FROM clubelo').fetchall():
            elo.setdefault(r['pays'], []).append((nom_club(ALIAS.get(r['nom'], r['nom'])).split(), r))
        n = 0
        for c in con.execute('SELECT id, nom, pays FROM clubs').fetchall():
            bt = nom_club(c['nom'] or '').split()
            if not bt:
                continue
            # chaque mot du nom ClubElo est le début d'un mot du nom de la base (« Brest » -> « Stade Brestois 29 »)
            cands = [r for toks, r in elo.get(c['pays'], []) if toks and all(any(b.startswith(t) for b in bt) for t in toks)]
            if len(cands) > 1:  # plusieurs : on garde le nom ClubElo le plus long (le plus précis)
                cands.sort(key=lambda r: -len(r['nom_norm']))
                cands = cands[:1] if len(cands[0]['nom_norm']) > len(cands[1]['nom_norm']) else []
            if len(cands) == 1:
                con.execute('INSERT OR REPLACE INTO liens_elo VALUES (?,?,?,?)', (c['id'], cands[0]['nom'], cands[0]['elo'], 'nom+pays')); n += 1
    print(f'ClubElo {date} : {len(lignes)} clubs, {n} reliés à la base', flush=True)
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--date', default=datetime.date.today().isoformat())
    ap.add_argument('--fichier')
    a = ap.parse_args()
    if a.fichier:
        texte = open(a.fichier, encoding='utf-8').read()
    else:
        req = urllib.request.Request(API.format(a.date), headers={'User-Agent': 'ManagerFoot/1.0 (jeu personnel)'})
        texte = urllib.request.urlopen(req, timeout=60).read().decode('utf-8')
    importer(commun.connexion(), texte, a.date)


if __name__ == '__main__':
    main()
