import gzip,json,tempfile,unittest
from pathlib import Path
from pack_fminside import lire_catalogue,publier
class PackTest(unittest.TestCase):
    def test_parties_et_integrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);data={'players':[{'fmUid':'1','name':'Joueur A'}]}
            mono=root/'fminside-fm26.json.gz';mono.write_bytes(gzip.compress(json.dumps(data).encode()))
            manifest=publier(root);mono.unlink()
            self.assertEqual(lire_catalogue(root),data)
            part=root/manifest['parts'][0]['file'];content=bytearray(part.read_bytes());content[0]^=1;part.write_bytes(content)
            with self.assertRaisesRegex(ValueError,'corrompue'):lire_catalogue(root)
    def test_reprise_json_plus_recent(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'fminside-fm26.json.gz').write_bytes(gzip.compress(json.dumps({'players':[{'fmUid':'1'}]}).encode()))
            (root/'fminside-fm26.json').write_text(json.dumps({'players':[{'fmUid':'1'},{'fmUid':'2'}]}),encoding='utf-8')
            self.assertEqual(len(lire_catalogue(root)['players']),2)
            publier(root)
            (root/'fminside-fm26.json').write_text('{',encoding='utf-8')
            self.assertEqual(len(lire_catalogue(root)['players']),2)
if __name__=='__main__':unittest.main()
