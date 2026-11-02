"""Génère js/donnees_ouvertes.js à partir des résultats internationaux (martj42/international_results, CC0).

    python outils/donnees_internationales.py CHEMIN/international_results

Produit (données dérivées, domaine public) :
- DO_ELO   : Elo actuel de chaque sélection (méthode eloratings.net : K selon la compétition, multiplicateur d'écart de buts,
             +100 à domicile hors terrain neutre), calculé sur tous les matchs depuis 1872 ;
- DO_HIST  : bilan historique (matchs, victoires, nuls, défaites, buts) et meilleurs buteurs de chaque sélection ;
- DO_NOMS  : prénoms et noms de buteurs internationaux depuis 1985, par pays, pour générer des joueurs fictifs crédibles
             (les combinaisons sont tirées au hasard : ce ne sont pas des personnes réelles).
"""
import csv
import json
import pathlib
import sys
from collections import Counter, defaultdict

# Nom anglais de la sélection -> code du jeu (FIFA)
CODES = {
    'France': 'FRA', 'Spain': 'ESP', 'Portugal': 'POR', 'Brazil': 'BRA', 'Argentina': 'ARG', 'Senegal': 'SEN', 'Ivory Coast': 'CIV',
    'Morocco': 'MAR', 'Algeria': 'ALG', 'Belgium': 'BEL', 'Germany': 'GER', 'Italy': 'ITA', 'Netherlands': 'NED', 'Cameroon': 'CMR',
    'Mali': 'MLI', 'Croatia': 'CRO', 'Serbia': 'SRB', 'England': 'ENG', 'Uruguay': 'URU', 'Colombia': 'COL', 'Denmark': 'DEN',
    'Switzerland': 'SUI', 'Norway': 'NOR', 'Japan': 'JPN', 'Tunisia': 'TUN', 'Ghana': 'GHA', 'United States': 'USA', 'Poland': 'POL',
    'Austria': 'AUT', 'Sweden': 'SWE', 'Turkey': 'TUR', 'Czech Republic': 'CZE', 'Scotland': 'SCO', 'Greece': 'GRE', 'Wales': 'WAL',
    'Republic of Ireland': 'IRL', 'Northern Ireland': 'NIR', 'Ukraine': 'UKR', 'Hungary': 'HUN', 'Romania': 'ROU', 'Slovakia': 'SVK',
    'Slovenia': 'SVN', 'Bosnia and Herzegovina': 'BIH', 'Albania': 'ALB', 'North Macedonia': 'MKD', 'Montenegro': 'MNE', 'Georgia': 'GEO',
    'Finland': 'FIN', 'Iceland': 'ISL', 'Russia': 'RUS', 'Israel': 'ISR', 'Bulgaria': 'BUL', 'Mexico': 'MEX', 'Canada': 'CAN',
    'Chile': 'CHI', 'Peru': 'PER', 'Ecuador': 'ECU', 'Paraguay': 'PAR', 'Venezuela': 'VEN', 'Bolivia': 'BOL', 'Nigeria': 'NGA',
    'Egypt': 'EGY', 'South Africa': 'RSA', 'DR Congo': 'COD', 'Guinea': 'GUI', 'Burkina Faso': 'BFA', 'Gabon': 'GAB', 'Cape Verde': 'CPV',
    'South Korea': 'KOR', 'Australia': 'AUS', 'Iran': 'IRN', 'Saudi Arabia': 'KSA', 'Qatar': 'QAT', 'Costa Rica': 'CRC', 'Jamaica': 'JAM',
    'Panama': 'PAN', 'Honduras': 'HON', 'Uzbekistan': 'UZB', 'Iraq': 'IRQ', 'Jordan': 'JOR', 'New Zealand': 'NZL', 'China PR': 'CHN',
}


PARTICULES = {'de', 'da', 'di', 'do', 'dos', 'das', 'del', 'van', 'von', 'der', 'den', 'le', 'la', 'el', 'al', 'ben', 'mac', 'mc', 'st.', "o'"}


def empreinte(nom):
    """FNV-1a 32 bits du nom normalisé (minuscules, sans accents) : même calcul que js/ouvert.js."""
    import unicodedata
    n = ''.join(c for c in unicodedata.normalize('NFKD', nom.lower().strip()) if not unicodedata.combining(c))
    h = 2166136261
    for b in n.encode('utf-8'):
        h = ((h ^ b) * 16777619) & 0xFFFFFFFF
    return h


def k_tournoi(t):
    t = t.lower()
    if t == 'fifa world cup':
        return 60
    if t in ('uefa euro', 'copa américa', 'african cup of nations', 'afc asian cup', 'gold cup', 'confederations cup', 'uefa nations league'):
        return 50
    if 'qualification' in t or t in ('cosafa cup',):
        return 40
    if t == 'friendly':
        return 20
    return 30


def g_ecart(n):
    n = abs(n)
    return 1 if n <= 1 else 1.5 if n == 2 else 1.75 if n == 3 else 1.75 + (n - 3) / 8


def main(src):
    src = pathlib.Path(src)
    elo = defaultdict(lambda: 1500.0)
    hist = defaultdict(lambda: Counter())
    premier = {}
    for r in csv.DictReader(open(src / 'results.csv', encoding='utf-8')):
        if r['home_score'] in ('NA', '') or r['away_score'] in ('NA', ''):
            continue
        h, a, gh, ga = r['home_team'], r['away_team'], int(r['home_score']), int(r['away_score'])
        dr = elo[h] - elo[a] + (0 if r['neutral'] == 'TRUE' else 100)
        we = 1 / (10 ** (-dr / 400) + 1)
        w = 1 if gh > ga else .5 if gh == ga else 0
        d = k_tournoi(r['tournament']) * g_ecart(gh - ga) * (w - we)
        elo[h] += d; elo[a] -= d
        for t, gf, gc in ((h, gh, ga), (a, ga, gh)):
            c = hist[t]; c['j'] += 1; c['bp'] += gf; c['bc'] += gc; c['v' if gf > gc else 'n' if gf == gc else 'd'] += 1
            premier.setdefault(t, r['date'][:4])
    buteurs = defaultdict(Counter)
    reels = set()
    noms = defaultdict(lambda: (Counter(), Counter()))
    for r in csv.DictReader(open(src / 'goalscorers.csv', encoding='utf-8')):
        if r['own_goal'] == 'TRUE' or not r['scorer'] or r['scorer'] == 'NA':
            continue
        buteurs[r['team']][r['scorer']] += 1
        reels.add(empreinte(r['scorer']))
        if r['date'][:4] >= '1985' and ' ' in r['scorer'].strip():
            mots = r['scorer'].strip().split()
            f = mots[0]
            # nom de famille : dernier mot, avec sa particule éventuelle (de, van, di, dos…)
            i = len(mots) - 1
            while i > 1 and mots[i - 1].lower() in PARTICULES:
                i -= 1
            l = ' '.join(mots[i:])
            if len(f) > 1 and not f.endswith('.') and len(l) > 1 and f != l:
                noms[r['team']][0][f] += 1; noms[r['team']][1][l] += 1
    out_elo, out_hist, out_noms = {}, {}, {}
    for nom, code in CODES.items():
        if nom not in elo:
            continue
        out_elo[code] = round(elo[nom])
        c = hist[nom]
        out_hist[code] = {'j': c['j'], 'v': c['v'], 'n': c['n'], 'd': c['d'], 'bp': c['bp'], 'bc': c['bc'], 'depuis': premier.get(nom),
                          'buteurs': buteurs[nom].most_common(5)}
        f, l = noms[nom]
        if len(f) >= 25 and len(l) >= 25:
            out_noms[code] = {'f': [x for x, _ in f.most_common(60)], 'l': [x for x, _ in l.most_common(80)]}
    js = ('// Généré par outils/donnees_internationales.py — source : martj42/international_results (CC0, domaine public).\n'
          '// Elo des sélections (méthode eloratings.net), bilans historiques, meilleurs buteurs, réservoirs de noms par pays.\n'
          f'const DO_ELO = {json.dumps(out_elo, ensure_ascii=False, separators=(",", ":"))};\n'
          f'const DO_HIST = {json.dumps(out_hist, ensure_ascii=False, separators=(",", ":"))};\n'
          f'const DO_NOMS = {json.dumps(out_noms, ensure_ascii=False, separators=(",", ":"))};\n'
          f'const DO_REELS = {json.dumps(sorted(reels), separators=(",", ":"))}; // empreintes des noms de vrais buteurs (exclus des noms générés)\n'
          f'const DO_INFO = {json.dumps({"matchs": sum(1 for _ in open(src / "results.csv", encoding="utf-8")) - 1, "source": "martj42/international_results (CC0)"})};\n')
    dest = pathlib.Path(__file__).resolve().parent.parent / 'js' / 'donnees_ouvertes.js'
    dest.write_text(js, encoding='utf-8')
    top = sorted(out_elo.items(), key=lambda x: -x[1])[:12]
    print('Elo', top)
    print(f'{len(out_elo)} sélections, {len(out_noms)} réservoirs de noms -> {dest} ({len(js) // 1024} Ko)')


if __name__ == '__main__':
    main(sys.argv[1])
