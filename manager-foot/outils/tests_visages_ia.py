"""Test de outils/generer_visages_ia.py avec un faux générateur Stable Diffusion (API AUTOMATIC1111 simulée).

    python outils/tests_visages_ia.py
"""
import base64, json, os, pathlib, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
tmp = pathlib.Path(tempfile.mkdtemp())
import commun
commun.BASE = tmp / 'base.sqlite'; commun.DOSSIER_JEU_DONNEES = tmp; commun.CACHE_IMAGES = tmp / 'cache_images'
import images
images.CACHE_IMAGES = commun.CACHE_IMAGES
import importer_monde, generer_visages_ia as gv, scenario
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
recu = []
class Faux(BaseHTTPRequestHandler):
    def do_POST(self):
        corps = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        recu.append(corps)
        out = json.dumps({'images': [base64.b64encode(PNG).decode()]}).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(out)
    def log_message(self, *a): pass
srv = HTTPServer(('127.0.0.1', 0), Faux); threading.Thread(target=srv.serve_forever, daemon=True).start()
con = commun.connexion(); con.executescript(importer_monde.SCHEMA)
for i, (nom, photo) in enumerate([('Sans Photo Un', None), ('Avec Photo', 'http://exemple/p.jpg'), ('Sans Photo Deux', None)]):
    con.execute('INSERT INTO joueurs(id, nom, nom_norm, naissance, nat, poste, club_id, qualite, niveau99, photo_url) VALUES (?,?,?,?,?,?,?,?,?,?)',
                (f'j{i}', nom, nom.lower(), '1999-03-01', 'Sénégal', 'MC', 'c1', 'rated_snapshot', 80 - i, photo))
con.commit()
ok = True
def verif(c, m):
    global ok
    print(('OK  ' if c else 'ÉCHEC ') + m); ok &= bool(c)
r = gv.executer(con, 'local', url=f'http://127.0.0.1:{srv.server_port}')
verif(r == {'candidats': 2, 'generes': 2, 'erreurs': 0}, f'deux joueurs sans photo générés, celui avec photo ignoré ({r})')
verif(all('Sans Photo' not in c['prompt'] and 'Sénégal' in c['prompt'] and '27-year-old' in c['prompt'] for c in recu), 'consigne sans nom du joueur, avec âge et nationalité')
verif(recu[0]['seed'] == gv.graine('j0'), 'graine stable par joueur')
verif(con.execute("SELECT count(*) FROM images WHERE type='joueur' AND statut='manuel'").fetchone()[0] == 2, 'images enregistrées comme ajouts')
verif(scenario.visage_ia(con, 'j0') and not scenario.visage_ia(con, 'j1'), 'drapeau « visage IA » pour le scénario')
r2 = gv.executer(con, 'local', url=f'http://127.0.0.1:{srv.server_port}')
verif(r2['candidats'] == 0, 'deuxième passage : rien à refaire')
verif(gv.retirer(con) == 2 and con.execute("SELECT count(*) FROM images WHERE statut='manuel'").fetchone()[0] == 0, 'retrait des visages générés')
sys.exit(0 if ok else 1)
