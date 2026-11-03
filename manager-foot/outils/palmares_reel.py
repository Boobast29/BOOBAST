"""Génère js/palmares_reel.js : classements finaux réels recalculés depuis openfootball/football.json (CC0).

    python outils/palmares_reel.py CHEMIN/football.json

Pour chaque championnat et chaque saison : champion, dauphin, points, buts par match, part des victoires
à domicile. Le classement est recalculé (3 points la victoire, puis différence et buts marqués) : il ignore
les pénalités de points et les départages particuliers. Une saison incomplète est marquée « en cours ».
"""
import json
import pathlib
import re
import sys
from collections import defaultdict

PAYS = {'fr': 'FRA', 'en': 'ENG', 'de': 'GER', 'es': 'ESP', 'it': 'ITA', 'nl': 'NED', 'pt': 'POR', 'be': 'BEL', 'sco': 'SCO', 'tr': 'TUR', 'at': 'AUT', 'gr': 'GRE'}


def classement(matches):
    T = defaultdict(lambda: [0, 0, 0, 0, 0])  # pts, j, bp, bc, v
    n = buts = dom = 0
    for m in matches:
        sc = m.get('score')
        ft = sc if isinstance(sc, list) else (sc or {}).get('ft')  # anciens fichiers : score = [x, y] ou score1/score2
        if not ft and m.get('score1') is not None:
            ft = [m['score1'], m['score2']]
        if not ft or len(ft) != 2 or None in ft:
            continue
        a, b = m['team1'], m['team2']
        x, y = ft
        n += 1
        buts += x + y
        dom += x > y
        for t, f, c in ((a, x, y), (b, y, x)):
            T[t][1] += 1
            T[t][2] += f
            T[t][3] += c
            if f > c:
                T[t][0] += 3
                T[t][4] += 1
            elif f == c:
                T[t][0] += 1
    rk = sorted(T.items(), key=lambda kv: (-kv[1][0], -(kv[1][2] - kv[1][3]), -kv[1][2]))
    return rk, n, buts, dom


def main(src):
    src = pathlib.Path(src)
    out = defaultdict(lambda: defaultdict(list))
    for d in sorted(src.iterdir()):
        if not re.match(r'^\d{4}(-\d\d)?$', d.name):
            continue
        for f in sorted(d.glob('*.json')):
            m = re.match(r'^([a-z]+)\.(\d)\.json$', f.name)
            if not m or m.group(1) not in PAYS:
                continue
            data = json.load(open(f, encoding='utf-8'))
            rk, n, buts, dom = classement(data.get('matches', []))
            if len(rk) < 4 or not n:
                continue
            k = len(rk)
            complet = n >= k * (k - 1) and all(v[1] == 2 * (k - 1) for _, v in rk)
            (c, vc), (r2, v2) = rk[0], rk[1]
            out[PAYS[m.group(1)]][int(m.group(2))].append({
                's': d.name, 'nom': re.sub(r'\s*\d{4}(/\d\d)?$', '', data.get('name', '')), 'c': c, 'pc': vc[0], 'd': r2, 'pd': v2[0],
                'bm': round(buts / n, 2), 'dom': round(dom / n, 3), 'j': n, 'eq': k, 'fini': complet, 'der': rk[-1][0]})
    js = ('// Généré par outils/palmares_reel.py — classements recalculés depuis openfootball/football.json (CC0).\n'
          '// pays -> niveau -> saisons : c/pc champion et points, d/pd dauphin, bm buts par match, dom part des victoires à domicile,\n'
          '// j matchs joués, eq équipes, fini saison complète, der dernier.\n'
          f'const PALMARES_REEL = {json.dumps(out, ensure_ascii=False, separators=(",", ":"))};\n')
    (pathlib.Path(__file__).resolve().parent.parent / 'js' / 'palmares_reel.js').write_text(js, encoding='utf-8')
    for p, niv in out.items():
        print(p, {k: len(v) for k, v in niv.items()}, niv[1][-2]['s'] if len(niv[1]) > 1 else '', niv[1][-2]['c'] if len(niv[1]) > 1 else '')
    print(len(js) // 1024, 'Ko')


if __name__ == '__main__':
    main(sys.argv[1])
