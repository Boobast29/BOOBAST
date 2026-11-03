"""Test de outils/visages_newgan.py avec un faux pack NewGAN (aucune donnée réelle touchée).

    python outils/tests_visages_newgan.py
"""
import base64, os, pathlib, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
tmp = pathlib.Path(tempfile.mkdtemp())
import commun
commun.BASE = tmp / 'base.sqlite'; commun.DOSSIER_JEU_DONNEES = tmp; commun.CACHE_IMAGES = tmp / 'cache_images'
import images
images.CACHE_IMAGES = commun.CACHE_IMAGES
import importer_monde, visages_newgan as vn, scenario
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
pack = tmp / 'NewGAN'
for g in ['african', 'Central European', 'Scandinavian', 'MENA', 'Asian']:
    (pack / g).mkdir(parents=True)
    for i in range(40):
        (pack / g / f'{i:03d}.png').write_bytes(PNG + bytes([i]))
con = commun.connexion(); con.executescript(importer_monde.SCHEMA)
nats = ['France'] * 60 + ['Norvège'] * 10 + ['Japon'] * 5 + ['Maroc'] * 5
for i, n in enumerate(nats):
    con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance, nat, poste, club_id, qualite, niveau99, photo_url) VALUES (?,?,?,?,?,?,?,?,?,?)',
                (f'j{i}', f'Joueur {i}', f'joueur {i}', '1999-03-01', n, 'MC', 'c1', 'rated_snapshot', 70, 'http://x/p.jpg' if i == 0 else None))
con.commit()
ok = True
def verif(c, m):
    global ok
    print(('OK  ' if c else 'ÉCHEC ') + m); ok &= bool(c)
print('codes', [scenario.code_nat(n) for n in ('France', 'Norvège', 'Japon', 'Maroc')])
r = vn.executer(con, pack)
print(r)
verif(r['attribues'] == 79, 'tous les joueurs sans photo reçoivent un visage (celui qui a une photo est ignoré)')
pg = r['par_groupe']
verif(pg.get('African', 0) >= 10 and pg.get('Central European', 0) >= 25, 'France : diversité (une part de visages d\'un autre groupe)')
verif(pg.get('Scandinavian') == 10, 'Norvège → Scandinavian')
verif(pg.get('Asian') == 5, 'Japon → Asian')
verif(len({x[0] for x in con.execute("SELECT consigne FROM images_ia WHERE moteur='newgan'")}) == 79, 'chaque portrait utilisé une seule fois')
verif(scenario.visage_ia(con, 'j5'), 'signalé comme visage généré dans le scénario')
r2 = vn.executer(con, pack)
verif(r2['attribues'] == 0, 'deuxième passage : rien à refaire')
verif(vn.retirer(con) == 79, 'retrait')
sys.exit(0 if ok else 1)
