"""Statistiques agrégées par division depuis openfootball/football.json (CC0) et ewenme/transfers (agrégats)."""
import json, os, sys, csv, statistics as st
root, trans = sys.argv[1], sys.argv[2]
leagues = ['en.1', 'en.2', 'en.3', 'en.4', 'de.1', 'de.2', 'de.3', 'es.1', 'es.2', 'fr.1', 'fr.2', 'it.1', 'it.2']
out = {}
for lg in leagues:
    n = hg = ag = hw = dr = aw = 0; seasons = []
    for s in sorted(os.listdir(root)):
        p = os.path.join(root, s, lg + '.json')
        if not os.path.isfile(p) or not s[:4].isdigit() or int(s[:4]) < 2014: continue
        try: d = json.load(open(p, encoding='utf-8'))
        except Exception: continue
        k = 0
        for m in d.get('matches', []):
            sc = m.get('score'); ft = sc.get('ft') if isinstance(sc, dict) else sc if isinstance(sc, list) else None
            if not ft or len(ft) != 2: continue
            a, b = ft; n += 1; k += 1; hg += a; ag += b
            if a > b: hw += 1
            elif a == b: dr += 1
            else: aw += 1
        if k: seasons.append(s)
    if n: out[lg] = {'matchs': n, 'saisons': f'{seasons[0]}→{seasons[-1]}', 'butsDom': round(hg / n, 3), 'butsExt': round(ag / n, 3),
                     'v1': round(hw / n, 3), 'n': round(dr / n, 3), 'v2': round(aw / n, 3)}
fees = {}
for f in os.listdir(trans):
    if not f.endswith('.csv'): continue
    for r in csv.DictReader(open(os.path.join(trans, f), encoding='utf-8')):
        try: y = int(r['year']); fee = float(r['fee_cleaned']); age = int(r['age'])
        except Exception: continue
        if y < 2015 or r['transfer_movement'] != 'in' or fee <= 0: continue
        pos = r['position'].lower()
        g = 'GB' if 'goal' in pos else 'DEF' if 'back' in pos or 'defen' in pos else 'MIL' if 'midfield' in pos else 'ATT'
        ab = '17-20' if age <= 20 else '21-23' if age <= 23 else '24-27' if age <= 27 else '28-30' if age <= 30 else '31+'
        fees.setdefault((r['league_name'], ab, g), []).append(fee)
agg = {}
for (lg, ab, g), v in fees.items():
    if len(v) < 8: continue
    agg.setdefault(lg, {}).setdefault(ab, {})[g] = {'n': len(v), 'med': round(st.median(v), 2), 'p90': round(sorted(v)[int(len(v) * .9)], 2)}
print(json.dumps({'divisions': out, 'indemnites_Meur': agg}, ensure_ascii=False, indent=1))
