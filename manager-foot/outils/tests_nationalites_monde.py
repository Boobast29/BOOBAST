"""Test de outils/nationalites_monde.py : vrais joueurs du pack France apparié sur une mini-base (synthétique).

    python outils/tests_nationalites_monde.py
"""
import gzip, json, os, pathlib, sys, tempfile, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
tmp = pathlib.Path(tempfile.mkdtemp())
import commun
commun.BASE = tmp / 'base.sqlite'; commun.DOSSIER_JEU_DONNEES = tmp
import importer_monde, nationalites_monde as nm
con = commun.connexion(); con.executescript(importer_monde.SCHEMA)
packs = tmp / 'packs'; packs.mkdir()
shutil.copy(commun.RACINE_JEU / 'packs' / 'monde-france.json.gz', packs)
d = json.load(gzip.open(packs / 'monde-france.json.gz', 'rt', encoding='utf-8'))
J = [p for c in d['clubs'] for p in c['players']][:6]
# base : 3 joueurs connus (bon âge), 1 mauvais âge, 1 homonyme ambigu (deux nationalités)
for i, (p, nat, age) in enumerate([(J[0], 'Senegal', J[0]['age']), (J[1], 'France', J[1]['age']), (J[2], 'Morocco', J[2]['age'] + 1), (J[3], 'Brazil', J[3]['age'] + 6)]):
    con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance, nat, poste, qualite) VALUES (?,?,?,?,?,?,?)', (f'j{i}', p['name'], commun.normaliser(p['name']), f'{2026 - age}-01-01', nat, 'MC', 'rated_snapshot'))
for k, nat in enumerate(['Spain', 'Italy']):
    con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance, nat, poste, qualite) VALUES (?,?,?,?,?,?,?)', (f'h{k}', J[4]['name'], commun.normaliser(J[4]['name']), f"{2026 - J[4]['age']}-01-01", nat, 'MC', 'rated_snapshot'))
con.commit()
r = nm.executer(con, packs)
res = json.loads((packs / 'nationalites-monde.json').read_text())
ok = True
def verif(c, m):
    global ok
    print(('OK  ' if c else 'ÉCHEC ') + m); ok &= bool(c)
print(r)
verif(res.get(str(J[0]['fmUid'])) == 'SEN' and res.get(str(J[1]['fmUid'])) == 'FRA', 'nom + âge identiques : nationalité trouvée')
verif(res.get(str(J[2]['fmUid'])) == 'MAR', 'âge à ±1 an accepté')
verif(str(J[3]['fmUid']) not in res, 'âge trop différent : pas de correspondance')
verif(str(J[4]['fmUid']) not in res, 'homonymes de deux nationalités : ignoré (pas de devinette)')
sys.exit(0 if ok else 1)
