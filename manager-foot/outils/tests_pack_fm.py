"""Test de importer_pack_fm.py sur une mini-base et un mini-pack synthétiques (aucune vraie donnée touchée).

    python outils/tests_pack_fm.py
"""
import os, pathlib, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
tmp = pathlib.Path(tempfile.mkdtemp())
import commun
commun.BASE = tmp / 'base.sqlite'; commun.DOSSIER_JEU_DONNEES = tmp; commun.CACHE_IMAGES = tmp / 'cache_images'
import importer_monde, images, importer_pack_fm, scenario
images.CACHE_IMAGES = commun.CACHE_IMAGES; importer_pack_fm.CACHE_IMAGES = commun.CACHE_IMAGES
con = commun.connexion(); con.executescript(importer_monde.SCHEMA)
for i, nom, ddn in [('j1', 'Kylian Mbappé', '1998-12-20'), ('j2', 'Jean Dupont', '1990-01-01'), ('j3', 'Jean Dupont', '1995-01-01')]:
    con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance) VALUES (?,?,?,?)', (i, nom, commun.normaliser(nom), ddn))
con.execute("INSERT INTO clubs(id, nom, nom_norm, pays) VALUES ('c1','Paris Saint-Germain','paris saint germain','France')")
con.commit()
PNG = b'\x89PNG\r\n\x1a\n' + b'\0' * 64
# pack de visages façon FM : fichiers nommés par UID + config.xml
faces = tmp / 'faces'; faces.mkdir()
for uid in ('85139014', '111', '222', '999'):
    (faces / f'{uid}.png').write_bytes(PNG)
(faces / 'config.xml').write_text('<record>\n<list id="maps">' + ''.join(f'<record from="{u}" to="graphics/pictures/person/{u}/portrait"/>' for u in ('85139014', '111', '222', '999')) + '</list></record>')
liste = tmp / 'joueurs.html'
liste.write_text('<table><tr><th>UID</th><th>Nom</th><th>Date de naissance</th></tr>'
                 '<tr><td>85139014</td><td>Kylian Mbappé</td><td>20/12/1998 (27 ans)</td></tr>'
                 '<tr><td>111</td><td>Jean Dupont</td><td>01/01/1995</td></tr>'
                 '<tr><td>333</td><td>Sans Image</td><td>01/01/2000</td></tr>'
                 '<tr><td>999</td><td>Inconnu Total</td><td></td></tr></table>', encoding='utf-8')
logos = tmp / 'logos'; logos.mkdir(); (logos / '583.png').write_bytes(PNG)
liste_c = tmp / 'clubs.txt'
liste_c.write_text('| UID | Club | Pays |\n| 583 | Paris Saint-Germain | France |\n', encoding='utf-8')
sys.argv = ['x', '--pack', str(faces), '--liste', str(liste), '--type', 'joueurs']; importer_pack_fm.main()
sys.argv = ['x', '--pack', str(logos), '--liste', str(liste_c), '--type', 'logos']; importer_pack_fm.main()
etat = {(r['type'], r['id']): r['statut'] for r in con.execute('SELECT * FROM images')}
assert etat == {('joueur', 'j1'): 'manuel', ('joueur', 'j3'): 'manuel', ('club', 'c1'): 'manuel'}, etat
assert scenario.image_manuelle(con, 'joueur', 'j1') and not scenario.image_manuelle(con, 'joueur', 'j2')
res = images.Ressources(commun.connexion, None)
assert res.trouver(con, 'club', 'c1', telecharger=False), 'logo introuvable'
sys.argv = ['x', '--retirer', '--type', 'joueurs']; importer_pack_fm.main()
assert con.execute("SELECT count(*) FROM images WHERE type='joueur'").fetchone()[0] == 0
print('OK : visages par config.xml + date de naissance (homonymes départagés), logos par liste texte, retrait.')
