"""Régression HTTP : les catalogues nécessaires au monde étendu restent accessibles."""
import ast
import pathlib
import re
import tempfile
import threading
import types
import unittest
import urllib.request
import urllib.error
import urllib.parse
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class PacksPublicsTest(unittest.TestCase):
    def test_http_catalogues_et_restrictions(self):
        source = pathlib.Path(__file__).resolve().parents[1] / 'outils' / 'serveur.py'
        tree = ast.parse(source.read_text(encoding='utf8'))
        assignments = [n for n in tree.body if isinstance(n, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id in ('PACKS_PUBLICS', 'STATIQUES_INTERDITS') for t in n.targets)]
        handler = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == 'Handler')
        method = next(n for n in handler.body if isinstance(n, ast.FunctionDef) and n.name == 'statique')
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            allowed = ['packs/monde-index.json', 'packs/monde-france.json.gz',
                       'packs/fminside-fm26.manifest.json', 'packs/fmblog-fm26.manifest.json',
                       'packs/fminside-96a00473dc87.001.part', 'packs/fmblog-79a246cfb5fb.003.part',
                       'packs/fminside-fm26.json.gz', 'packs/noms-reels-fmscout.json', 'packs/nationalites-monde.json']
            denied = ['packs/private.json', 'outils/serveur.py', 'donnees_jeu/config.json', '.git/config',
                      'packs/fminside-fm26.manifest.json.bak', 'packs/fminside-xyz.001.part']
            for name in allowed + denied:
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(b'fixture')
            def chemin_sur(base, rel):
                p = (base / rel).resolve()
                return p if p.is_relative_to(base) and p.is_file() else None
            scope = dict(re=re, urllib=urllib, mimetypes=mimetypes, RACINE_JEU=root,
                         images=types.SimpleNamespace(chemin_sur=chemin_sur))
            exec(compile(ast.Module(body=assignments + [method], type_ignores=[]), str(source), 'exec'), scope)
            class Handler(BaseHTTPRequestHandler):
                statique = scope['statique']
                def do_GET(self): self.statique(urllib.parse.urlparse(self.path).path)
                def log_message(self, *args): pass
                def envoyer(self, code, body, ctype=None):
                    self.send_response(code)
                    self.end_headers()
                    self.wfile.write(body if isinstance(body, bytes) else str(body).encode())
            server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = 'http://127.0.0.1:' + str(server.server_port) + '/'
                for name in allowed:
                    with self.subTest(name=name), urllib.request.urlopen(base + name) as response:
                        self.assertEqual(response.status, 200)
                        self.assertEqual(response.read(), b'fixture')
                for name in denied:
                    with self.subTest(name=name), self.assertRaises(urllib.error.HTTPError) as error:
                        urllib.request.urlopen(base + name)
                    self.assertEqual(error.exception.code, 403)
            finally:
                server.shutdown()
                server.server_close()
                thread.join()


if __name__ == '__main__':
    unittest.main()
