"""Lecture des enrichissements (reep, transfermarkt-datasets, Wikidata) pour le scénario.

Toutes les fonctions tolèrent l'absence des tables : sans import complémentaire, le jeu se comporte comme avant.
Priorité : Transfermarkt (mis à jour chaque semaine, premières divisions) > Wikidata > registre reep.
"""
import sqlite3

from commun import normaliser

_TABLES = {}


def a_table(con, nom):
    k = (id(con), nom)
    if not _TABLES.get(k):  # seule la présence est mémorisée : une table créée plus tard (import) est vue
        _TABLES[k] = con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (nom,)).fetchone() is not None
    return _TABLES[k]


def _un(con, sql, args):
    try:
        return con.execute(sql, args).fetchone()
    except sqlite3.OperationalError:
        return None


def age_de(dob, ref='2026-07-01'):
    try:
        y, m, d = (int(x) for x in dob[:10].split('-'))
        ry, rm, rd = (int(x) for x in ref.split('-'))
        return ry - y - ((rm, rd) < (m, d))
    except (ValueError, AttributeError, TypeError):
        return None


def qid_club(con, cid):
    if not a_table(con, 'liens'):
        return None
    r = _un(con, "SELECT qid FROM liens WHERE type='club' AND id=?", (cid,))
    return r[0] if r else None


def infos_club(con, cid):
    """Stade, capacité, fondation, entraîneur actuel (avec sources) pour un club de la base."""
    out, sources = {}, []
    tm = _un(con, "SELECT c.* FROM liens_tm l JOIN tm_clubs c ON c.tm = l.tm WHERE l.type='club' AND l.id=?", (cid,)) if a_table(con, 'liens_tm') and a_table(con, 'tm_clubs') else None
    q = qid_club(con, cid)
    wd = _un(con, 'SELECT * FROM wd_clubs WHERE qid=?', (q,)) if q and a_table(con, 'wd_clubs') else None
    we = _un(con, 'SELECT * FROM wd_entraineurs WHERE club_qid=?', (q,)) if q and a_table(con, 'wd_entraineurs') else None
    rc = _un(con, "SELECT r.* FROM liens l JOIN reep_clubs r ON r.reep_id = l.reep_id WHERE l.type='club' AND l.id=?", (cid,)) if a_table(con, 'reep_clubs') else None
    if tm:
        sources.append('Transfermarkt (transfermarkt-datasets, CC0)')
        out.update({'stadium': tm['stade'], 'capacity': tm['places'], 'marketValue': tm['valeur_totale']})
    if wd:
        sources.append('Wikidata')
        out.setdefault('stadium', wd['stade']); out['stadium'] = out['stadium'] or wd['stade']
        out['capacity'] = out.get('capacity') or wd['capacite']
        out['founded'] = wd['fondation']; out['colorsLabel'] = wd['couleurs']; out['logoCommons'] = bool(wd['logo'])
    if rc:
        out['stadium'] = out.get('stadium') or rc['stade']; out['founded'] = out.get('founded') or rc['fondation']
        if 'Wikidata' not in sources:
            sources.append('reep (CC0)')
    coach = None
    if tm and tm['entraineur']:
        coach = {'name': tm['entraineur'], 'source': 'Transfermarkt'}
        if we and normaliser(we['nom'] or '') == normaliser(tm['entraineur']):
            coach.update({'qid': we['qid'], 'dob': we['naissance'], 'natLabel': we['nat'], 'photo': f'/img/wd/{we["qid"]}' if we['image'] else None, 'since': we['debut']})
    elif we and we['nom']:
        coach = {'name': we['nom'], 'qid': we['qid'], 'dob': we['naissance'], 'natLabel': we['nat'], 'since': we['debut'],
                 'photo': f'/img/wd/{we["qid"]}' if we['image'] else None, 'source': 'Wikidata'}
    if coach:
        coach['age'] = age_de(coach.get('dob'))
        out['coach'] = coach
    out = {k: v for k, v in out.items() if v not in (None, '')}
    if out:
        out['sources'] = sources
    return out


def infos_joueur(con, tm_id):
    """Valeur marchande, fin de contrat, pied, agent (transfermarkt-datasets) d'après l'identifiant Transfermarkt."""
    if not tm_id or not a_table(con, 'tm_joueurs'):
        return {}
    r = _un(con, 'SELECT valeur, fin_contrat, pied, agent, selections, taille FROM tm_joueurs WHERE tm=?', (str(tm_id),))
    if not r:
        return {}
    out = {k: v for k, v in {'marketValue': r['valeur'], 'contractEnd': r['fin_contrat'], 'foot': r['pied'], 'agent': r['agent'],
                             'caps': r['selections'], 'heightTm': r['taille']}.items() if v not in (None, '')}
    if a_table(con, 'tm_transferts'):  # 6 derniers transferts réels
        t = con.execute('SELECT date, de_nom, vers_nom, indemnite, valeur FROM tm_transferts WHERE joueur_tm=? ORDER BY date DESC LIMIT 6', (str(tm_id),)).fetchall()
        if t:
            out['transfersReal'] = [[x['date'], x['de_nom'], x['vers_nom'], x['indemnite'], x['valeur']] for x in t]
    if a_table(con, 'tm_saisons'):  # 3 dernières saisons réelles (compétitions couvertes par transfermarkt-datasets)
        t = con.execute('SELECT * FROM tm_saisons WHERE joueur_tm=? ORDER BY saison DESC LIMIT 3', (str(tm_id),)).fetchall()
        if t:
            out['seasonsReal'] = [[x['saison'], x['matchs'], x['minutes'], x['buts'], x['passes'], x['jaunes'], x['rouges']] for x in t]
    return out


def effectif_wikidata(con, cid, deja):
    """Joueurs actuels du club selon Wikidata (clubs sans joueurs notés), hors personnes déjà présentes (QID)."""
    q = qid_club(con, cid)
    if not q or not a_table(con, 'wd_effectifs'):
        return []
    lies = set()
    if a_table(con, 'liens') and deja:
        for i in range(0, len(deja), 500):
            part = list(deja)[i:i + 500]
            lies |= {r[0] for r in con.execute(f"SELECT qid FROM liens WHERE type='joueur' AND id IN ({','.join('?' * len(part))})", part)}
    out = []
    for r in con.execute('SELECT * FROM wd_effectifs WHERE club_qid=? ORDER BY naissance DESC', (q,)):
        if r['qid'] in lies:
            continue
        out.append(dict(r))
    return out


def image_wd(con, qid):
    """URL Commons d'une personne Wikidata (entraîneur, joueur d'effectif ou photo de joueur)."""
    for t, col in (('wd_entraineurs', 'qid'), ('wd_effectifs', 'qid'), ('wd_images', 'qid')):
        if a_table(con, t):
            r = _un(con, f'SELECT image FROM {t} WHERE {col}=? AND image IS NOT NULL LIMIT 1', (qid,))
            if r and r[0]:
                return r[0]
    return None


def logo_wd(con, cid):
    q = qid_club(con, cid)
    if not q or not a_table(con, 'wd_clubs'):
        return None
    r = _un(con, 'SELECT logo FROM wd_clubs WHERE qid=?', (q,))
    return r[0] if r else None


def rep_elo(con, cid):
    """Réputation déduite de l'Elo ClubElo (importer_clubelo.py), ou None."""
    if not a_table(con, 'liens_elo'):
        return None
    r = _un(con, 'SELECT elo FROM liens_elo WHERE club_id=?', (cid,))
    if not r:
        return None
    return max(30, min(95, round(38 + (r[0] - 1300) * .08)))


def maillot(con, cid):
    """Maillot le plus récent du club (open-jersey-db, ODbL) : couleurs domicile/extérieur, équipementier, sponsor."""
    if not a_table(con, 'maillots'):
        return None
    import json
    rows = con.execute("SELECT * FROM maillots WHERE club_id=? ORDER BY saison DESC", (cid,)).fetchall()
    if not rows:
        return None
    saison = rows[0]['saison']
    par = {r['type']: r for r in rows if r['saison'] == saison}
    dom, ext = par.get('home'), par.get('away')
    ref = dom or ext or rows[0]
    out = {'season': saison, 'manufacturer': ref['equipementier'], 'sponsor': ref['sponsor'], 'source': 'open-jersey-db (ODbL)'}
    if dom and json.loads(dom['couleurs'] or '[]'):
        out['home'] = json.loads(dom['couleurs'])
    if ext and json.loads(ext['couleurs'] or '[]'):
        out['away'] = json.loads(ext['couleurs'])
    out = {k: v for k, v in out.items() if v}
    return out if any(k in out for k in ('home', 'away', 'manufacturer', 'sponsor')) else None
