"""Visages du pack NewGAN (portraits générés par IA, gratuits) pour les joueurs sans photo.

    python outils/visages_newgan.py CHEMIN/NewGAN_facepack           # attribue un visage à chaque joueur sans image
    python outils/visages_newgan.py CHEMIN --essai                   # affiche la répartition sans rien enregistrer
    python outils/visages_newgan.py --retirer                        # retire tous les visages NewGAN

Le pack (à télécharger soi-même, communauté FM « NewGAN ») contient des dossiers par grande région : African, Asian,
Caucasian, Central European, EECA, Italmed, MENA, MESA, SAMed, Scandinavian, Seasian, South American, SpanMed,
YugoGreek (les noms de dossier sont reconnus sans tenir compte de la casse).
Choix du dossier : nationalité du joueur, avec la diversité réelle des pays (une part des joueurs français, anglais,
belges, néerlandais… reçoit un visage d'un autre groupe), stable par joueur (empreinte, pas de hasard).
Chaque portrait n'est utilisé qu'une fois tant que le dossier en contient assez. Images enregistrées comme ajouts
(table images, statut « manuel ») et repérées dans images_ia (moteur « newgan ») : le jeu les signale « Visage généré
par IA ». Une vraie photo reste prioritaire. Aucune ligne de NewGAN-Manager (GPL-3) n'est reprise : idée seulement.
"""
import argparse
import datetime
import hashlib
import os
import pathlib
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
import images  # noqa: E402
from generer_visages_ia import SCHEMA, candidats  # noqa: E402
from scenario import code_nat  # noqa: E402

GROUPES = ['African', 'Asian', 'Caucasian', 'Central European', 'EECA', 'Italmed', 'MENA', 'MESA', 'SAMed', 'Scandinavian', 'Seasian',
           'South American', 'SpanMed', 'YugoGreek']
REGIONS = {
    'Caucasian': 'ENG SCO WAL NIR IRL USA CAN AUS NZL GIB',
    'Central European': 'FRA GER AUT SUI BEL NED LUX LIE POL HUN SVK SVN',
    'Scandinavian': 'NOR SWE DEN FIN ISL FRO',
    'EECA': 'RUS UKR BLR CZE ROU BUL MDA GEO ARM AZE KAZ UZB KGZ TJK TKM EST LVA LTU MKD',
    'YugoGreek': 'SRB CRO BIH MNE KVX ALB GRE',
    'Italmed': 'ITA MLT SMR MON',
    'SpanMed': 'ESP POR AND',
    'SAMed': 'ARG URU',
    'South American': 'BRA COL CHI PER ECU VEN PAR BOL MEX CRC PAN HON GUA SLV NCA CUB DOM PUR',
    'MENA': 'MAR ALG TUN EGY LBY ISR LBN CYP TUR',
    'MESA': 'KSA QAT UAE KUW BHR OMA IRQ IRN JOR SYR PLE YEM AFG PAK IND BAN SRI NEP',
    'Asian': 'JPN KOR CHN PRK HKG TPE MNG',
    'Seasian': 'THA VIE IDN MAS SIN PHI MYA CAM LAO',
}
PAYS_GROUPE = {c: g for g, codes in REGIONS.items() for c in codes.split()}
# diversité des sélections et des championnats : part approximative de joueurs d'un autre groupe (Afrique, Maghreb…)
DIVERSITE = {'FRA': [('African', .32), ('MENA', .1)], 'ENG': [('African', .25)], 'BEL': [('African', .28), ('MENA', .08)],
             'NED': [('African', .22), ('MENA', .08)], 'POR': [('African', .2)], 'SUI': [('African', .15), ('YugoGreek', .1)],
             'GER': [('African', .12), ('MENA', .08)], 'SWE': [('African', .12), ('MENA', .08)], 'NOR': [('African', .1)],
             'DEN': [('African', .08)], 'ESP': [('African', .08), ('South American', .05)], 'ITA': [('African', .07)],
             'BRA': [('African', .35)], 'COL': [('African', .2)], 'USA': [('African', .3), ('South American', .12)], 'CAN': [('African', .2)],
             'AUT': [('YugoGreek', .12), ('African', .06)], 'IRL': [('African', .06)], 'SCO': [('African', .04)]}


def empreinte(*k):
    return int(hashlib.sha1('|'.join(map(str, k)).encode()).hexdigest()[:12], 16)


ALIAS = {'JAP': 'JPN', 'JAPON': 'JPN', 'COREE': 'KOR', 'CHINE': 'CHN', 'AUSTRALIE': 'AUS', 'ETATS': 'USA', 'ÉTATS': 'USA', 'MAROC': 'MAR', 'ALGERIE': 'ALG',
         'ALGÉRIE': 'ALG', 'TUNISIE': 'TUN', 'EGYPTE': 'EGY', 'ÉGYPTE': 'EGY', 'TURQUIE': 'TUR', 'IRAN': 'IRN', 'INDE': 'IND', 'ARABIE': 'KSA',
         'SENEGAL': 'SEN', 'SÉNÉGAL': 'SEN', 'NIGERIA': 'NGA', 'GHANA': 'GHA', 'CAMEROUN': 'CMR', 'MEXIQUE': 'MEX', 'BRESIL': 'BRA', 'BRÉSIL': 'BRA'}
AFRIQUE = set('SEN CIV CMR NGA GHA MLI GUI BFA COD CGO GAB ANG RSA ZAM ZIM KEN ETH TAN UGA BEN TOG NIG CPV GAM GNB SLE LBR MTN MAD MOZ SUD JAM HAI TRI'.split())
INCONNUES = {}


def groupe_pour(j):
    nat = code_nat(j.get('nat')) or ''
    nat = ALIAS.get(nat, ALIAS.get(str(j.get('nat') or '').split()[0].upper() if j.get('nat') else '', nat))
    if nat in AFRIQUE:
        base = 'African'
    elif nat in PAYS_GROUPE:
        base = PAYS_GROUPE[nat]
    else:
        INCONNUES[nat or '?'] = INCONNUES.get(nat or '?', 0) + 1
        base = 'Central European'
    r = (empreinte('ethnie', j['id']) % 10000) / 10000
    for g, part in DIVERSITE.get(nat, []):
        if r < part:
            return g
        r -= part
    return base


def lire_pack(dossier):
    pack = {}
    for d in pathlib.Path(dossier).iterdir():
        if not d.is_dir():
            continue
        g = next((x for x in GROUPES if x.lower() == d.name.lower()), None)
        if g:
            pack[g] = sorted(p for p in d.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'))
    return pack


def executer(con, dossier, maxi=100000, essai=False, pays=None):
    con.execute(SCHEMA)
    pack = lire_pack(dossier)
    if not pack:
        raise SystemExit(f'Aucun dossier de visages reconnu dans {dossier} (attendu : {", ".join(GROUPES)}).')
    utilises = {r[0] for r in con.execute("SELECT consigne FROM images_ia WHERE moteur='newgan'")}
    res = images.Ressources(lambda: con, None)
    stats, faits = {}, 0
    for j in candidats(con, pays, maxi):
        g = groupe_pour(j)
        L = pack.get(g) or pack.get('Central European') or next(iter(pack.values()))
        libres = [p for p in L if str(p) not in utilises] or L  # chaque portrait une fois, tant qu'il en reste
        f = libres[empreinte('visage', j['id']) % len(libres)]
        stats[g] = stats.get(g, 0) + 1
        if essai:
            continue
        try:
            res.ajouter_manuel(con, 'joueur', j['id'], f.read_bytes())
        except ValueError as e:
            print(f"  {f.name} : {e}")
            continue
        utilises.add(str(f))
        with con:
            con.execute('INSERT OR REPLACE INTO images_ia VALUES (?,?,?,?,?)', (j['id'], 'newgan', str(f), 0, datetime.datetime.now().isoformat(timespec='seconds')))
        faits += 1
    return {'attribues': faits, 'par_groupe': stats, 'portraits_dans_le_pack': {g: len(v) for g, v in pack.items()},
            'nationalites_non_reconnues': dict(sorted(INCONNUES.items(), key=lambda x: -x[1])[:15])}


def retirer(con):
    con.execute(SCHEMA)
    res = images.Ressources(lambda: con, None)
    ids = [r[0] for r in con.execute("SELECT id FROM images_ia WHERE moteur='newgan'")]
    for i in ids:
        res.retirer_manuel(con, 'joueur', i)
    with con:
        con.execute("DELETE FROM images_ia WHERE moteur='newgan'")
    return len(ids)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('dossier', nargs='?', help='dossier du pack NewGAN (sous-dossiers par région)')
    ap.add_argument('--pays', help='seulement les joueurs des championnats de ce pays (ex. France)')
    ap.add_argument('--max', type=int, default=100000)
    ap.add_argument('--essai', action='store_true')
    ap.add_argument('--retirer', action='store_true')
    a = ap.parse_args()
    con = commun.connexion()
    if a.retirer:
        print(f'{retirer(con)} visage(s) NewGAN retiré(s).')
        return
    if not a.dossier:
        ap.error('indique le dossier du pack NewGAN')
    print(executer(con, a.dossier, a.max, a.essai, a.pays))


if __name__ == '__main__':
    main()
