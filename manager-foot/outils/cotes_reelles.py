"""Génère js/cotes_reelles.js : forme réelle des cotes 1N2, à partir de jokecamp/FootballData (MIT),
dossier « Football-results (22 countries) » (résultats et cotes Pinnacle 1X2 de ~86 000 matchs, betexplorer).

    python outils/cotes_reelles.py CHEMIN/all.csv

Faits dérivés seulement : pour chaque écart de probabilité d = P(domicile) − P(extérieur) (pas de 0,05),
la probabilité de nul donnée par le marché et les fréquences réellement observées (V/N/D) ; marge médiane
du bookmaker ; fréquences globales par pays.
"""
import csv
import json
import pathlib
import statistics
import sys
from collections import defaultdict

PAYS = {'england': 'ENG', 'spain': 'ESP', 'italy': 'ITA', 'germany': 'GER', 'france': 'FRA', 'netherlands': 'NED', 'portugal': 'POR',
        'belgium': 'BEL', 'turkey': 'TUR', 'scotland': 'SCO', 'greece': 'GRE', 'austria': 'AUT', 'switzerland': 'SUI', 'denmark': 'DEN',
        'sweden': 'SWE', 'norway': 'NOR', 'poland': 'POL', 'chezh': 'CZE', 'israel': 'ISR', 'iceland': 'ISL', 'finland': 'FIN', 'china': 'CHN'}


def main(src):
    bins = defaultdict(lambda: [0, 0.0, 0, 0, 0])  # n, somme P(nul) marché, V, N, D
    marges, pays = [], defaultdict(lambda: [0, 0, 0, 0])
    for r in csv.reader(open(src, encoding='utf-8', errors='ignore')):
        try:
            a, b = float(r[8]), float(r[9])
        except (ValueError, IndexError):
            continue
        res = 0 if a > b else 1 if a == b else 2
        c = pays[PAYS.get(r[1], r[1])]
        c[0] += 1
        c[1 + res] += 1
        try:
            o = [float(r[11]), float(r[12]), float(r[13])]
        except (ValueError, IndexError):
            continue
        if min(o) <= 1:
            continue
        inv = [1 / x for x in o]
        s = sum(inv)
        marges.append(s - 1)
        ph, pd, pa = (x / s for x in inv)
        k = max(-19, min(19, round((ph - pa) / .05)))
        B = bins[k]
        B[0] += 1
        B[1] += pd
        B[2 + res] += 1
    table = []
    for k in range(-19, 20):
        n, spd, v, nu, d = bins.get(k, [0, 0, 0, 0, 0])
        if n >= 40:
            table.append([round(k * .05, 2), round(spd / n, 4), round(v / n, 4), round(nu / n, 4), round(d / n, 4), n])
    freq = {p: [round(x / c[0], 3) for x in c[1:]] + [c[0]] for p, c in pays.items() if c[0] >= 500}
    js = ('// Généré par outils/cotes_reelles.py — faits dérivés de jokecamp/FootballData (MIT), « Football-results (22 countries) »\n'
          '// (résultats et cotes Pinnacle 1X2 relevées sur betexplorer). d = P(dom.) − P(ext.) ; pn = P(nul) selon le marché ;\n'
          '// v/n/dd = fréquences observées ; n = nombre de matchs. PAYS = [V, N, D, matchs].\n'
          f'const COTES_REELLES = {{ marge: {round(statistics.median(marges), 4)}, matchs: {sum(b[0] for b in bins.values())},\n'
          f'  table: {json.dumps(table)},\n'
          f'  pays: {json.dumps(freq, ensure_ascii=False)} }};\n')
    dest = pathlib.Path(__file__).resolve().parent.parent / 'js' / 'cotes_reelles.js'
    dest.write_text(js, encoding='utf-8')
    print(len(table), 'tranches', 'marge', round(statistics.median(marges), 4), freq.get('FRA'), freq.get('ENG'))
    for t in table[::4]:
        print(t)


if __name__ == '__main__':
    main(sys.argv[1])
