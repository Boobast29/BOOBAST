"""Contrôle HTTP du jeu et d'une vraie base V12 déjà installée.
python tests/verifier_installation_reelle.py --donnees CHEMIN/donnees_jeu
"""
import argparse,json,os,pathlib,socket,sqlite3,subprocess,sys,time,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--donnees',required=True);args=ap.parse_args();data=pathlib.Path(args.donnees).resolve()
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    env={**os.environ,'BOOBAST_DATA_DIR':str(data)}
    child=subprocess.Popen([sys.executable,str(ROOT/'outils/serveur.py'),'--port',str(port),'--hors-ligne'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env)
    base=f'http://127.0.0.1:{port}'
    try:
        deadline=time.monotonic()+30
        while True:
            try:
                with urllib.request.urlopen(base+'/api/health',timeout=2) as r:health=json.load(r)
                break
            except OSError:
                if child.poll() is not None:raise RuntimeError(child.stdout.read().decode())
                if time.monotonic()>deadline:raise RuntimeError('Le serveur ne répond pas.')
                time.sleep(.1)
        assert health['application']=='BOOBAST' and health['base_installee']
        for url in ['/api/etat','/packs/monde-index.json','/packs/fmblog-fm26.manifest.json','/packs/fminside-fm26.manifest.json']:
            with urllib.request.urlopen(base+url,timeout=20) as r:assert r.status==200;json.load(r)
        with sqlite3.connect(data/'monde.db') as c:
            total=c.execute('select count(*) from joueurs').fetchone()[0]
            ident=c.execute('select id from complements_fm limit 1').fetchone()[0]
            photo=c.execute('select id from joueurs where photo_local is not null limit 1').fetchone()[0]
        with urllib.request.urlopen(base+'/api/joueur/'+ident) as r:fiche=json.load(r);assert 'complement_fm' in fiche['source']
        with urllib.request.urlopen(base+'/img/joueur/'+photo+'?dl=0') as r:assert r.headers.get('Content-Type','').startswith('image/')
        with urllib.request.urlopen(base+'/api/scenario?pays=France',timeout=30) as r:scenario=json.load(r);assert scenario['clubs'] and scenario['players']
        print(json.dumps({'controle':'ok','joueurs':total,'catalogues':'HTTP 200','fiche_fm':'HTTP 200','portrait_local':'HTTP 200','scenario_france_clubs':len(scenario['clubs']),'scenario_france_joueurs':len(scenario['players'])},ensure_ascii=False))
    finally:
        child.terminate()
        try:child.wait(timeout=5)
        except subprocess.TimeoutExpired:child.kill();child.wait()
if __name__=='__main__':main()
