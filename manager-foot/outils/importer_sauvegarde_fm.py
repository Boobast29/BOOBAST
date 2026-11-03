"""Transforme ta propre sauvegarde Football Manager 26/27 en monde jouable dans Manager Foot (usage personnel, sur ton PC).

    pip install fmsave                                         # lecteur de sauvegardes FM (rhiever/fmsave, MIT)
    python outils/importer_sauvegarde_fm.py CARRIERE.fm --lister
    python outils/importer_sauvegarde_fm.py CARRIERE.fm --ligues 12,34,56 --noms "Ligue 1,Ligue 2,National" \\
        [--pays FRA] [--visages DOSSIER_PACK] [--logos DOSSIER_PACK] [--sortie monde_fm.json]

1. --lister affiche les championnats de la sauvegarde (identifiant, nombre de clubs, premiers du classement).
2. --ligues choisit les championnats, dans l'ordre des divisions (le premier = division 1).
3. Le fichier produit (donnees_jeu/monde_fm.json par défaut) s'importe dans le jeu : écran d'accueil, « Importer (JSON) ».

Conversion :
- les 52 attributs FM (1-20) donnent les 9 qualités du moteur et les sous-notes détaillées (fiche « 37 attributs ») ;
- poste : la meilleure note de poste FM ; pied fort, taille, personnalité (professionnalisme, ambition, loyauté,
  tempérament, leadership), fin de contrat, potentiel (rapport PA/CA) ;
- nationalité : identifiants de nation FM -> codes FIFA (outils/nations_fm.json, d'après FMSuperScout, MIT) ;
- visages et logos : si tu indiques tes packs graphiques, les images sont reliées par l'identifiant unique FM et copiées
  dans manager-foot/fm_images (dossier non versionné).
Rien n'est publié : les données de la sauvegarde viennent de la base de Football Manager et restent sur ton PC.
"""
import argparse
import datetime
import json
import os
import pathlib
import shutil
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
RACINE = pathlib.Path(__file__).resolve().parent.parent
NATIONS_FM = {k: v for k, v in json.loads((pathlib.Path(__file__).resolve().parent / 'nations_fm.json').read_text(encoding='utf-8')).items() if not k.startswith('_')}

# meilleure note de poste FM -> poste du jeu
POSTES = [('gk', 'GB'), ('dc', 'DC'), ('sw', 'DC'), ('dl', 'DG'), ('wbl', 'DG'), ('dr', 'DD'), ('wbr', 'DD'), ('dm', 'MDC'), ('mc', 'MC'),
          ('ml', 'MC'), ('mr', 'MC'), ('amc', 'MOC'), ('aml', 'AG'), ('amr', 'AD'), ('stc', 'BU')]
# 9 qualités du moteur : moyennes pondérées d'attributs FM
QUALITES = {
    'fin': {'finishing': .6, 'composure': .2, 'off_the_ball': .2},
    'pas': {'passing': .5, 'vision': .3, 'decisions': .2},
    'dri': {'dribbling': .6, 'flair': .2, 'agility': .2},
    'tec': {'technique': .6, 'first_touch': .4},
    'tac': {'tackling': .4, 'marking': .35, 'positioning': .25},
    'vit': {'pace': .5, 'acceleration': .5},
    'phy': {'strength': .4, 'stamina': .3, 'jumping_reach': .3},
    'men': {'decisions': .2, 'anticipation': .2, 'composure': .15, 'concentration': .15, 'determination': .15, 'work_rate': .15},
    'gar': {'reflexes': .25, 'handling': .2, 'one_on_ones': .2, 'command_of_area': .15, 'aerial_reach': .1, 'kicking': .1},
}
# sous-notes détaillées (clés lues par js/attributs.js, échelle 99) <- attributs FM
DETAIL = {
    'attacking_finishing': ['finishing'], 'power_long_shots': ['long_shots'], 'power_shot_power': ['long_shots', 'strength'],
    'attacking_heading_accuracy': ['heading'], 'attacking_short_passing': ['passing'], 'skill_long_passing': ['passing', 'vision'],
    'attacking_crossing': ['crossing'], 'skill_dribbling': ['dribbling'], 'skill_ball_control': ['first_touch', 'technique'],
    'skill_fk_accuracy': ['free_kick_taking'], 'skill_curve': ['corners', 'technique'], 'mentality_penalties': ['penalty_taking'],
    'defending_standing_tackle': ['tackling'], 'defending_sliding_tackle': ['tackling'], 'defending_marking_awareness': ['marking'],
    'mentality_interceptions': ['anticipation'], 'mentality_vision': ['vision'], 'mentality_composure': ['composure'],
    'movement_reactions': ['decisions', 'concentration'], 'mentality_aggression': ['aggression', 'bravery'], 'power_strength': ['strength'],
    'power_stamina': ['stamina'], 'movement_acceleration': ['acceleration'], 'movement_sprint_speed': ['pace'], 'movement_agility': ['agility'],
    'movement_balance': ['balance'], 'power_jumping': ['jumping_reach'], 'goalkeeping_reflexes': ['reflexes'],
    'goalkeeping_diving': ['reflexes', 'one_on_ones'], 'goalkeeping_handling': ['handling'], 'goalkeeping_positioning': ['positioning', 'command_of_area'],
    'goalkeeping_kicking': ['kicking'],
}


def _a(attrs, k):
    v = getattr(attrs, k, None) if not isinstance(attrs, dict) else attrs.get(k)
    return v if isinstance(v, (int, float)) and 1 <= v <= 20 else None


def moyenne(attrs, poids):
    s = w = 0
    for k, x in poids.items():
        v = _a(attrs, k)
        if v is not None:
            s += v * x
            w += x
    return round(s / w) if w else 10


def poste(p):
    pos = getattr(p, 'positions', None)
    best = max(POSTES, key=lambda kv: (getattr(pos, kv[0], 0) or 0) if pos is not None else 0)
    if pos is not None and (getattr(pos, best[0], 0) or 0) > 0:
        return best[1]
    nat = [x.lower().replace(' ', '') for x in (getattr(p, 'natural_positions', ()) or ())]
    for code, jeu in POSTES:
        if code in nat:
            return jeu
    return 'MC'


def personnalite(p):
    pe, at = getattr(p, 'personality', None), getattr(p, 'attributes', None)
    g = lambda o, k: (getattr(o, k, 0) or 0) if o is not None else 0
    if g(at, 'leadership') >= 16:
        return 'Leader'
    if g(pe, 'temperament') and g(pe, 'temperament') <= 6:
        return 'Tempérament'
    if g(pe, 'professionalism') >= 15:
        return 'Professionnel'
    if g(pe, 'ambition') >= 15:
        return 'Ambitieux'
    if g(pe, 'loyalty') >= 15:
        return 'Loyal'
    return 'Discret'


def nation(p, nations_db, defaut):
    """nation_id de la sauvegarde -> identifiant FM stable (table nations) -> code FIFA."""
    db = nations_db.get(getattr(p, 'nation_id', None))
    return (NATIONS_FM.get(str(db)) if db is not None else None) or defaut


def joueur(p, nations_db, pays, date_ref):
    at = p.attributes
    q = {k: max(1, min(20, moyenne(at, w))) for k, w in QUALITES.items()}
    detail = {}
    for k, srcs in DETAIL.items():
        vals = [_a(at, s) for s in srcs]
        vals = [v for v in vals if v is not None]
        if vals:
            detail[k] = round(sum(vals) / len(vals) * 99 / 20)
    gauche, droit = getattr(p, 'left_foot', 0) or 0, getattr(p, 'right_foot', 0) or 0
    pied = 'Les deux' if min(gauche, droit) >= 15 else 'Gauche' if gauche > droit else 'Droit'
    out = {'name': p.name or ' '.join(x for x in (p.first_name, p.last_name) if x) or f'Joueur {p.uid}', 'age': p.age or 24,
           'nat': nation(p, nations_db, pays), 'pos': poste(p), 'foot': pied, 'pers': personnalite(p), 'attrs': q, 'detail99': detail,
           'fmUid': getattr(p, 'unique_id', None) or None}
    ab = getattr(p, 'ability', None)
    if ab and ab.current and ab.potential and ab.potential > ab.current:
        out['paEcart'] = int(ab.potential - ab.current)  # marge de progression FM (échelle 1-200), convertie par le jeu
    c = getattr(p, 'contract', None)
    if c and getattr(c, 'end', None):
        out['contract'] = max(1, min(5, c.end.year - date_ref.year + (1 if c.end.month > 6 else 0)))
    return out


def construire(players, clubs, tables, nations, ligues, noms, pays='FRA', date_ref=None):
    """Monde au format d'import du jeu (voir exportDatabase dans js/app.js)."""
    date_ref = date_ref or datetime.date.today()
    nations_db = {n.nation_id: n.database_id for n in nations}
    club_par_uid = {c.uid: c for c in clubs}
    div_de = {}
    for i, lid in enumerate(ligues):
        t = next((t for t in tables if t.competition_id == lid), None)
        if not t:
            raise SystemExit(f'Championnat {lid} introuvable (utilise --lister).')
        for r in t.rows:
            if r.club_uid is not None:
                div_de.setdefault(r.club_uid, (i + 1, r.position))
    par_club = defaultdict(list)
    for p in players:
        if getattr(p, 'club_uid', None) in div_de and getattr(p, 'attributes', None) is not None:
            par_club[p.club_uid].append(p)
    sortie = []
    for uid, (div, rang) in sorted(div_de.items(), key=lambda kv: kv[1]):
        c = club_par_uid.get(uid)
        effectif = sorted(par_club.get(uid, []), key=lambda p: -(getattr(getattr(p, 'ability', None), 'current', 0) or 0))[:30]
        js = [joueur(p, nations_db, pays, date_ref) for p in effectif]
        rep = getattr(c, 'reputation', None) if c else None
        sortie.append({'name': (c.name if c else None) or f'Club {uid}', 'short': ((c.short_name if c else None) or '')[:4].upper() or None,
                       'div': div, 'rep': max(30, min(95, round((rep or 5000) / 10000 * 60 + 35))) if rep is not None else 60,
                       'fmUid': (getattr(c, 'unique_id', None) if c else None), 'players': js})
    nats = Counter(j['nat'] for c in sortie for j in c['players'])
    return {'leagueNames': noms or [f'Division {i + 1}' for i in range(len(ligues))], 'cupName': 'Coupe nationale',
            '_source': 'Sauvegarde Football Manager personnelle (lue avec fmsave). Usage personnel uniquement.',
            'clubs': sortie, 'freeAgents': [], '_bilan': {'clubs': len(sortie), 'joueurs': sum(len(c['players']) for c in sortie), 'nations': nats.most_common(8)}}


def relier_images(monde, visages=None, logos=None):
    """Copie les images des packs (reliées par identifiant unique FM) dans fm_images et renseigne photo / logo."""
    import importer_pack_fm as ipf
    dest = RACINE / 'fm_images'
    n = 0
    for dossier, typ in ((visages, 'joueur'), (logos, 'club')):
        if not dossier:
            continue
        pack = ipf.fichiers_pack(dossier, typ)
        dest.mkdir(exist_ok=True)
        cibles = [c for c in monde['clubs']] if typ == 'club' else [j for c in monde['clubs'] for j in c['players']]
        for o in cibles:
            f = pack.get(str(o.get('fmUid')))
            if not f:
                continue
            nom = f"{'c' if typ == 'club' else 'p'}{o['fmUid']}{f.suffix.lower()}"
            shutil.copyfile(f, dest / nom)
            o['logo' if typ == 'club' else 'photo'] = f'fm_images/{nom}'
            n += 1
    return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sauvegarde')
    ap.add_argument('--lister', action='store_true')
    ap.add_argument('--ligues', help='identifiants de championnat séparés par des virgules (division 1 en premier)')
    ap.add_argument('--noms', help='noms des divisions, séparés par des virgules')
    ap.add_argument('--pays', default='FRA', help='nationalité par défaut si une nation est inconnue (code FIFA)')
    ap.add_argument('--visages')
    ap.add_argument('--logos')
    ap.add_argument('--sortie', default=str(RACINE / 'donnees_jeu' / 'monde_fm.json'))
    a = ap.parse_args()
    try:
        import fmsave
    except ImportError:
        raise SystemExit('Le module fmsave est nécessaire : pip install fmsave (Python 3.12 ou plus récent).')
    with fmsave.open(a.sauvegarde) as s:
        tables = list(s.league_tables())
        if a.lister:
            for t in sorted(tables, key=lambda t: -t.club_count):
                tete = ', '.join(r.club_name or '?' for r in sorted(t.rows, key=lambda r: r.position)[:3])
                print(f'{t.competition_id:>6}  {t.club_count:>3} clubs  {t.competition_name or ""}  ({tete})')
            return
        if not a.ligues:
            ap.error('--ligues est nécessaire (voir --lister)')
        ligues = [int(x) for x in a.ligues.split(',') if x.strip()]
        noms = [x.strip() for x in a.noms.split(',')] if a.noms else None
        monde = construire(list(s.players()), list(s.clubs()), tables, list(s.nations()), ligues, noms, a.pays)
    n = relier_images(monde, a.visages, a.logos)
    sortie = pathlib.Path(a.sortie)
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text(json.dumps(monde, ensure_ascii=False), encoding='utf-8')
    print(f"{monde['_bilan']['clubs']} clubs, {monde['_bilan']['joueurs']} joueurs, {n} image(s) reliée(s) -> {sortie}")
    print('Dans le jeu : écran d\'accueil, « Importer (JSON) », puis choisis ce fichier.')


if __name__ == '__main__':
    main()
