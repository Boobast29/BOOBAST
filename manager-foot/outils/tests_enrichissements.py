"""Test de bout en bout des enrichissements sur une mini-base synthétique (aucune donnée de la vraie base n'est touchée).

    python outils/tests_enrichissements.py CHEMIN_reep/data [sortie_scenario.json]

Utilise le vrai registre reep (CC0) ; transfermarkt-datasets et Wikidata sont simulés (format réel des fichiers / du SPARQL).
"""
import csv, gzip, json, os, pathlib, sqlite3, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
REEP = pathlib.Path(sys.argv[1])
tmp = pathlib.Path(tempfile.mkdtemp())
import commun
commun.BASE = tmp / 'base.sqlite'; commun.DOSSIER_JEU_DONNEES = tmp
import importer_monde, importer_reep, importer_transfermarkt, enrichir_wikidata, scenario, images, enrichissements
con = commun.connexion(); con.executescript(importer_monde.SCHEMA)
csv.field_size_limit(10**8)
want = {'Q21621995': 'Kylian Mbappé', 'Q20851003': 'Ousmane Dembélé'}
rows = {r['key_wikidata']: r for r in csv.DictReader(open(REEP / 'people.csv', encoding='utf-8')) if r['key_wikidata'] in want}
mb, de = rows['Q21621995'], rows['Q20851003']
print('mbappe sofifa', mb['key_sofifa'], 'tm', mb['key_transfermarkt'], '| dembele tm', de['key_transfermarkt'])
fiche = commun.pack({'capacites': {'attributs_detail_sur_99': {k: 80 for k in ['acceleration','sprint_speed','finishing','short_passing','dribbling','ball_control','stamina','strength','vision','composure','positioning','interceptions','standing_tackle','reactions','long_shots','crossing','heading_accuracy','jumping','aggression','marking','gk_diving','gk_reflexes','gk_handling','gk_positioning','gk_kicking']}}})
J = [('j1', 'Kylian Mbappé', '1998-12-20', 'France', 'BU', mb['key_sofifa'], None, 'c_psg'),        # lien EA
     ('j2', 'Ousmane Dembélé', '1997-05-15', 'France', 'AD', None, de['key_transfermarkt'], 'c_psg'),  # lien TM
     ('j3', 'Joueur Inconnu', '2000-01-01', 'France', 'MC', None, None, 'c_psg')]
for i in range(4, 22): J.append((f'j{i}', f'Joueur {i}', '1999-01-01', 'France', 'DC', None, f'9900{i}' if i < 8 else None, 'c_psg'))
for j in J:
    con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance, nat, poste, poste_brut, taille, club_id, qualite, niveau99, pot99, ea_id, tm_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                (j[0], j[1], commun.normaliser(j[1]), j[2], j[3], j[4], j[4], None, j[7], 'rated_snapshot', 85, 88, j[5], j[6]))
    con.execute('INSERT INTO fiches VALUES (?,?)', (j[0], fiche))
con.execute("INSERT INTO clubs VALUES ('c_psg','Paris Saint-Germain','paris saint germain','France',NULL,NULL,'ok',NULL)")
con.execute("INSERT INTO clubs VALUES ('c_bre','Stade Brestois 29','stade brestois 29','France',NULL,NULL,'ok',NULL)")
con.execute("INSERT INTO competitions VALUES ('fr1','Ligue 1','France',1,NULL,'2026/27',1,?)", (json.dumps({'format': {}}),))
con.execute("INSERT INTO inscriptions VALUES ('fr1','c_psg','Paris Saint-Germain','France',1,0,'t','t')")
con.execute("INSERT INTO inscriptions VALUES ('fr1','c_bre','Stade Brestois 29','France',1,0,'t','t')")
con.commit()
# 1) reep (vraies données CC0)
st = importer_reep.importer(con, REEP)
print('liens', [dict(r) for r in con.execute('SELECT type,id,qid,methode FROM liens')])
print('taille Mbappé complétée :', con.execute("SELECT taille FROM joueurs WHERE id='j1'").fetchone()[0])
# 2) transfermarkt-datasets (CSV au format du dépôt, valeurs d'exemple)
d = pathlib.Path(tempfile.mkdtemp())
with gzip.open(d / 'clubs.csv.gz', 'wt', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['club_id','club_code','name','domestic_competition_id','total_market_value','squad_size','average_age','foreigners_number','foreigners_percentage','national_team_players','stadium_name','stadium_seats','net_transfer_record','coach_name','url'])
    w.writerow(['583','paris-saint-germain','Paris Saint-Germain','FR1','1100000000','27','25.1','12','44','20','Parc des Princes','47929','-50m','Luis Enrique','u'])
with open(d / 'players.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(['player_id','name','current_club_id','current_club_name','country_of_citizenship','date_of_birth','position','sub_position','foot','height_in_cm','market_value_in_eur','highest_market_value_in_eur','agent_name','contract_expiration_date','international_caps','international_goals','image_url','last_season'])
    w.writerow([de['key_transfermarkt'],'Ousmane Dembélé','583','PSG','France','1997-05-15','Attack','Right Winger','both','178','100000000','150000000','Agent X','2028-06-30','50','6','',2026])
    for i in range(4, 8): w.writerow([f'9900{i}', f'Joueur {i}', '583', 'PSG', 'France', '1999-01-01', 'Defender', 'Centre-Back', 'right', '185', '5000000', '', '', '2027-06-30', '', '', '', 2026])
with open(d / 'transfers.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(['player_id','transfer_date','transfer_season','from_club_id','to_club_id','transfer_fee','market_value_in_eur','player_name','from_club_name','to_club_name'])
    w.writerow([de['key_transfermarkt'],'2023-08-12','23/24','131','583','50400000','60000000','Ousmane Dembélé','Barcelona','PSG'])
with open(d / 'appearances.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(['appearance_id','game_id','player_id','player_club_id','player_current_club_id','date','player_name','competition_id','yellow_cards','red_cards','goals','assists','minutes_played'])
    for i, (dt, g, a) in enumerate([('2025-08-17', 1, 0), ('2025-09-20', 0, 2), ('2026-02-01', 2, 1), ('2024-10-05', 1, 0)]):
        w.writerow([f'a{i}', f'g{i}', de['key_transfermarkt'], '583', '583', dt, 'Ousmane Dembélé', 'FR1', 0, 0, g, a, 90])
print('TM', importer_transfermarkt.importer(con, d, verbeux=False))
# 3) Wikidata (réponses simulées au format SPARQL JSON)
def fake(q):
    B = lambda **kw: {k: {'value': v} for k, v in kw.items()}
    if 'P286' in q:
        return {'results': {'bindings': [B(club='http://www.wikidata.org/entity/Q483020', coach='http://www.wikidata.org/entity/Q222789', coachLabel='Luis Enrique', debut='2023-07-05T00:00:00Z', dob='1970-05-08T00:00:00Z', natLabel='Spain', cimg='http://commons.wikimedia.org/wiki/Special:FilePath/Luis%20Enrique.jpg', logo='http://commons.wikimedia.org/wiki/Special:FilePath/PSG.svg', stadeLabel='Parc des Princes', cap='47929', colLabel='blue', fond='1970-08-12T00:00:00Z'),
                                         B(club='http://www.wikidata.org/entity/Q483020', colLabel='red')]}}
    if 'P54' in q:
        return {'results': {'bindings': [B(p='http://www.wikidata.org/entity/Q999001', pLabel='Jeune Réel', dob='2005-03-01T00:00:00Z', natLabel='France', posLabel='goalkeeper', img='http://commons.wikimedia.org/wiki/Special:FilePath/J.jpg'),
                                         B(p='http://www.wikidata.org/entity/Q21621995', pLabel='Kylian Mbappé', dob='1998-12-20T00:00:00Z', natLabel='France', posLabel='forward')]}}
    if 'P18' in q:
        return {'results': {'bindings': [B(p='http://www.wikidata.org/entity/Q21621995', img='http://commons.wikimedia.org/wiki/Special:FilePath/Kylian%20Mbapp%C3%A9.jpg')]}}
    return {'results': {'bindings': []}}
con.execute("UPDATE joueurs SET qualite='identity_archive' WHERE id IN (" + ','.join(f"'j{i}'" for i in range(6, 22)) + ")"); con.commit()  # PSG : < 18 notés -> effectif Wikidata
print('WD', enrichir_wikidata.executer(con, transport=fake))
s = scenario.construire(con, "France"); json.dump(s, open(sys.argv[2], 'w')) if len(sys.argv) > 2 else None
psg = next(c for c in s['clubs'] if c['srcId'] == 'c_psg')
print('club', {k: psg.get(k) for k in ('stadium', 'capacity', 'founded', 'coach', 'logo', 'marketValue', 'sources', 'colorsLabel')})
pl = {p['srcId']: p for p in s['players']}
print('Dembélé', {k: pl['j2'].get(k) for k in ('marketValue', 'contractEnd', 'foot', 'agent', 'seasonsReal', 'transfersReal')})
print('wd squad', [(p['srcId'], p['name'], p['pos'], p['photo'], p.get('quality')) for p in s['players'] if p['srcId'].startswith('wd:')])
R = images.Ressources(lambda: con, tmp)
print('img wd coach', R.source(con, 'wd', 'Q222789'), '| logo club', R.source(con, 'club', 'c_psg'), '| photo Mbappé', R.source(con, 'joueur', 'j1'))
import importer_clubelo
importer_clubelo.importer(con, "Rank,Club,Country,Level,Elo,From,To\n5,Paris SG,FRA,1,1950.5,2026-08-01,2026-08-02\nNone,Brest,FRA,1,1600.0,2026-08-01,2026-08-02\n", '2026-08-01')
print('elo', [dict(r) for r in con.execute('SELECT * FROM liens_elo')], 'rep Brest', enrichissements.rep_elo(con, 'c_bre'))
s2 = scenario.construire(con, 'France'); print('rep scénario Brest (sans joueurs notés)', next(c for c in s2['clubs'] if c['srcId'] == 'c_bre')['rep'])
# maillots : open-jersey-db (vraies données ODbL si le dossier dist est fourni en 3e argument)
if len(sys.argv) > 3:
    import importer_maillots
    print('maillots', importer_maillots.importer(con, importer_maillots.charger(sys.argv[3], 'teams.json'), importer_maillots.charger(sys.argv[3], 'kits.json')))
    s3 = scenario.construire(con, 'France')
    for c in s3['clubs']:
        print('maillot', c['name'], c.get('kit'), c['colors'])
