"""Construit un monde jouable à partir des compétitions réelles V9 et des fiches notées.

Règles :
- seuls les joueurs `rated_snapshot` rattachés au club dans le snapshot EA (12/09/2026) forment l'effectif ;
- les profils historiques et identités d'archive ne sont jamais ajoutés d'office aux effectifs ;
- les attributs du jeu (sur 20) sont une conversion des attributs EA (sur 99), conservés à part ;
- aucun joueur réel n'est inventé : les trous d'effectif sont comblés côté jeu par des joueurs
  explicitement fictifs (fictional=true), et la liste des clubs concernés est renvoyée.
"""
import datetime
import json

import enrichissements
from commun import normaliser, unpack

PAYS = {  # pays V9 -> code du jeu
    'France': 'FRA', 'England': 'ENG', 'Germany': 'GER', 'Spain': 'ESP', 'Italy': 'ITA',
}
NOM_PAYS_FR = {'France': 'France', 'England': 'Angleterre', 'Germany': 'Allemagne', 'Spain': 'Espagne', 'Italy': 'Italie'}

# Nationalités (libellés source anglais) -> codes utilisés par le jeu ; sinon code dérivé, marqué tel quel.
NATS = {
    'France': 'FRA', 'Spain': 'ESP', 'Portugal': 'POR', 'Brazil': 'BRA', 'Argentina': 'ARG', 'Senegal': 'SEN',
    "Côte d'Ivoire": 'CIV', "Cote d'Ivoire": 'CIV', 'Ivory Coast': 'CIV', 'Morocco': 'MAR', 'Algeria': 'ALG', 'Belgium': 'BEL',
    'Germany': 'GER', 'Italy': 'ITA', 'Netherlands': 'NED', 'Cameroon': 'CMR', 'Mali': 'MLI', 'Croatia': 'CRO',
    'Serbia': 'SRB', 'England': 'ENG', 'Uruguay': 'URU', 'Colombia': 'COL', 'Denmark': 'DEN', 'Switzerland': 'SUI',
    'Norway': 'NOR', 'Japan': 'JPN', 'Tunisia': 'TUN', 'Ghana': 'GHA', 'United States': 'USA', 'USA': 'USA', 'Poland': 'POL',
    'Austria': 'AUT', 'Sweden': 'SWE', 'Turkey': 'TUR', 'Türkiye': 'TUR', 'Czech Republic': 'CZE', 'Czechia': 'CZE',
    'Scotland': 'SCO', 'Greece': 'GRE', 'Wales': 'WAL', 'Northern Ireland': 'NIR', 'Republic of Ireland': 'IRL', 'Ireland': 'IRL',
    'Nigeria': 'NGA', 'Guinea': 'GUI', 'DR Congo': 'COD', 'Congo DR': 'COD', 'Congo': 'CGO', 'Mexico': 'MEX', 'Chile': 'CHI',
    'Ecuador': 'ECU', 'Paraguay': 'PAR', 'Peru': 'PER', 'Venezuela': 'VEN', 'Canada': 'CAN', 'Australia': 'AUS', 'Korea Republic': 'KOR',
    'South Korea': 'KOR', 'Ukraine': 'UKR', 'Russia': 'RUS', 'Slovakia': 'SVK', 'Slovenia': 'SVN', 'Hungary': 'HUN', 'Romania': 'ROU',
    'Bosnia and Herzegovina': 'BIH', 'Bosnia-Herzegovina': 'BIH', 'Albania': 'ALB', 'Kosovo': 'KVX', 'North Macedonia': 'MKD',
    'Montenegro': 'MNE', 'Georgia': 'GEO', 'Iceland': 'ISL', 'Finland': 'FIN', 'Egypt': 'EGY', 'Gabon': 'GAB', 'Burkina Faso': 'BFA',
    'Gambia': 'GAM', 'The Gambia': 'GAM', 'Cape Verde': 'CPV', 'Cabo Verde': 'CPV', 'Angola': 'ANG', 'Jamaica': 'JAM', 'Haiti': 'HAI',
    'Guinea-Bissau': 'GNB', 'Togo': 'TOG', 'Benin': 'BEN', 'Comoros': 'COM', 'Madagascar': 'MAD', 'Equatorial Guinea': 'EQG',
    'Central African Republic': 'CTA', 'Mauritania': 'MTN', 'Zambia': 'ZAM', 'Zimbabwe': 'ZIM', 'South Africa': 'RSA', 'Kenya': 'KEN',
    'Israel': 'ISR', 'Iran': 'IRN', 'Armenia': 'ARM', 'Bulgaria': 'BUL', 'Luxembourg': 'LUX', 'Martinique': 'MTQ', 'Guadeloupe': 'GLP',
    'New Zealand': 'NZL', 'China PR': 'CHN', 'Suriname': 'SUR', 'Curacao': 'CUW', 'Curaçao': 'CUW', 'Lithuania': 'LTU', 'Estonia': 'EST',
    'Latvia': 'LVA', 'Cyprus': 'CYP', 'Malta': 'MLT', 'Moldova': 'MDA', 'Belarus': 'BLR', 'Azerbaijan': 'AZE', 'Kazakhstan': 'KAZ',
    'Uzbekistan': 'UZB', 'Saudi Arabia': 'KSA', 'Qatar': 'QAT', 'Iraq': 'IRQ', 'Syria': 'SYR', 'Lebanon': 'LBN', 'Jordan': 'JOR',
    'Libya': 'LBY', 'Sudan': 'SDN', 'Uganda': 'UGA', 'Tanzania': 'TAN', 'Mozambique': 'MOZ', 'Sierra Leone': 'SLE', 'Liberia': 'LBR',
    'Burundi': 'BDI', 'Rwanda': 'RWA', 'Niger': 'NIG', 'Chad': 'CHA', 'Costa Rica': 'CRC', 'Honduras': 'HON', 'Panama': 'PAN',
    'Bolivia': 'BOL', 'Dominican Republic': 'DOM', 'Faroe Islands': 'FRO', 'Andorra': 'AND', 'Liechtenstein': 'LIE', 'Philippines': 'PHI',
    'Indonesia': 'IDN', 'Thailand': 'THA', 'Vietnam': 'VIE', 'India': 'IND', 'French Guiana': 'GUF', 'Réunion': 'REU', 'New Caledonia': 'NCL',
}

# Conversion EA (sur 99) -> 9 attributs du moteur (sur 20). Pondérations documentées, modèle original.
CONVERSION = {
    'fin': {'attacking_finishing': .55, 'power_shot_power': .15, 'power_long_shots': .15, 'attacking_volleys': .1, 'mentality_penalties': .05},
    'pas': {'attacking_short_passing': .45, 'skill_long_passing': .3, 'mentality_vision': .25},
    'dri': {'skill_dribbling': .5, 'movement_agility': .25, 'movement_balance': .25},
    'tec': {'skill_ball_control': .45, 'attacking_crossing': .2, 'skill_curve': .2, 'skill_fk_accuracy': .15},
    'tac': {'defending_standing_tackle': .35, 'defending_sliding_tackle': .2, 'mentality_interceptions': .25, 'defending_awareness': .2},
    'vit': {'movement_sprint_speed': .5, 'movement_acceleration': .5},
    'phy': {'power_strength': .4, 'power_stamina': .35, 'power_jumping': .25},
    'men': {'movement_reactions': .3, 'mentality_composure': .3, 'mentality_positioning': .2, 'mentality_aggression': .2},
    'gar': {'goalkeeping_diving': .2, 'goalkeeping_handling': .2, 'goalkeeping_positioning': .2, 'goalkeeping_reflexes': .3, 'goalkeeping_kicking': .1},
}
VERSION_CONVERSION = 'conv-ea99-vers-jeu20-v1'


def code_nat(raw):
    if not raw:
        return None
    first = str(raw).split(',')[0].split('/')[0].strip()
    return NATS.get(first) or first[:3].upper()


def age_au(dob, ref='2026-07-01'):
    try:
        d = datetime.date.fromisoformat(dob[:10])
        r = datetime.date.fromisoformat(ref)
    except (TypeError, ValueError):
        return None
    return r.year - d.year - ((r.month, r.day) < (d.month, d.day))


def attrs_jeu(detail):
    """Renvoie (attrs sur 20, couverture 0-1). Valeur absente -> None, jamais 0."""
    if not detail:
        return None, 0.0
    out, total, have = {}, 0, 0
    for k, w in CONVERSION.items():
        s, ws = 0.0, 0.0
        for src, wt in w.items():
            total += 1
            v = detail.get(src)
            if v is not None:
                s += v * wt
                ws += wt
                have += 1
        out[k] = max(1, min(20, round(s / ws / 99 * 20))) if ws else None
    return out, have / total


def couleurs(seed):
    pal = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#ef6c00', '#37474f', '#ad1457', '#283593', '#558b2f', '#111111', '#4e342e', '#0277bd', '#d84315']
    h = sum(ord(c) * (i + 1) for i, c in enumerate(seed))
    return [pal[h % len(pal)], '#ffffff' if (h // 7) % 3 else '#111111']


def court(nom):
    mots = [m for m in nom.replace('.', ' ').split() if len(m) > 2 and m.upper() not in ('FC', 'AFC', 'CF', 'SC', 'AC', 'US', 'SV', 'VFB', 'TSV', 'RC', 'CD', 'UD', 'SD', 'SSC', 'ACF', 'AS', 'OGC', 'ESTAC')]
    base = (mots[0] if mots else nom).upper()
    import unicodedata
    base = ''.join(ch for ch in unicodedata.normalize('NFKD', base) if ch.isalpha() and ord(ch) < 128)
    return (base[:3] or 'CLB')


def joueur_jeu(row, con):
    fiche = unpack(con.execute('SELECT fiche FROM fiches WHERE id=?', (row['id'],)).fetchone()[0])
    cap = fiche.get('capacites') or {}
    attrs, couv = attrs_jeu(cap.get('attributs_detail_sur_99'))
    age = age_au(row['naissance'])
    return {
        'srcId': row['id'], 'name': row['nom'], 'nat': code_nat(row['nat']), 'natLabel': row['nat'],
        'age': age, 'ageKnown': age is not None, 'dob': row['naissance'],
        'pos': row['poste'], 'posRaw': row['poste_brut'], 'height': row['taille'],
        'attrs': attrs, 'attrCoverage': round(couv, 2),
        'ovr99': row['niveau99'], 'pot99': row['pot99'],
        'foot': None,
        'weakFoot': cap.get('pied_faible_sur_5'), 'skills': cap.get('gestes_techniques_sur_5'),
        'photo': f'/img/joueur/{row["id"]}' if (row['photo_local'] or row['photo_url']) else None,
        'real': True, 'quality': row['qualite'],
        **enrichissements.infos_joueur(con, row['tm_id']),
    }


def construire(con, pays):
    """Monde jouable pour un pays : ses niveaux V9 (tous les groupes) + D1 des quatre autres pays en Europe."""
    comps = [dict(r) for r in con.execute('SELECT * FROM competitions WHERE pays=? ORDER BY niveau, groupe, nom', (pays,))]
    if not comps:
        raise ValueError(f'pays inconnu : {pays}')
    etrangers = [dict(r) for r in con.execute('SELECT * FROM competitions WHERE pays<>? AND niveau=1', (pays,))]
    clubs, joueurs, incomplets = [], [], []
    vu_joueurs = set()

    def charger_club(cid, nom_insc, comp, div, foreign):
        c = con.execute('SELECT * FROM clubs WHERE id=?', (cid,)).fetchone()
        nom = (c['nom'] if c else None) or nom_insc
        rows = con.execute("SELECT * FROM joueurs WHERE club_id=? AND qualite='rated_snapshot'", (cid,)).fetchall()
        effectif = []
        for r in rows:
            if r['id'] in vu_joueurs or not r['poste']:
                continue  # un joueur = une seule identité dans la partie
            j = joueur_jeu(r, con)
            if not j['attrs']:
                continue
            vu_joueurs.add(r['id'])
            j['clubSrc'] = cid
            effectif.append(j)
        # Complément : profils historiques / identités rattachés au club (ou à un homonyme exact unique),
        # nés en 1988 ou après. Note de jeu ESTIMÉE (estimated=True), jamais présentée comme une note source.
        lien = None
        if len(effectif) < 22:
            ids = [cid]
            if not con.execute('SELECT 1 FROM joueurs WHERE club_id=? LIMIT 1', (cid,)).fetchone():
                cands = [x for x in con.execute("SELECT c.id, (SELECT count(*) FROM joueurs j WHERE j.club_id=c.id AND j.naissance>='1988') n FROM clubs c WHERE c.nom_norm=? AND c.id<>?", (normaliser(nom), cid)) if x['n'] > 0]
                if len(cands) == 1:
                    lien = cands[0]['id']
                    ids.append(lien)
            for r in con.execute(f"SELECT * FROM joueurs WHERE club_id IN ({','.join('?' * len(ids))}) AND qualite<>'rated_snapshot' AND naissance>='1988' AND poste IS NOT NULL ORDER BY naissance DESC", ids):
                if len(effectif) >= 26 or r['id'] in vu_joueurs:
                    continue
                vu_joueurs.add(r['id'])
                age = age_au(r['naissance'])
                effectif.append({'srcId': r['id'], 'name': r['nom'], 'nat': code_nat(r['nat']), 'natLabel': r['nat'], 'age': age, 'ageKnown': age is not None,
                                 'dob': r['naissance'], 'pos': r['poste'], 'posRaw': r['poste_brut'], 'height': r['taille'], 'attrs': None, 'attrCoverage': 0,
                                 'ovr99': None, 'pot99': None, 'estimated': True, 'quality': r['qualite'], 'real': True, 'clubSrc': cid,
                                 'photo': f'/img/joueur/{r["id"]}' if (r['photo_local'] or r['photo_url']) else None})
        # Complément Wikidata (effectif actuel déclaré sur Wikidata) pour les clubs sans assez de joueurs notés
        if len(effectif) < 22:
            for w in enrichissements.effectif_wikidata(con, cid, [j['srcId'] for j in effectif]):
                if len(effectif) >= 24:
                    break
                k = 'wd:' + w['qid']
                if k in vu_joueurs:
                    continue
                vu_joueurs.add(k)
                age = age_au(w['naissance'])
                effectif.append({'srcId': k, 'name': w['nom'], 'nat': code_nat(w['nat']), 'natLabel': w['nat'], 'age': age, 'ageKnown': age is not None,
                                 'dob': w['naissance'], 'pos': w['poste'] or 'MC', 'posRaw': None, 'posGuessed': not w['poste'], 'height': None, 'attrs': None,
                                 'attrCoverage': 0, 'ovr99': None, 'pot99': None, 'estimated': True, 'quality': 'wikidata', 'real': True, 'clubSrc': cid,
                                 'photo': f'/img/wd/{w["qid"]}' if w['image'] else None, 'source': 'Wikidata'})
        top = sorted((j['ovr99'] for j in effectif if j.get('ovr99')), reverse=True)[:14]
        moy = sum(top) / len(top) if top else None
        tier = comp['niveau']
        rep = round((moy - 50) * 1.45 + 40) if moy else (enrichissements.rep_elo(con, cid) or {1: 70, 2: 58, 3: 48, 4: 42}.get(tier, 45))
        rep = max(30, min(95, rep))
        hist = con.execute("SELECT count(*) FROM joueurs WHERE club_id=? AND qualite<>'rated_snapshot'", (cid,)).fetchone()[0]
        club = {
            'srcId': cid, 'name': nom, 'short': court(nom), 'colors': couleurs(cid), 'rep': rep,
            'div': div, 'foreign': foreign, 'country': PAYS.get(comp['pays'], comp['pays'][:3].upper()), 'countryLabel': comp['pays'],
            'tier': tier, 'compSrc': comp['id'], 'compName': comp['nom'], 'group': comp['groupe'],
            'logo': f'/img/club/{cid}' if c and (c['logo_local'] or c['logo_url']) else None,
            'realPlayers': sum(1 for j in effectif if not j.get('estimated')), 'estimatedPlayers': sum(1 for j in effectif if j.get('estimated')), 'linkProposed': lien, 'otherProfiles': hist, 'identityStatus': c['statut_identite'] if c else 'inconnu',
            'stadium': None, 'capacity': None,
        }
        club.update(enrichissements.infos_club(con, cid))
        kit = enrichissements.maillot(con, cid)
        if kit:
            club['kit'] = kit
            if kit.get('home'):  # couleurs du club = maillot domicile réel (2e couleur : détail du maillot ou maillot extérieur)
                club['colors'] = [kit['home'][0], (kit['home'][1:] or kit.get('away') or [club['colors'][1]])[0]]
        if not club['logo'] and enrichissements.logo_wd(con, cid):
            club['logo'] = f'/img/club/{cid}'
        if sum(1 for j in effectif if not j.get('estimated')) < 18:
            incomplets.append({'club': nom, 'srcId': cid, 'competition': comp['nom'], 'joueurs_notes': sum(1 for j in effectif if not j.get('estimated')),
                               'profils_estimes': sum(1 for j in effectif if j.get('estimated')), 'lien_propose': lien, 'autres_fiches': hist})
        clubs.append(club)
        for j in effectif:
            j['clubKey'] = cid
        joueurs.extend(effectif)

    # Divisions du pays choisi : un groupe = une division du moteur ; niveau conservé dans tier/group.
    divs = []
    for i, comp in enumerate(comps):
        div = i + 1
        divs.append({'div': div, 'name': comp['nom'], 'tier': comp['niveau'], 'group': comp['groupe'], 'srcId': comp['id'],
                     'rulesVerified': bool(comp['regles_verifiees']), 'format': json.loads(comp['fiche']).get('format')})
        for ins in con.execute('SELECT * FROM inscriptions WHERE competition_id=? ORDER BY nom', (comp['id'],)):
            charger_club(ins['club_id'], ins['nom'], comp, div, False)
    for comp in etrangers:
        for ins in con.execute('SELECT * FROM inscriptions WHERE competition_id=? ORDER BY nom', (comp['id'],)):
            charger_club(ins['club_id'], ins['nom'], comp, 0, True)

    meta = {k: v for k, v in con.execute("SELECT cle, valeur FROM meta WHERE cle IN ('dates_sources','import_termine')")}
    return {
        'kind': 'monde_reel', 'country': PAYS[pays], 'countryLabel': NOM_PAYS_FR.get(pays, pays), 'countrySrc': pays,
        'season': '2026/2027', 'divisions': divs, 'clubs': clubs, 'players': joueurs,
        'incomplete': incomplets, 'conversion': {'version': VERSION_CONVERSION, 'poids': CONVERSION},
        'sources': json.loads(meta.get('dates_sources', '{}')), 'imported': meta.get('import_termine'),
        'notice': ("Effectifs : joueurs notés du snapshot EA FC27 du 12/09/2026, non vérifiés comme effectifs officiels actuels. "
                   "Règlements 2026/27 appliqués (écran Compétitions → Règlement). "
                   "Contrats, salaires et budgets sont des valeurs de simulation ; stades, entraîneurs, valeurs marchandes et fins de contrat "
                   "réels quand les imports complémentaires (reep, transfermarkt-datasets, Wikidata) ont été faits."),
    }
