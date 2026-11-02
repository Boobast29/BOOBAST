"""Contrôles de la couche données (après importer_monde.py) :

    python outils/tests_donnees.py

Chaque test lit la base réelle ; les temps mesurés sont affichés.
"""
import http.server
import json
import os
import sys
import tempfile
import threading
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
import images  # noqa: E402
import importer_monde  # noqa: E402
import scenario  # noqa: E402
import serveur  # noqa: E402

MESURES = {}


def chrono(nom):
    class C:
        def __enter__(self):
            self.t = time.perf_counter()

        def __exit__(self, *a):
            MESURES.setdefault(nom, []).append((time.perf_counter() - self.t) * 1000)
    return C()


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fm = commun.trouver_football_monde()
        serveur.FM = cls.fm
        cls.con = commun.connexion()

    def test_nombre_et_unicite(self):
        n = self.con.execute('SELECT count(*) FROM joueurs').fetchone()[0]
        self.assertEqual(n, 436020)
        self.assertEqual(self.con.execute('SELECT count(DISTINCT id) FROM joueurs').fetchone()[0], n)
        q = dict(self.con.execute('SELECT qualite, count(*) FROM joueurs GROUP BY qualite').fetchall())
        self.assertEqual(q, {'rated_snapshot': 17849, 'historical_profile': 80561, 'identity_archive': 337610})

    def test_reimport_sans_doublon(self):
        imp = importer_monde.Importeur(self.fm, forcer=True)
        imp.detecter_placeholders()
        imp.photos10 = json.loads((self.fm / 'extension_stats_v10/photos_cache_v10.json').read_text(encoding='utf-8'))['players']
        avant = self.con.execute('SELECT count(*) FROM joueurs').fetchone()[0]
        imp.etape('joueurs', 'base_geante_v8/joueurs/joueurs_0001.json', imp.lot)
        imp.etape('joueurs', 'base_geante_v8/joueurs/joueurs_0001.json', imp.lot)
        self.assertEqual(self.con.execute('SELECT count(*) FROM joueurs').fetchone()[0], avant)

    def test_recherche_accents(self):
        with chrono('recherche (FTS, page de 25)'):
            a = serveur.recherche({'q': 'Mbappé'})
        with chrono('recherche (FTS, page de 25)'):
            b = serveur.recherche({'q': 'mbappe'})
        self.assertTrue(a['resultats'])
        self.assertEqual([r['id'] for r in a['resultats']], [r['id'] for r in b['resultats']])
        self.assertLessEqual(len(a['resultats']), 25)
        with chrono('recherche filtres sans texte'):
            c = serveur.recherche({'qualite': 'rated_snapshot', 'poste': 'BU', 'age_max': '21', 'pot_connu': '1', 'taille': '50'})
        self.assertLessEqual(len(c['resultats']), 50)
        for r in c['resultats']:
            self.assertEqual(r['poste'], 'BU')
            self.assertIsNotNone(r['pot99'])

    def test_fiches_incompletes(self):
        r = self.con.execute("SELECT id FROM joueurs WHERE qualite='identity_archive' AND club_id IS NULL AND photo_local IS NULL AND niveau99 IS NULL LIMIT 1").fetchone()
        with chrono('ouverture fiche (identité seule)'):
            f = serveur.fiche_joueur(r['id'])
        self.assertIsNone(f['niveau99'])
        self.assertIsNone(f['club'])
        riche = self.con.execute('SELECT id FROM joueurs WHERE profil_riche=1 LIMIT 1').fetchone()['id']
        with chrono('ouverture fiche riche + historique'):
            f = serveur.fiche_joueur(riche)
            h = serveur.historique(riche)
        self.assertIsNotNone(f['profil_v10'])
        self.assertTrue(h.get('performances') or h.get('annees_civiles'))
        self.assertIsNone(serveur.fiche_joueur('inexistant_123'))

    def test_transferts_futurs_mis_a_part(self):
        # le pack a déjà retiré les dates aberrantes (transferts_a_verifier.json) ; l'import en écarterait d'autres
        self.assertEqual(self.con.execute('SELECT count(*) FROM fiches').fetchone()[0], 436020)
        for (blob,) in self.con.execute("SELECT fiche FROM historiques WHERE tab='transferts' LIMIT 2000"):
            for rec in commun.unpack(blob)['records']:
                self.assertLessEqual(rec.get('transfer_date') or '', importer_monde.AUJOURDHUI)

    def test_silhouettes_ecartees(self):
        fact = json.loads(self.con.execute("SELECT valeur FROM meta WHERE cle='portraits_factices'").fetchone()[0])
        self.assertGreater(len(fact), 0)
        for rel in fact[:50]:
            self.assertEqual(self.con.execute('SELECT count(*) FROM joueurs WHERE photo_local=?', (rel,)).fetchone()[0], 0)

    def test_scenarios_cinq_pays(self):
        for pays in ['France', 'England', 'Germany', 'Spain', 'Italy']:
            with chrono('construction scénario pays'):
                s = scenario.construire(self.con, pays)
            tiers = {d['tier'] for d in s['divisions']}
            self.assertGreaterEqual(len(tiers), 3, pays)
            ids = [p['srcId'] for p in s['players']]
            self.assertEqual(len(ids), len(set(ids)), f'joueur dupliqué ({pays})')
            for p in s['players']:
                if p.get('estimated'):
                    self.assertIsNone(p['ovr99'])  # pas de note source inventée
                    continue
                for v in p['attrs'].values():
                    self.assertTrue(v is None or 1 <= v <= 20)
        groupes = self.con.execute('SELECT count(*) FROM competitions').fetchone()[0]
        self.assertEqual(groupes, 19)
        self.assertEqual(self.con.execute('SELECT count(*) FROM inscriptions').fetchone()[0], 384)
        es = scenario.construire(self.con, 'Spain')
        self.assertEqual(sorted(d['tier'] for d in es['divisions']), [1, 2, 3, 3])
        it = scenario.construire(self.con, 'Italy')
        self.assertEqual(sorted(d['tier'] for d in it['divisions']), [1, 2, 3, 3, 3])


class Images(unittest.TestCase):
    def test_signature_et_chemin(self):
        self.assertEqual(images.type_image(b'\x89PNG\r\n\x1a\n....'), 'png')
        self.assertIsNone(images.type_image(b'<html>403</html>'))
        base = commun.RACINE_JEU
        self.assertIsNone(images.chemin_sur(base, '../../etc/passwd'))
        self.assertIsNone(images.chemin_sur(base, 'C:/Windows/win.ini'))

    def test_url_refusee_sans_boucle(self):
        class H(http.server.BaseHTTPRequestHandler):
            hits = 0

            def do_GET(self):
                H.hits += 1
                if 'html' in self.path:
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b'<html>pas une image</html>')
                else:
                    self.send_response(403)
                    self.end_headers()

            def log_message(self, *a):
                pass
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        port = srv.server_address[1]
        tmp = tempfile.TemporaryDirectory()
        old_db = commun.BASE
        try:
            import sqlite3
            con = sqlite3.connect(os.path.join(tmp.name, 't.db'), check_same_thread=False)
            con.row_factory = sqlite3.Row
            con.executescript(importer_monde.SCHEMA)
            con.execute("INSERT INTO joueurs(id, nom, photo_url) VALUES ('a', 'A', ?)", (f'http://127.0.0.1:{port}/refus.png',))
            con.execute("INSERT INTO joueurs(id, nom, photo_url) VALUES ('b', 'B', ?)", (f'http://127.0.0.1:{port}/html.png',))
            con.commit()
            res = images.Ressources(lambda: con, commun.RACINE_JEU)
            for _ in range(5):
                res.telecharger(con, 'joueur', 'a')
                res.telecharger(con, 'joueur', 'b')
            self.assertEqual(H.hits, 2, 'une URL refusée ne doit pas être retentée')
            st = {r['id']: r['statut'] for r in con.execute('SELECT id, statut FROM images')}
            self.assertEqual(st, {'a': 'erreur_definitive', 'b': 'erreur_definitive'})
            self.assertIsNone(res.trouver(con, 'joueur', 'a'))
            con.close()
        finally:
            commun.BASE = old_db
            srv.shutdown()
            tmp.cleanup()


if __name__ == '__main__':
    r = unittest.main(exit=False, verbosity=2)
    print('\nMesures (ms) :')
    for k, v in MESURES.items():
        print(f'  {k} : min {min(v):.1f} · max {max(v):.1f} · n={len(v)}')
    sys.exit(0 if r.result.wasSuccessful() else 1)
