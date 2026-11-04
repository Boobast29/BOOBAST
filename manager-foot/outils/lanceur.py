"""Point d'entrée unique : code, V12 complète, contrôle, puis serveur local.
Aucune dépendance tierce. L'enrichissement réseau est optionnel (--enrichir).
"""
import argparse, contextlib, hashlib, json, os, pathlib, re, shutil, socket, sqlite3, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request, webbrowser, zipfile
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, BASE, lire_config, ecrire_config
from archives_installation import inspect_archive, safe_parts
OWNER='Boobast29';REPO='BOOBAST';BRANCH='Manager-foot'
API_COMMIT=f'https://api.github.com/repos/{OWNER}/{REPO}/commits/{BRANCH}'
ARCHIVE=f'https://codeload.github.com/{OWNER}/{REPO}/zip/'
META=DOSSIER_JEU_DONNEES/'launcher_state.json';CONFIG=DOSSIER_JEU_DONNEES/'launcher.json'
LIBRARY_PAGE='https://chatgpt.com/library?file_id=libfile_37b3e075cde48191b65771053134f976&account_id=personal'
JOURNAL=DOSSIER_JEU_DONNEES/'journal_lanceur.txt'

def out(text):
    print(text,flush=True);JOURNAL.parent.mkdir(parents=True,exist_ok=True)
    with JOURNAL.open('a',encoding='utf8') as f:f.write(time.strftime('%Y-%m-%d %H:%M:%S ')+text+'\n')
def request(url,timeout=30,headers=None):
    return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'BOOBAST/2',**(headers or {})}),timeout=timeout)
def read_json(path,default=None):
    try:return json.loads(path.read_text(encoding='utf-8-sig'))
    except (OSError,ValueError):return {} if default is None else default

def write_json(path,value):
    path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_name(path.name+'.tmp');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8');os.replace(temp,path)
def file_sha256(path):
    h=hashlib.sha256()
    with pathlib.Path(path).open('rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
    return h.hexdigest()

def download(url,target,validate=None,sha256=None,timeout=90,opener=request):
    """Reprise HTTP avec If-Range ; un fichier incomplet ne remplace jamais le bon ZIP."""
    if urllib.parse.urlsplit(url).scheme!='https':raise ValueError('Le téléchargement exige une URL HTTPS directe vers un ZIP.')
    target=pathlib.Path(target);target.parent.mkdir(parents=True,exist_ok=True)
    partial=target.with_name(target.name+'.part');http=target.with_name(target.name+'.http.json');meta=read_json(http)
    if meta.get('url')!=url:partial.unlink(missing_ok=True);meta={}
    headers={};offset=partial.stat().st_size if partial.exists() else 0
    if offset:
        headers['Range']=f'bytes={offset}-'
        if meta.get('etag') or meta.get('modified'):headers['If-Range']=meta.get('etag') or meta['modified']
    elif target.exists() and meta.get('complete_sha')==file_sha256(target):
        if meta.get('etag'):headers['If-None-Match']=meta['etag']
        if meta.get('modified'):headers['If-Modified-Since']=meta['modified']
    try:r=opener(url,timeout=timeout,headers=headers)
    except urllib.error.HTTPError as e:
        if e.code==304 and target.exists() and meta.get('complete_sha')==file_sha256(target):
            if validate:validate(target)
            return target
        raise
    with r:
        code=getattr(r,'status',200)
        if code==206:
            m=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',r.headers.get('Content-Range',''))
            if not m or int(m[1])!=offset or int(m[2])<offset:raise ValueError('Reprise HTTP incohérente ; le téléchargement partiel est conservé.')
            expected=int(m[3]);mode='ab'
        elif code==200:offset=0;expected=int(r.headers.get('Content-Length') or 0);mode='wb'
        else:raise ValueError('Réponse HTTP inattendue : '+str(code))
        if expected>8*1024**3:raise ValueError('Archive trop volumineuse.')
        meta={'url':url,'etag':r.headers.get('ETag'),'modified':r.headers.get('Last-Modified')};write_json(http,meta)
        with partial.open(mode) as f:
            while True:
                b=r.read(1024*1024)
                if not b:break
                f.write(b)
                if f.tell()>8*1024**3:raise ValueError('Archive trop volumineuse.')
        if expected and partial.stat().st_size!=expected:raise ValueError('Téléchargement interrompu : la prochaine ouverture le reprendra.')
    if validate:
        try:validate(partial)
        except Exception:
            partial.unlink(missing_ok=True);http.unlink(missing_ok=True);raise
    digest=file_sha256(partial)
    if sha256 and digest.lower()!=sha256.lower():partial.unlink(missing_ok=True);raise ValueError('Empreinte SHA-256 différente : archive refusée.')
    os.replace(partial,target);meta['complete_sha']=digest;write_json(http,meta);return target

def code_files(archive):
    names=archive.namelist();roots=[n[:-len('index.html')] for n in names if n.endswith('/manager-foot/index.html')]
    if len(roots)!=1:raise ValueError('Archive GitHub sans dossier de jeu unique.')
    prefix=roots[0];entries={}
    for i in archive.infolist():
        safe_parts(i.filename)
        if i.is_dir() or not i.filename.startswith(prefix):continue
        rel=i.filename[len(prefix):];parts=safe_parts(rel)
        if any(x in ('donnees_jeu','.runtime','.git','__pycache__','fm_images') for x in parts):continue
        if rel in entries:raise ValueError('Fichier de code dupliqué.')
        entries[rel]=i
    for path in ['index.html','outils/lanceur.py','outils/commun.py','outils/serveur.py','outils/installer_donnees.py']:
        if path not in entries:raise ValueError('Code incomplet : '+path)
    html=archive.read(entries['index.html']).decode('utf8')
    for rel in re.findall(r'(?:src|href)=[\"\']([^\"\']+\.(?:js|mjs|css))(?:[?][^\"\']*)?[\"\']',html):
        if '://' not in rel and not rel.startswith('//') and rel not in entries:raise ValueError('Ressource du jeu absente : '+rel)
    for manifest in ['packs/fminside-fm26.manifest.json','packs/fmblog-fm26.manifest.json','packs/football-monde-fmb.json']:
        if manifest not in entries:continue
        data=json.loads(archive.read(entries[manifest]))
        for part in data.get('parts',[]):
            name=part.get('file','')
            if len(safe_parts(name))!=1:raise ValueError('Nom de partie de catalogue invalide.')
            path='packs/'+name
            if path not in entries:raise ValueError('Partie de catalogue manquante : '+name)
            raw=archive.read(entries[path])
            if len(raw)!=part['bytes'] or hashlib.sha256(raw).hexdigest()!=part['sha256']:raise ValueError('Partie de catalogue corrompue : '+name)
    return entries

def update_code(state):
    try:
        with request(API_COMMIT,timeout=12) as r:commit=json.load(r)['sha']
        if not re.fullmatch('[a-f0-9]{40}',commit):raise ValueError('Révision GitHub invalide.')
        if state.get('code_commit')==commit:return state
        out('Téléchargement de la mise à jour du code…')
        with tempfile.TemporaryDirectory(prefix='boobast-code-') as tmp:
            path=pathlib.Path(tmp)/'code.zip'
            def validate(p):
                with zipfile.ZipFile(p) as z:code_files(z)
            download(ARCHIVE+commit,path,validate=validate,timeout=120)
            backup=DOSSIER_JEU_DONNEES/'retour_code';backup.mkdir(parents=True,exist_ok=True);changes=[]
            with zipfile.ZipFile(path) as z:
                entries=code_files(z)
                try:
                    for rel,i in entries.items():
                        dest=RACINE_JEU.joinpath(*safe_parts(rel));dest.resolve().relative_to(RACINE_JEU.resolve())
                        if dest.is_symlink():raise ValueError('Lien local inattendu : '+rel)
                        old=backup.joinpath(*safe_parts(rel));exists=dest.exists()
                        if exists:old.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dest,old)
                        changes.append((dest,old,exists));dest.parent.mkdir(parents=True,exist_ok=True)
                        stage=dest.with_name(dest.name+'.update-tmp')
                        with z.open(i) as src,stage.open('wb') as f:shutil.copyfileobj(src,f)
                        os.replace(stage,dest)
                except Exception:
                    for dest,old,exists in reversed(changes):
                        if exists:shutil.copy2(old,dest)
                        else:dest.unlink(missing_ok=True)
                    raise
        state['code_commit']=commit;write_json(META,state);out('Code installé : '+commit[:10])
    except (OSError,ValueError,KeyError,zipfile.BadZipFile) as e:out('Mise à jour indisponible ; utilisation du code local. '+str(e))
    return state

def tidy_installation():
    # On range uniquement les anciens fichiers livrés par ce dépôt ; aucun fichier personnel n'est supprimé.
    for folder in [RACINE_JEU/'outils'/'maintenance',RACINE_JEU/'documentation']:
        if not folder.exists():continue
        for known in folder.iterdir():
            source=RACINE_JEU/known.name
            if not source.is_file() or source.name in ('README.md','Lancer_Manager_Foot.bat','Lancer_Manager_Foot.sh'):continue
            archive=DOSSIER_JEU_DONNEES/'anciens_lanceurs'/source.name;archive.parent.mkdir(parents=True,exist_ok=True)
            if archive.exists():archive=archive.with_name(archive.name+'.'+str(time.time_ns()))
            try:shutil.move(str(source),str(archive))
            except OSError as e:out('Ancien fichier laissé en place : '+source.name+' — '+str(e))

def configured_pack_url():return os.environ.get('FOOTBALL_MONDE_URL') or read_json(CONFIG).get('pack_url')
def download_pack(url):
    cfg=read_json(CONFIG);return download(url,DOSSIER_JEU_DONNEES/'downloads'/'Football_Monde.zip',validate=inspect_archive,sha256=cfg.get('pack_sha256'))
def database_ready():
    if not BASE.is_file():return False
    try:
        with contextlib.closing(sqlite3.connect('file:'+BASE.as_posix()+'?mode=ro',uri=True)) as c:
            n=c.execute('select count(*) from joueurs').fetchone()[0]
            expected=c.execute("select valeur from meta where cle='nb_joueurs_attendu'").fetchone()
            return n>0 and bool(expected) and n==int(expected[0]) and c.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    except (sqlite3.Error,ValueError):return False

def install_data_pack(state,pack):
    from installer_donnees import local_pack,audit
    pack=pathlib.Path(pack).expanduser().resolve()
    digest=file_sha256(pack) if pack.is_file() else None
    fm=local_pack(pack)
    if not digest:digest=hashlib.sha256((fm/'base_geante_v8/manifest.json').read_bytes()).hexdigest()
    if state.get('pack_sha256')==digest and database_ready():out('V12 déjà importée et contrôlée.');return state
    out('Import de la base complète et des historiques…')
    stage=DOSSIER_JEU_DONNEES/'installations'/digest[:16];stage.mkdir(parents=True,exist_ok=True)
    env={**os.environ,'BOOBAST_DATA_DIR':str(stage)}
    subprocess.run([sys.executable,str(RACINE_JEU/'outils/installer_donnees.py'),str(fm)],cwd=RACINE_JEU,env=env,check=True)
    report=audit(fm,stage/'monde.db')
    if BASE.exists():
        with contextlib.closing(sqlite3.connect(BASE)) as old,contextlib.closing(sqlite3.connect(DOSSIER_JEU_DONNEES/'monde.precedent.db')) as backup:old.backup(backup)
        # Les ajouts graphiques personnels restent disponibles dans le nouveau catalogue.
        with contextlib.closing(sqlite3.connect(BASE)) as old,contextlib.closing(sqlite3.connect(stage/'monde.db')) as new:
            schema=old.execute("select sql from sqlite_master where type='table' and name='images'").fetchone()
            if schema:
                new.execute(schema[0].replace('CREATE TABLE images','CREATE TABLE IF NOT EXISTS images'))
                for row in old.execute('select * from images'):new.execute('insert or replace into images values ('+','.join('?' for _ in row)+')',tuple(row))
                new.commit()
    next_db=BASE.with_suffix('.next.db')
    with contextlib.closing(sqlite3.connect(stage/'monde.db')) as source,contextlib.closing(sqlite3.connect(next_db)) as dest:source.backup(dest)
    os.replace(next_db,BASE)
    cfg=lire_config();cfg['football_monde']=str(fm);ecrire_config(cfg)
    write_json(DOSSIER_JEU_DONNEES/'rapport_installation.json',report);state['pack_sha256']=digest;write_json(META,state)
    out(f"V12 contrôlée : {report['joueurs']} joueurs, {report['portraits_locaux_disponibles']} portraits locaux, {report['logos_locaux_disponibles']} logos.")
    return state

@contextlib.contextmanager
def launcher_lock():
    path=DOSSIER_JEU_DONNEES/'lanceur.lock';path.parent.mkdir(parents=True,exist_ok=True);f=path.open('a+b');f.seek(0)
    if path.stat().st_size==0:f.write(b'0');f.flush();f.seek(0)
    try:
        if os.name=='nt':
            import msvcrt;msvcrt.locking(f.fileno(),msvcrt.LK_NBLCK,1)
        else:
            import fcntl;fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except OSError:f.close();raise RuntimeError('Une installation ou un serveur utilise déjà ce dossier. Garde une seule fenêtre ouverte.')
    try:yield
    finally:f.close()

def existing_server(port):
    try:
        with request(f'http://127.0.0.1:{port}/api/health',timeout=2) as r:d=json.load(r)
        return d.get('application')=='BOOBAST' and os.path.normcase(d.get('root',''))==os.path.normcase(str(RACINE_JEU.resolve()))
    except (OSError,ValueError):return False

def find_pack(wait,interactive=True):
    import installer_donnees
    try:p=installer_donnees.discover()
    except ValueError as e:out(str(e));p=None
    if p or not interactive:return p
    out('Télécharge une fois le ZIP V12 depuis la page qui s’ouvre ; le lanceur le détectera dans Téléchargements.')
    webbrowser.open(LIBRARY_PAGE);deadline=time.monotonic()+wait;previous=None
    while time.monotonic()<deadline:
        time.sleep(3)
        dirs=installer_donnees.search_folders()
        files=tuple((str(p),p.stat().st_size,p.stat().st_mtime_ns) for d in dirs if d.is_dir() for p in d.glob('Football_Monde*.zip'))
        if files==previous:continue
        previous=files
        try:p=installer_donnees.discover()
        except (ValueError,OSError):continue
        if p:return p
    return None

def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('source',nargs='?',help='ZIP glissé sur le lanceur');ap.add_argument('--pack',help='ZIP V12 ou dossier local');ap.add_argument('--pack-url',help='URL HTTPS directe du ZIP, mémorisée pour les prochaines ouvertures');ap.add_argument('--sha256');ap.add_argument('--sans-maj',action='store_true');ap.add_argument('--hors-ligne',action='store_true');ap.add_argument('--installer-seul','--sans-lancer',dest='installer_seul',action='store_true');ap.add_argument('--enrichir',action='store_true',help='compléments réseau optionnels, plus longs');ap.add_argument('--diagnostic',action='store_true');ap.add_argument('--sans-ouvrir',action='store_true');ap.add_argument('--attente-zip',type=int,default=1200);ap.add_argument('--port',type=int,default=8765);args=ap.parse_args(argv)
    DOSSIER_JEU_DONNEES.mkdir(parents=True,exist_ok=True)
    if args.diagnostic:print(json.dumps({'base_prete':database_ready(),'etat':read_json(META),'rapport':read_json(DOSSIER_JEU_DONNEES/'rapport_installation.json')},ensure_ascii=False,indent=2));return 0
    if existing_server(args.port):
        if args.installer_seul:out('Ferme la fenêtre du jeu avant de mettre à jour ses données.');return 2
        out('Le jeu est déjà ouvert : une seule fenêtre de serveur est nécessaire.')
        if not args.sans_ouvrir:webbrowser.open(f'http://127.0.0.1:{args.port}/')
        return 0
    with launcher_lock():
        if args.pack_url:
            if urllib.parse.urlsplit(args.pack_url).scheme!='https':raise ValueError('URL HTTPS directe requise.')
            cfg=read_json(CONFIG);cfg['pack_url']=args.pack_url
            if args.sha256:cfg['pack_sha256']=args.sha256
            else:cfg.pop('pack_sha256',None)
            write_json(CONFIG,cfg)
        state=read_json(META)
        if not args.sans_maj and not args.hors_ligne:state=update_code(state)
        tidy_installation()
        pack=args.pack or args.source;url=configured_pack_url();failed=False
        if args.sha256 and not re.fullmatch('[a-fA-F0-9]{64}',args.sha256):raise ValueError('SHA-256 invalide : 64 caractères hexadécimaux requis.')
        if args.sha256 and pack and pathlib.Path(pack).is_file() and file_sha256(pack).lower()!=args.sha256.lower():raise ValueError('Empreinte du ZIP local différente : installation refusée.')
        if not pack and url and not args.hors_ligne:
            try:pack=download_pack(url)
            except (OSError,ValueError,zipfile.BadZipFile) as e:
                failed=True;out('Téléchargement V12 interrompu ou refusé : '+str(e))
                if not database_ready():raise
        if not pack:pack=find_pack(0,False)
        if not pack and not database_ready() and not args.hors_ligne:pack=find_pack(args.attente_zip,not args.installer_seul)
        if pack:
            try:state=install_data_pack(state,pack)
            except Exception as e:
                failed=True;out('Installation V12 non validée : '+str(e))
                if not database_ready():raise
                out('La base précédente est conservée et reste utilisable.')
        if not database_ready():out('Base mondiale complète absente. Place le ZIP V12 dans Téléchargements ou utilise --pack CHEMIN / --pack-url URL.');return 2
        from enrichir_pack_local import enrichir
        enrichir()
        if args.enrichir and not args.hors_ligne:subprocess.run([sys.executable,str(RACINE_JEU/'outils/tout_installer.py'),'--sans-lancer'],cwd=RACINE_JEU,check=True)
        if args.installer_seul:
            if failed:out('Mise à jour incomplète : la base précédente reste utilisable.');return 1
            out('Installation complète vérifiée.');return 0
        command=[sys.executable,str(RACINE_JEU/'outils/serveur.py'),'--port',str(args.port)]
        if not args.sans_ouvrir:command.append('--ouvrir')
        out(f'Ouverture du jeu sur http://127.0.0.1:{args.port}/ — conserve cette fenêtre ouverte.')
        return subprocess.call(command,cwd=RACINE_JEU)
if __name__=='__main__':
    try:raise SystemExit(main())
    except (OSError,ValueError,RuntimeError,subprocess.SubprocessError,zipfile.BadZipFile) as e:out('Installation arrêtée : '+str(e));raise SystemExit(1)
