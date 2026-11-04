"""Outils partagés : chemins, normalisation, accès à la base locale.

Aucune dépendance externe : Python 3.9+ (bibliothèque standard uniquement).
"""
import json
import os
import pathlib
import sqlite3
import unicodedata
import zlib

RACINE_JEU = pathlib.Path(__file__).resolve().parent.parent          # manager-foot/
DOSSIER_JEU_DONNEES = pathlib.Path(os.environ.get('BOOBAST_DATA_DIR') or RACINE_JEU / 'donnees_jeu').expanduser().resolve()                       # base, cache, journaux (non versionné)
BASE = DOSSIER_JEU_DONNEES / 'monde.db'
CACHE_IMAGES = DOSSIER_JEU_DONNEES / 'cache_images'
FICHIER_CONFIG = DOSSIER_JEU_DONNEES / 'config.json'


def lire_config():
    try:
        return json.loads(FICHIER_CONFIG.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def ecrire_config(cfg):
    DOSSIER_JEU_DONNEES.mkdir(parents=True, exist_ok=True)
    FICHIER_CONFIG.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding='utf-8')


def trouver_football_monde(explicite=None):
    """Dossier Football_Monde : argument, variable FOOTBALL_MONDE, config, puis dossiers voisins."""
    cands = []
    if explicite:
        cands.append(pathlib.Path(explicite))
    if os.environ.get('FOOTBALL_MONDE'):
        cands.append(pathlib.Path(os.environ['FOOTBALL_MONDE']))
    if lire_config().get('football_monde'):
        cands.append(pathlib.Path(lire_config()['football_monde']))
    base = RACINE_JEU
    for _ in range(5):
        cands += [base / 'Football_Monde', base / 'donnees' / 'Football_Monde']
        base = base.parent
    for c in cands:
        if (c / 'base_geante_v8' / 'manifest.json').is_file():
            return c.resolve()
    return None


def normaliser(s):
    """Minuscules, sans accents ni ponctuation : « Mbappé » == « mbappe »."""
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace('ø', 'o').replace('Ø', 'o').replace('ł', 'l').replace('Ł', 'l').replace('ß', 'ss').replace('đ', 'd').replace('ı', 'i')
    s = s.casefold()
    return ' '.join(''.join(ch if ch.isalnum() else ' ' for ch in s).split())


def pack(obj):
    return zlib.compress(json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf-8'), 6)


def unpack(blob):
    if blob is None:
        return None
    return json.loads(zlib.decompress(blob).decode('utf-8'))


def connexion(lecture_seule=False):
    if lecture_seule:
        con = sqlite3.connect(f'file:{BASE.as_posix()}?mode=ro', uri=True, check_same_thread=False)
    else:
        DOSSIER_JEU_DONNEES.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(BASE, check_same_thread=False)
        con.execute('PRAGMA journal_mode=WAL')
    con.row_factory = sqlite3.Row
    return con


# Postes EA -> postes du jeu (GB, DC, DG, DD, MDC, MC, MOC, AG, AD, BU)
POSTES_EA = {
    'GK': 'GB', 'CB': 'DC', 'LB': 'DG', 'LWB': 'DG', 'RB': 'DD', 'RWB': 'DD',
    'CDM': 'MDC', 'CM': 'MC', 'CAM': 'MOC', 'LM': 'AG', 'LW': 'AG', 'RM': 'AD', 'RW': 'AD',
    'ST': 'BU', 'CF': 'BU',
}
# Libellés Transfermarkt (« Defender - Centre-Back ») -> postes du jeu
POSTES_TM = {
    'goalkeeper': 'GB', 'centre-back': 'DC', 'left-back': 'DG', 'right-back': 'DD',
    'defensive midfield': 'MDC', 'central midfield': 'MC', 'attacking midfield': 'MOC',
    'left midfield': 'AG', 'left winger': 'AG', 'right midfield': 'AD', 'right winger': 'AD',
    'centre-forward': 'BU', 'second striker': 'BU',
}


def poste_jeu(brut):
    if not brut:
        return None
    b = str(brut).strip()
    if b.upper() in POSTES_EA:
        return POSTES_EA[b.upper()]
    if b.split()[0].upper() in POSTES_EA:
        return POSTES_EA[b.split()[0].upper()]
    low = b.lower()
    for k, v in POSTES_TM.items():
        if k in low:
            return v
    if 'goalkeeper' in low:
        return 'GB'
    if 'defen' in low:
        return 'DC'
    if 'midfield' in low:
        return 'MC'
    if 'attack' in low or 'forward' in low:
        return 'BU'
    return None
