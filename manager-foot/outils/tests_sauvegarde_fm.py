"""Test de importer_sauvegarde_fm.py avec des objets au format de fmsave (aucune vraie sauvegarde nécessaire).

    python outils/tests_sauvegarde_fm.py
"""
import datetime, json, os, pathlib, sys, tempfile
from types import SimpleNamespace as N
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importer_sauvegarde_fm as isf

ATTRS = ['crossing', 'dribbling', 'finishing', 'heading', 'long_shots', 'marking', 'off_the_ball', 'passing', 'penalty_taking', 'tackling', 'vision',
         'handling', 'aerial_reach', 'command_of_area', 'communication', 'kicking', 'throwing', 'anticipation', 'decisions', 'one_on_ones', 'positioning',
         'reflexes', 'first_touch', 'technique', 'flair', 'corners', 'teamwork', 'work_rate', 'acceleration', 'free_kick_taking', 'strength', 'stamina',
         'pace', 'jumping_reach', 'leadership', 'balance', 'bravery', 'aggression', 'agility', 'determination', 'composure', 'concentration']
POS = ['gk', 'sw', 'dl', 'dc', 'dr', 'dm', 'ml', 'mc', 'mr', 'aml', 'amc', 'amr', 'stc', 'wbl', 'wbr']


def joueur(uid, nom, club, nat, base, poste, gb=1, fin=None):
    at = {k: base for k in ATTRS}
    for k in ('handling', 'aerial_reach', 'command_of_area', 'kicking', 'one_on_ones', 'reflexes'):
        at[k] = gb
    if fin:
        at['finishing'] = fin
    pos = {k: 1 for k in POS}; pos[poste] = 20
    return N(uid=uid, unique_id=1000 + uid, name=nom, first_name=None, last_name=None, age=25, nation_id=nat, club_uid=club,
             attributes=N(**at), positions=N(**pos), natural_positions=(), left_foot=8, right_foot=20,
             personality=N(professionalism=17, ambition=10, loyalty=10, temperament=12), ability=N(current=140, potential=170),
             contract=N(end=datetime.date(2029, 6, 30)))


clubs = [N(uid=1, unique_id=5001, name='Paris Saint-Germain', short_name='PSG', reputation=9000), N(uid=2, unique_id=5002, name='Stade Brestois 29', short_name='SB29', reputation=6000)]
tables = [N(competition_id=77, competition_name=None, club_count=2, rows=[N(club_uid=2, position=2, club_name='Brest'), N(club_uid=1, position=1, club_name='PSG')])]
nations = [N(nation_id=0, database_id=769), N(nation_id=1, database_id=999999)]  # 769 = France dans la table FM ; 999999 inconnu
players = [joueur(1, 'Buteur Test', 1, 0, 12, 'stc', fin=19), joueur(2, 'Gardien Test', 2, 1, 9, 'gk', gb=17), joueur(3, 'Hors Ligue', 3, 0, 15, 'mc')]
m = isf.construire(players, clubs, tables, nations, [77], ['Ligue 1'], 'BEL', datetime.date(2026, 8, 1))
psg, brest = m['clubs']
assert psg['name'] == 'Paris Saint-Germain' and psg['div'] == 1 and len(m['clubs']) == 2, m['clubs']
b = psg['players'][0]; g = brest['players'][0]
assert b['pos'] == 'BU' and g['pos'] == 'GB', (b['pos'], g['pos'])
assert b['attrs']['fin'] > b['attrs']['tac'] and g['attrs']['gar'] >= 15, (b['attrs'], g['attrs'])
assert b['detail99']['attacking_finishing'] == round(19 * 99 / 20), b['detail99']
assert b['nat'] == 'FRA', b['nat']
assert g['nat'] == 'BEL', g['nat']  # nation inconnue -> pays par défaut
assert b['foot'] == 'Droit' and b['pers'] == 'Professionnel' and b['contract'] == 3 and b['paEcart'] == 30 and b['fmUid'] == 1001
# images reliées par identifiant unique FM (config.xml du pack)
tmp = pathlib.Path(tempfile.mkdtemp()); faces = tmp / 'faces'; faces.mkdir()
(faces / 'x.png').write_bytes(b'\x89PNG\r\n\x1a\n' + b'\0' * 32)
(faces / 'config.xml').write_text('<record from="x" to="graphics/pictures/person/1001/portrait"/>')
isf.RACINE = tmp
assert isf.relier_images(m, visages=faces) == 1 and b['photo'] == 'fm_images/p1001.png' and (tmp / 'fm_images/p1001.png').exists()
print('OK :', json.dumps(m['_bilan'], ensure_ascii=False), '| 769 =', isf.NATIONS_FM.get('769'), '| 765 =', isf.NATIONS_FM.get('765'))
# fichiers .lnc (UTF-8 et UTF-16) : vrais noms des compétitions et des clubs
lnc = tmp / 'lnc'; lnc.mkdir()
(lnc / 'clubs.lnc').write_text('# commentaire\n"CLUB_LONG_NAME_CHANGE" 5001 "Paris Saint-Germain Football Club" ""\n"CLUB_SHORT_NAME_CHANGE" 5001 "Paris SG" ""\n', encoding='utf-8')
(lnc / 'comps.lnc').write_bytes('"COMP_LONG_NAME_CHANGE" 77 "Ligue 1 McDonald\'s" ""\n"COMP_SHORT_NAME_CHANGE" 77 "Ligue 1" ""\n'.encode('utf-16'))
comps, noms_clubs = isf.lire_lnc(lnc)
assert comps == {77: "Ligue 1 McDonald's"} and noms_clubs[5001] == {'long': 'Paris Saint-Germain Football Club', 'court': 'Paris SG'}, (comps, noms_clubs)
m2 = isf.construire(players, clubs, tables, nations, [77], None, 'BEL', datetime.date(2026, 8, 1), noms_clubs=noms_clubs)
assert m2['clubs'][0]['name'] == 'Paris SG', m2['clubs'][0]['name']
print('OK : fichiers .lnc (UTF-8 + UTF-16), vrais noms appliqués.')
