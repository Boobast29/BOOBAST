"""Génère js/donnees_ouvertes2.js à partir de dépôts de données ouverts (faits dérivés uniquement).

    python outils/donnees_ouvertes2.py DOSSIER_EXT

DOSSIER_EXT contient les clones de :
- datasets/country-codes (ODC-PDDL)          : codes FIFA -> ISO 3166 alpha-2, noms français
- mledoze/countries (ODbL, countries.json)    : région / sous-région, nom français courant
- openfootball/worldcup.json (CC0)            : vainqueurs de la Coupe du monde
- openfootball/euro.json (CC0)                : vainqueurs de l'Euro
- openfootball/champions-league (CC0)         : vainqueurs de la Ligue des champions
- SkillCorner/opendata (MIT, agrégats physiques A-League 2024/25) : distance par minute selon le poste
"""
import csv
import json
import pathlib
import re
import sys
from collections import defaultdict

REGIONS_FR = {'Europe': 'Europe', 'Africa': 'Afrique', 'Americas': 'Amériques', 'Asia': 'Asie', 'Oceania': 'Océanie', 'Antarctic': 'Antarctique'}
# FIFA du jeu absents ou différents dans la table (nations britanniques, Kosovo…)
MANUEL = {'ENG': ('gb-eng', 'Angleterre'), 'SCO': ('gb-sct', 'Écosse'), 'WAL': ('gb-wls', 'Pays de Galles'), 'NIR': ('gb-nir', 'Irlande du Nord'),
          'KVX': ('xk', 'Kosovo'), 'IRE': ('ie', 'Irlande'), 'IRL': ('ie', 'Irlande')}


def gagnant(t1, t2, sc):
    if isinstance(sc, list):  # anciennes éditions : score final seul
        sc = {'ft': sc}
    for k in ('p', 'et', 'ft'):
        s = sc.get(k)
        if s and s[0] != s[1]:
            return t1 if s[0] > s[1] else t2
    return None


def main(ext):
    ext = pathlib.Path(ext)
    pays = {}
    mled = {c['cca2'].lower(): c for c in json.load(open(ext / 'countries_s/countries.json', encoding='utf-8'))}
    for r in csv.DictReader(open(ext / 'country-codes/data/country-codes.csv', encoding='utf-8')):
        fifa, iso2 = (r.get('FIFA') or '').strip(), (r.get('ISO3166-1-Alpha-2') or '').strip().lower()
        if not fifa or not iso2:
            continue
        m = mled.get(iso2, {})
        nom = (m.get('translations', {}).get('fra', {}) or {}).get('common') or r.get('UNTERM French Short') or fifa
        for f in fifa.split(','):
            pays[f.strip()] = {'iso2': iso2, 'nom': nom.strip(), 'region': REGIONS_FR.get(m.get('region'), m.get('region') or ''), 'sous': m.get('subregion') or ''}
    for f, (iso, nom) in MANUEL.items():
        pays[f] = {**pays.get(f, {}), 'iso2': iso, 'nom': nom, 'region': 'Europe', 'sous': pays.get(f, {}).get('sous', 'Northern Europe')}
    # palmarès
    cdm = {}
    for d in sorted((ext / 'worldcup.json').iterdir()):
        f = d / 'worldcup.json'
        if not d.name.isdigit() or not f.is_file():
            continue
        fin = [m for m in json.load(open(f, encoding='utf-8')).get('matches', []) if m.get('round') == 'Final']
        if fin:
            w = gagnant(fin[-1]['team1'], fin[-1]['team2'], fin[-1].get('score', {}))
            if w:
                cdm[d.name] = w
    euro = {}
    for d in sorted((ext / 'euro.json').iterdir()):
        f = d / 'euro.json'
        if f.is_file():
            fin = [m for m in json.load(open(f, encoding='utf-8')).get('matches', []) if m.get('round') == 'Final']
            if fin and fin[-1].get('score'):
                w = gagnant(fin[-1]['team1'], fin[-1]['team2'], fin[-1]['score'])
                if w:
                    euro[d.name] = w
    ldc = {}
    for d in sorted((ext / 'champions-league').iterdir()):
        f = d / 'cl.txt'
        if not f.is_file():
            continue
        lignes = f.read_text(encoding='utf-8').splitlines()
        idx = [k for k, l in enumerate(lignes) if re.match(r'^▪ (Finals, )?Final\s*$', l.strip())]
        if not idx:
            continue
        for ligne in lignes[idx[-1] + 1:idx[-1] + 6]:
            m = re.search(r'\d\d:\d\d\s+(.+?)\s+\(\w+\)\s+v\s+(.+?)\s+\(\w+\)\s+(\d+)-(\d+)(.*)', ligne)
            if m:
                a, b, x, y, reste = m.group(1).strip(), m.group(2).strip(), int(m.group(3)), int(m.group(4)), m.group(5)
                p = re.search(r'(\d+)-(\d+)\s*pen', reste)
                if p:
                    x, y = int(p.group(1)), int(p.group(2))
                ldc[d.name] = a if x > y else b if y > x else None
                break
    # physique (SkillCorner)
    phys = defaultdict(list)
    f = ext / 'opendata_s/data/aggregates/aus1league_physicalaggregates_20242025.csv'
    for r in csv.DictReader(open(f, encoding='utf-8')):
        try:
            if float(r['minutes_full_all']) >= 60:
                phys[r['position_group']].append((float(r['total_metersperminute_full_all']), float(r['sprint_count_full_all']), float(r['hi_distance_full_all'])))
        except (KeyError, ValueError):
            continue
    physique = {k: {'mpm': round(sum(x[0] for x in v) / len(v), 1), 'sprints': round(sum(x[1] for x in v) / len(v), 1), 'hi': round(sum(x[2] for x in v) / len(v)), 'n': len(v)} for k, v in phys.items()}
    js = ('// Généré par outils/donnees_ouvertes2.py — faits dérivés de données ouvertes :\n'
          '// datasets/country-codes (ODC-PDDL), mledoze/countries (ODbL), openfootball worldcup.json / euro.json / champions-league (CC0),\n'
          '// SkillCorner/opendata (MIT, agrégats physiques A-League 2024/25).\n'
          f'const DO2_PAYS = {json.dumps(pays, ensure_ascii=False, separators=(",", ":"))};\n'
          f'const DO2_CDM = {json.dumps(cdm, ensure_ascii=False)};\n'
          f'const DO2_EURO = {json.dumps(euro, ensure_ascii=False)};\n'
          f'const DO2_LDC = {json.dumps(ldc, ensure_ascii=False)};\n'
          f'const DO2_PHYSIQUE = {json.dumps(physique, ensure_ascii=False)};\n')
    dest = pathlib.Path(__file__).resolve().parent.parent / 'js' / 'donnees_ouvertes2.js'
    dest.write_text(js, encoding='utf-8')
    print(f'{len(pays)} pays, {len(cdm)} Coupes du monde, {len(euro)} Euros, {len(ldc)} finales de LdC, physique {list(physique)} -> {len(js) // 1024} Ko')
    print('CDM', list(cdm.items())[-4:], 'EURO', euro, 'LDC', list(ldc.items())[-4:])


if __name__ == '__main__':
    main(sys.argv[1])
