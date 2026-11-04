"""Régressions du lanceur unique ; aucun accès Internet, aucune vraie sauvegarde modifiée."""
import contextlib,gzip,io,json,os,pathlib,sqlite3,sys,tempfile,unittest,urllib.error,zipfile
from unittest import mock
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'outils'))
import archives_installation as ar
import installer_donnees as inst
import lanceur as launch
import importer_monde as importer
import enrichir_pack_local as fm

class Response(io.BytesIO):
    def __init__(self,data,status=200,headers=None):super().__init__(data);self.status=status;self.headers=headers or {'Content-Length':str(len(data))}

class Installation(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.data=self.root/'data';self.data.mkdir()
        self.patches=[mock.patch.object(launch,'DOSSIER_JEU_DONNEES',self.data),mock.patch.object(launch,'BASE',self.data/'monde.db'),mock.patch.object(launch,'META',self.data/'launcher_state.json'),mock.patch.object(launch,'JOURNAL',self.data/'journal.txt'),mock.patch.object(inst,'DOSSIER_JEU_DONNEES',self.data)]
        for p in self.patches:p.start()
    def tearDown(self):
        for p in reversed(self.patches):p.stop()
        self.tmp.cleanup()
    def zip(self,prefix='Football_Monde/',missing=None,extra=None):
        p=self.root/'Football_Monde_v12(2).zip'
        files={ar.MANIFEST:json.dumps({'players':1,'player_files':['p.json']}),'base_geante_v8/joueurs/p.json':'{"players":[]}'}
        files.update({n:'{}' for n in ar.REQUIRED});files['extension_stats_v10/profils_jeu/p.json']='{"players":[]}'
        for name in ['performances_saison_tm','absences_historiques_tm','transferts_tm','valeurs_marche_tm','selections_tm','statistiques_annees_civiles_hf','equipes_source_hf','competitions_source_hf']:files['extension_stats_v10/historiques/'+name+'.jsonl.gz']=gzip.compress(b'')
        if missing:files.pop(missing)
        with zipfile.ZipFile(p,'w') as z:
            for name,data in files.items():z.writestr(prefix+name,data)
            for name,data in (extra or {}).items():z.writestr(name,data)
        return p
    def test_valid_zip_renamed_and_nested(self):
        p=self.zip('enveloppe/Football_Monde/');info=ar.inspect_archive(p);self.assertEqual(info['manifest']['players'],1)
        dest,info=ar.extract_pack(p,self.root/'output');self.assertTrue((dest/ar.MANIFEST).exists())
        (dest/'base_geante_v8/joueurs/p.json').write_text('CORROMPU')
        ar.extract_pack(p,self.root/'output');self.assertEqual(json.loads((dest/'base_geante_v8/joueurs/p.json').read_text()),{'players':[]})
    def test_missing_batch_and_zip_slip_refused(self):
        for name in ['base_geante_v8/joueurs/p.json',ar.REQUIRED[0]]:
            with self.assertRaisesRegex(ValueError,'incomplet'):ar.inspect_archive(self.zip(missing=name))
        for name in ['../secret','C:/secret','Football_Monde/../../secret']:
            with self.assertRaises(ValueError):ar.inspect_archive(self.zip(extra={name:'bad'}))
    def test_resume_http_exact_bytes(self):
        target=self.root/'download.zip';partial=target.with_name(target.name+'.part');partial.write_bytes(b'12345');launch.write_json(target.with_name(target.name+'.http.json'),{'url':'https://test/pack','etag':'v1'})
        def opener(url,**kw):
            self.assertEqual(kw['headers']['Range'],'bytes=5-');self.assertEqual(kw['headers']['If-Range'],'v1')
            return Response(b'67890',206,{'Content-Range':'bytes 5-9/10'})
        launch.download('https://test/pack',target,opener=opener);self.assertEqual(target.read_bytes(),b'1234567890')
    def test_changed_server_restarts_partial(self):
        target=self.root/'download.zip';target.with_name(target.name+'.part').write_bytes(b'old');launch.write_json(target.with_name(target.name+'.http.json'),{'url':'https://test/pack'})
        launch.download('https://test/pack',target,opener=lambda *a,**k:Response(b'NEW'))
        self.assertEqual(target.read_bytes(),b'NEW')
    def test_interrupted_download_preserves_installed_zip(self):
        target=self.root/'download.zip';target.write_bytes(b'GOOD')
        with self.assertRaisesRegex(ValueError,'interrompu'):launch.download('https://test/pack',target,opener=lambda *a,**k:Response(b'123',headers={'Content-Length':'10'}))
        self.assertEqual(target.read_bytes(),b'GOOD');self.assertEqual(target.with_name(target.name+'.part').read_bytes(),b'123')
    def test_html_instead_of_zip_does_not_replace_cache(self):
        target=self.root/'download.zip';target.write_bytes(b'GOOD')
        with self.assertRaises(ValueError):launch.download('https://test/pack',target,validate=ar.inspect_archive,opener=lambda *a,**k:Response(b'<html>sign in</html>'))
        self.assertEqual(target.read_bytes(),b'GOOD');self.assertFalse(target.with_name(target.name+'.part').exists())
    def test_invalid_content_range_does_not_append(self):
        target=self.root/'download.zip';partial=target.with_name(target.name+'.part');partial.write_bytes(b'123');launch.write_json(target.with_name(target.name+'.http.json'),{'url':'https://test/pack'})
        with self.assertRaisesRegex(ValueError,'incohérente'):launch.download('https://test/pack',target,opener=lambda *a,**k:Response(b'45',206,{'Content-Range':'bytes 0-1/5'}))
        self.assertEqual(partial.read_bytes(),b'123')
    def test_unchanged_zip_http304_validated(self):
        target=self.root/'download.zip';target.write_bytes(b'GOOD');launch.write_json(target.with_name(target.name+'.http.json'),{'url':'https://test/pack','etag':'v1','complete_sha':launch.file_sha256(target)})
        def opener(*a,**kw):
            self.assertEqual(kw['headers']['If-None-Match'],'v1');raise urllib.error.HTTPError('https://test/pack',304,'not modified',{},None)
        checked=[];launch.download('https://test/pack',target,validate=lambda p:checked.append(p),opener=opener);self.assertEqual(checked,[target])
    def test_lock_prevents_double_install(self):
        with launch.launcher_lock():
            with self.assertRaisesRegex(RuntimeError,'déjà'): 
                with launch.launcher_lock():pass
    def build_db(self,path,ident):
        with sqlite3.connect(path) as c:
            c.executescript('CREATE TABLE joueurs(id TEXT PRIMARY KEY,photo_local TEXT);CREATE TABLE clubs(logo_local TEXT);CREATE TABLE historiques(tab TEXT);CREATE TABLE meta(cle TEXT PRIMARY KEY,valeur TEXT);')
            c.execute('insert into joueurs values (?,NULL)',(ident,));c.execute("insert into meta values ('nb_joueurs_attendu','1')")
    def test_failed_import_keeps_previous_database(self):
        self.build_db(launch.BASE,'OLD');fmroot=self.root/'Football_Monde';(fmroot/'base_geante_v8').mkdir(parents=True);(fmroot/ar.MANIFEST).write_text('{"players":1}')
        with mock.patch.object(inst,'local_pack',return_value=fmroot),mock.patch.object(launch.subprocess,'run',side_effect=RuntimeError('interruption')):
            with self.assertRaises(RuntimeError):launch.install_data_pack({},fmroot)
        with sqlite3.connect(launch.BASE) as c:self.assertEqual(c.execute('select id from joueurs').fetchone()[0],'OLD')
    def test_validated_import_atomically_replaces_database(self):
        self.build_db(launch.BASE,'OLD');fmroot=self.root/'Football_Monde';(fmroot/'base_geante_v8').mkdir(parents=True);(fmroot/ar.MANIFEST).write_text('{"players":1}')
        def child(*a,**kw):self.build_db(pathlib.Path(kw['env']['BOOBAST_DATA_DIR'])/'monde.db','NEW')
        with mock.patch.object(inst,'local_pack',return_value=fmroot),mock.patch.object(launch.subprocess,'run',side_effect=child),mock.patch.object(launch,'ecrire_config'):
            state=launch.install_data_pack({},fmroot)
        with sqlite3.connect(launch.BASE) as c:self.assertEqual(c.execute('select id from joueurs').fetchone()[0],'NEW')
        with sqlite3.connect(self.data/'monde.precedent.db') as c:self.assertEqual(c.execute('select id from joueurs').fetchone()[0],'OLD')
        self.assertTrue(state['pack_sha256'])
    def test_truncated_temporary_profile_is_ignored(self):
        # Reproduction du fichier temporaire qui a bloqué l'import réel des 436 020 joueurs.
        fmroot=self.root/'Football_Monde';(fmroot/'base_geante_v8').mkdir(parents=True);(fmroot/ar.MANIFEST).write_text('{"players":1,"player_files":[]}')
        profiles=fmroot/'extension_stats_v10/profils_jeu';profiles.mkdir(parents=True)
        (profiles/'.profils_011.json.8NEQx2').write_text('{"players":[{"name":"truncated')
        (profiles/'profils_011.json').write_text('{"players":[]}');(profiles.parent/'photos_cache_v10.json').write_text('{"players":{}}')
        obj=importer.Importeur.__new__(importer.Importeur);obj.fm=fmroot;obj.placeholders=set();obj.con=sqlite3.connect(':memory:');obj.con.executescript(importer.SCHEMA);obj.con.execute("insert into joueurs(id) values ('1')")
        obj.detecter_placeholders=lambda:None;seen=[]
        def stage(kind,path,fn):
            if kind=='profils':seen.append(path);return fn(fmroot/path)
            return 0
        obj.etape=stage
        with mock.patch.object(importer,'log'):obj.run(False)
        self.assertEqual(seen,['extension_stats_v10/profils_jeu/profils_011.json']);obj.con.close()
    def test_missing_dob_and_ambiguous_identities_not_guessed(self):
        self.assertIsNone(fm.naissance({'birthDateText':None}));self.assertIsNone(fm.naissance({}));self.assertEqual(fm.naissance({'birthDateText':'20 December 1998'}),'1998-12-20')

if __name__=='__main__':unittest.main()
