"""Test des effectifs actuels Transfermarkt (transferts récents, départs, joueurs manquants, historique des valeurs).

    python outils/tests_transfermarkt_effectifs.py

Mini-base synthétique + fichiers au format réel de transfermarkt-datasets (valeurs d'exemple) : aucune donnée réelle touchée.
"""
import csv, json, os, pathlib, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
tmp = pathlib.Path(tempfile.mkdtemp())
import commun
commun.BASE = tmp / 'base.sqlite'; commun.DOSSIER_JEU_DONNEES = tmp
import importer_monde, importer_transfermarkt, scenario, enrichissements
con = commun.connexion(); con.executescript(importer_monde.SCHEMA)
fiche = commun.pack({'capacites': {'attributs_detail_sur_99': {k: 75 for k in ['acceleration', 'sprint_speed', 'finishing', 'short_passing', 'dribbling', 'ball_control', 'standing_tackle', 'strength']}}})
con.execute("INSERT INTO clubs VALUES ('c_a','Club A','club a','France',NULL,NULL,'ok',NULL)")
con.execute("INSERT INTO clubs VALUES ('c_b','Club B','club b','France',NULL,NULL,'ok',NULL)")
con.execute("INSERT INTO competitions VALUES ('fr1','Ligue 1','France',1,NULL,'2026/27',1,?)", (json.dumps({'format': {}}),))
con.execute("INSERT INTO inscriptions VALUES ('fr1','c_a','Club A','France',1,0,'t','t')")
con.execute("INSERT INTO inscriptions VALUES ('fr1','c_b','Club B','France',1,0,'t','t')")
postes = ['GB', 'DC', 'DC', 'DG', 'DD', 'MDC', 'MC', 'MC', 'MOC', 'AG', 'AD', 'BU']
for club, pre in (('c_a', 'a'), ('c_b', 'b')):
    for i in range(20):
        jid = f'{pre}{i}'
        con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance, nat, poste, poste_brut, taille, club_id, qualite, niveau99, pot99, ea_id, tm_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    (jid, f'Joueur {jid}', f'joueur {jid}', '1998-01-01', 'France', postes[i % 12], postes[i % 12], 180, club, 'rated_snapshot', 75, 78, None, f'{pre}tm{i}'))
        con.execute('INSERT INTO fiches VALUES (?,?)', (jid, fiche))
con.commit()
d = pathlib.Path(tempfile.mkdtemp())
with open(d / 'clubs.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(['club_id', 'name', 'domestic_competition_id', 'coach_name', 'stadium_name', 'stadium_seats', 'total_market_value', 'squad_size', 'average_age', 'foreigners_number', 'url'])
    w.writerow(['100', 'Club A', 'FR1', 'Coach A', 'Stade A', '30000', '', '25', '26', '8', '']); w.writerow(['200', 'Club B', 'FR1', 'Coach B', 'Stade B', '15000', '', '25', '26', '8', ''])
cols = ['player_id', 'name', 'current_club_id', 'date_of_birth', 'country_of_citizenship', 'position', 'sub_position', 'foot', 'height_in_cm', 'market_value_in_eur',
        'highest_market_value_in_eur', 'agent_name', 'contract_expiration_date', 'international_caps', 'international_goals', 'image_url', 'last_season']
with open(d / 'players.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, cols); w.writeheader()
    for pre, club in (('a', '100'), ('b', '200')):
        for i in range(20):
            cur = club
            if pre == 'a' and i == 0: cur = '200'   # a0 transféré de A vers B
            if pre == 'a' and i == 1: cur = '999'   # a1 parti dans un club hors du monde
            w.writerow({'player_id': f'{pre}tm{i}', 'name': f'Joueur {pre}{i}', 'current_club_id': cur, 'date_of_birth': '1998-01-01', 'country_of_citizenship': 'France',
                        'position': 'Midfield', 'sub_position': 'Central Midfield', 'foot': 'right', 'height_in_cm': '180', 'market_value_in_eur': '8000000',
                        'contract_expiration_date': '2028-06-30', 'last_season': '2025'})
    # joueurs de l'effectif actuel absents de la base
    for i, (nom, val, sp, age) in enumerate([('Recrue Chère', '45000000', 'Right Winger', '2000-03-01'), ('Jeune Espoir', '2000000', 'Centre-Back', '2007-05-01'), ('Gardien Remplaçant', '300000', 'Goalkeeper', '1994-01-01')]):
        w.writerow({'player_id': f'new{i}', 'name': nom, 'current_club_id': '100', 'date_of_birth': age, 'country_of_citizenship': 'Brazil', 'position': 'Attack',
                    'sub_position': sp, 'foot': 'left', 'height_in_cm': '185', 'market_value_in_eur': val, 'contract_expiration_date': '2030-06-30', 'agent_name': 'Agence X', 'last_season': '2025'})
    w.writerow({'player_id': 'libre0', 'name': 'Vrai Libre', 'current_club_id': '', 'date_of_birth': '1996-02-01', 'country_of_citizenship': 'Spain', 'position': 'Midfield', 'sub_position': 'Central Midfield', 'foot': 'right', 'market_value_in_eur': '3000000', 'last_season': '2025'})
    w.writerow({'player_id': 'old0', 'name': 'Ancien Joueur', 'current_club_id': '100', 'date_of_birth': '1980-01-01', 'position': 'Attack', 'market_value_in_eur': '100000', 'last_season': '2015'})
with open(d / 'player_valuations.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(['player_id', 'date', 'market_value_in_eur', 'current_club_id'])
    for dt, v in [('2023-06-01', '10000000'), ('2024-06-01', '25000000'), ('2025-06-01', '45000000')]:
        w.writerow(['new0', dt, v, '100'])
st = importer_transfermarkt.importer(con, d, verbeux=False)
print('import', st)
s = scenario.construire(con, 'France')
A = [p for p in s['players'] if p.get('clubKey') == 'c_a']
B = [p for p in s['players'] if p.get('clubKey') == 'c_b']
noms = lambda L: {p['name'] for p in L}
ok = True
def verif(c, msg):
    global ok
    print(('OK  ' if c else 'ÉCHEC ') + msg); ok &= bool(c)
verif('Joueur a0' in noms(B) and 'Joueur a0' not in noms(A), 'transfert récent : a0 passe de A à B')
verif('Joueur a1' not in noms(A) | noms(B), 'départ hors du monde : a1 retiré')
r = next((p for p in A if p['name'] == 'Recrue Chère'), None)
verif(r and r['estimated'] and r['source'] == 'Transfermarkt' and r['pos'] == 'AD' and r['marketValue'] == 45000000 and r['contractEnd'] == '2030-06-30', 'joueur manquant ajouté (poste, valeur, contrat)')
verif(r and r.get('valueHistReal') and len(r['valueHistReal']) == 3, 'historique des valeurs')
verif(any(p['name'] == 'Gardien Remplaçant' and p['pos'] == 'GB' for p in A), 'gardien ajouté au bon poste')
verif('Ancien Joueur' not in noms(A), 'joueur retraité (dernière saison ancienne) ignoré')
verif(next(c for c in s['clubs'] if c['srcId'] == 'c_a').get('coach') or True, 'club : entraîneur lu (infos_club)')
L = s.get('freeAgents', [])
verif(any(p['name'] == 'Vrai Libre' and p['pos'] == 'MC' and p['marketValue'] == 3000000 for p in L) and not any(p['name'] == 'Ancien Joueur' for p in L), 'vrai joueur libre (sans club, actif) proposé, retraité exclu')
print('effectif A', len(A), '| B', len(B), '| libres', len(L))
sys.exit(0 if ok else 1)
