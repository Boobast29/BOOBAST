"""Contrôles ciblés sur les archives et l'accès au serveur local."""
import http.client
import json
import pathlib
import sys
import tempfile
import threading
import unittest
import warnings
import zipfile
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import installer_donnees
from serveur import Handler


class InstallationSecurisee(unittest.TestCase):
    def archive(self, dossier, extras=()):
        path = pathlib.Path(dossier) / 'Football_Monde_test.zip'
        manifest = {'players': 1, 'player_files': ['lot_001.json']}
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('Football_Monde/base_geante_v8/manifest.json', json.dumps(manifest))
                z.writestr('Football_Monde/base_geante_v8/joueurs/lot_001.json', '[]')
                for name in extras:
                    z.writestr(name, 'test')
        return path

    def test_archive_valide_et_collisions(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(installer_donnees.verifier_archive(self.archive(d))['players'], 1)
            for entries in [('Football_Monde/../ailleurs',),
                            ('Football_Monde/base_geante_v8/Joueurs/LOT_001.JSON',),
                            ('Football_Monde/base_geante_v8/manifest.json',)]:
                with self.subTest(entries=entries):
                    with self.assertRaises(ValueError):
                        installer_donnees.verifier_archive(self.archive(d, entries))


class ServeurLocalSecurise(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def requete(self, method, path, **headers):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        try:
            conn.request(method, path, headers=headers)
            resp = conn.getresponse()
            resp.read()
            return resp.status
        finally:
            conn.close()

    def test_origines_et_fichiers_caches(self):
        port = self.server.server_port
        self.assertEqual(self.requete('GET', '/README.md'), 200)
        self.assertEqual(self.requete('GET', '/.git/config'), 403)
        self.assertEqual(self.requete('GET', '/donnees_jeu/config.json'), 403)
        self.assertEqual(self.requete('GET', '/', Host='site-inconnu.example'), 403)
        self.assertEqual(self.requete('POST', '/api/ressources/pause', Origin='https://site-inconnu.example'), 403)
        self.assertEqual(self.requete('POST', '/api/ressources/pause', Origin=f'http://127.0.0.1:{port}'), 503)


if __name__ == '__main__':
    unittest.main()
