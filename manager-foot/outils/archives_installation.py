"""Validation commune des archives : base complète, chemins sûrs et extraction reprenable."""
import json, os, pathlib, shutil, stat, zipfile, zlib
MANIFEST = 'base_geante_v8/manifest.json'
REQUIRED = ['base_geante_v8/clubs.json','extension_stats_v10/photos_cache_v10.json','extension_stats_v10/logos_cache_v10.json','extension_stats_v10/profils_riches_selection.json','extension_jeunes_divisions_v9/championnats_2026_2027.json','extension_jeunes_divisions_v9/jeunes_reels_15_21_ans.json','extension_jeunes_divisions_v9/structures_formation_jeu.json','extension_stats_v10/joueurs_libres/libres_base_carriere_fc27.json','extension_stats_v10/joueurs_libres/sans_club_archive_a_reverifier.json','base_geante_v8/conflits_identite.json']

def safe_parts(name):
    name=name.replace('\\','/');p=pathlib.PurePosixPath(name)
    if not name or p.is_absolute() or '..' in p.parts or any(':' in x or '\x00' in x for x in p.parts):raise ValueError('Chemin ZIP invalide : '+name)
    return p.parts

def inspect_archive(path):
    try:
        with zipfile.ZipFile(path) as z:
            infos=z.infolist();names=[x.filename.replace('\\','/') for x in infos]
            if len(names)!=len(set(names)):raise ValueError('Fichiers dupliqués dans le ZIP.')
            if len(names)>500000 or sum(x.file_size for x in infos)>25*1024**3:raise ValueError('Archive trop volumineuse.')
            for i in infos:
                safe_parts(i.filename)
                if stat.S_ISLNK(i.external_attr>>16) or i.flag_bits&1:raise ValueError('Liens symboliques ou archive chiffrée non pris en charge.')
            roots=[n[:-len(MANIFEST)] for n in names if n.endswith('/'+MANIFEST) or n==MANIFEST]
            if len(roots)!=1:raise ValueError('Pack complet absent ou ambigu : manifeste base_geante_v8/manifest.json requis.')
            prefix=roots[0];raw=z.read(next(i for i in infos if i.filename.replace('\\','/')==prefix+MANIFEST));m=json.loads(raw.decode('utf-8-sig'))
            count=m.get('players');batches=m.get('player_files')
            if type(count) is not int or count<=0 or not isinstance(batches,list) or not batches or len(batches)!=len(set(batches)):raise ValueError('Manifeste de joueurs invalide.')
            for fn in batches:
                if not isinstance(fn,str) or len(safe_parts(fn))!=1:raise ValueError('Nom de lot invalide.')
            required=[MANIFEST,*REQUIRED,*['base_geante_v8/joueurs/'+fn for fn in batches]]
            missing=[n for n in required if prefix+n not in names]
            if missing:raise ValueError('ZIP incomplet : '+', '.join(missing[:5]))
            if not any(n.startswith(prefix+'extension_stats_v10/profils_jeu/') and n.endswith('.json') for n in names):raise ValueError('Profils détaillés V10 absents.')
            histories=['performances_saison_tm','absences_historiques_tm','transferts_tm','valeurs_marche_tm','selections_tm','statistiques_annees_civiles_hf','equipes_source_hf','competitions_source_hf']
            for n in histories:
                if prefix+'extension_stats_v10/historiques/'+n+'.jsonl.gz' not in names:raise ValueError('Historique absent : '+n)
            return {'prefix':prefix,'manifest':m,'bytes':sum(i.file_size for i in infos if i.filename.replace('\\','/').startswith(prefix)),'files':len(infos)}
    except (zipfile.BadZipFile,EOFError) as e:raise ValueError('ZIP incomplet ou illisible. Le téléchargement pourra être repris.') from e

def crc(path):
    value=0
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):value=zlib.crc32(b,value)
    return value&0xffffffff

def extract_pack(path,target):
    info=inspect_archive(path);target=pathlib.Path(target).resolve();target.mkdir(parents=True,exist_ok=True)
    if shutil.disk_usage(target).free<info['bytes']+256*1024**2:raise ValueError('Espace disque insuffisant pour extraire la base complète.')
    fm=target/'Football_Monde';fm.mkdir(exist_ok=True)
    with zipfile.ZipFile(path) as z:
        for i in z.infolist():
            name=i.filename.replace('\\','/')
            if not name.startswith(info['prefix']) or i.is_dir():continue
            rel=name[len(info['prefix']):]
            if not rel:continue
            dest=fm.joinpath(*safe_parts(rel));dest.resolve().relative_to(fm)
            if dest.is_symlink():raise ValueError('Lien local inattendu : '+str(dest))
            if dest.is_file() and dest.stat().st_size==i.file_size and crc(dest)==i.CRC:continue
            dest.parent.mkdir(parents=True,exist_ok=True);tmp=dest.with_name(dest.name+'.extract-tmp')
            with z.open(i) as src,tmp.open('wb') as out:shutil.copyfileobj(src,out,1024*1024)
            os.replace(tmp,dest)
    return fm,info
