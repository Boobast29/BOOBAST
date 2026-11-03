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
if __name__=='__main__':unittest.main()
