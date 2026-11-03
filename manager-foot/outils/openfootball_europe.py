"""Génère js/palmares_europe.js : classements réels recalculés depuis openfootball/europe (CC0, format Football.TXT).

    git clone --depth 1 https://github.com/openfootball/europe.git
    python outils/openfootball_europe.py CHEMIN/europe

Complète PALMARES_REEL (js/palmares_reel.js, football.json) : seuls les pays et les niveaux absents y sont ajoutés
(une quarantaine de championnats : Norvège, Suède, Danemark, Pologne, Suisse, Croatie, Serbie, Ukraine…).
Même format : champion, dauphin, points, buts par match, part des victoires à domicile, dernier.
"""
import json
import pathlib
import re
import sys
from collections import defaultdict

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from palmares_reel import classement  # noqa: E402

PAYS = {'albania': 'ALB', 'andorra': 'AND', 'armenia': 'ARM', 'azerbaijan': 'AZE', 'belarus': 'BLR', 'bosnia-herzegovina': 'BIH',
        'bulgaria': 'BUL', 'croatia': 'CRO', 'cyprus': 'CYP', 'czech-republic': 'CZE', 'denmark': 'DEN', 'estonia': 'EST',
        'faroe-islands': 'FRO', 'finland': 'FIN', 'france': 'FRA', 'georgia': 'GEO', 'gibraltar': 'GIB', 'greece': 'GRE',
        'hungary': 'HUN', 'iceland': 'ISL', 'ireland': 'IRL', 'kosovo': 'KVX', 'latvia': 'LVA', 'liechtenstein': 'LIE',
        'lithuania': 'LTU', 'luxembourg': 'LUX', 'malta': 'MLT', 'moldova': 'MDA', 'montenegro': 'MNE', 'netherlands': 'NED',
        'north-macedonia': 'MKD', 'northern-ireland': 'NIR', 'norway': 'NOR', 'poland': 'POL', 'portugal': 'POR', 'romania': 'ROU',
        'russia': 'RUS', 'san-marino': 'SMR', 'scotland': 'SCO', 'serbia': 'SRB', 'slovakia': 'SVK', 'slovenia': 'SVN',
        'sweden': 'SWE', 'switzerland': 'SUI', 'turkey': 'TUR', 'ukraine': 'UKR', 'wales': 'WAL'}
MATCH = re.compile(r'^\s+(?:\d{1,2}[:.]\d\d\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s|$)')
FICHIER = re.compile(r'^(\d{4})(?:-(\d\d))?_([a-z]+)(\d)\.txt$')


def lire(f):
    nom, matches = '', []
    for ligne in f.read_text(encoding='utf-8', errors='replace').splitlines():
        if ligne.startswith('= ') and not nom:
            nom = re.sub(r'\s*\d{4}(/\d\d)?\s*$', '', ligne[2:].strip())
        m = MATCH.match(ligne)
        if m and ' v ' in ligne:
            matches.append({'team1': m.group(1).strip(), 'team2': m.group(2).strip(), 'score': {'ft': [int(m.group(3)), int(m.group(4))]}})
    return nom, matches


def main(src, existant=None):
    src = pathlib.Path(src)
    deja = existant if existant is not None else {}
    out = defaultdict(lambda: defaultdict(list))
    for d in sorted(src.iterdir()):
        code = PAYS.get(d.name)
        if not code or not d.is_dir():
            continue
        for f in sorted(d.glob('*.txt')):
            m = FICHIER.match(f.name)
            if not m:
                continue
            niv = m.group(4)
            if niv in deja.get(code, {}):
                continue  # déjà couvert par football.json
            saison = f'{m.group(1)}-{m.group(2)}' if m.group(2) else m.group(1)
            nom, matches = lire(f)
            rk, n, buts, dom = classement(matches)
            if len(rk) < 4 or not n:
                continue
            k = len(rk)
            complet = n >= k * (k - 1) and all(v[1] == 2 * (k - 1) for _, v in rk)
            (c, vc), (r2, v2) = rk[0], rk[1]
            out[code][int(niv)].append({'s': saison, 'nom': nom, 'c': c, 'pc': vc[0], 'd': r2, 'pd': v2[0], 'bm': round(buts / n, 2),
                                        'dom': round(dom / n, 3), 'j': n, 'eq': k, 'fini': complet, 'der': rk[-1][0]})
    return out


def ecrire(out):
    js = ('// Généré par outils/openfootball_europe.py — classements recalculés depuis openfootball/europe (CC0).\n'
          '// Complète PALMARES_REEL (js/palmares_reel.js) pour les pays et niveaux absents de football.json ; même format.\n'
          f'const PALMARES_EUROPE = {json.dumps(out, ensure_ascii=False, separators=(",", ":"))};\n'
          "if (typeof PALMARES_REEL !== 'undefined') for (const [p, niv] of Object.entries(PALMARES_EUROPE)) { PALMARES_REEL[p] ||= {}; for (const [n, L] of Object.entries(niv)) PALMARES_REEL[p][n] ||= L; }\n")
    (pathlib.Path(__file__).resolve().parent.parent / 'js' / 'palmares_europe.js').write_text(js, encoding='utf-8')
    return len(js)


def existant_js():
    t = (pathlib.Path(__file__).resolve().parent.parent / 'js' / 'palmares_reel.js').read_text(encoding='utf-8')
    return json.loads(t[t.index('= ') + 2:t.rindex(';')])


if __name__ == '__main__':
    o = main(sys.argv[1], existant_js())
    taille = ecrire(o)
    for p, niv in sorted(o.items()):
        print(p, {k: len(v) for k, v in niv.items()}, niv[min(niv)][-1]['s'], niv[min(niv)][-1]['c'])
    print(taille // 1024, 'Ko')
