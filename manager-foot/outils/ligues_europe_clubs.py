"""Génère js/ligues_europe_clubs.js : clubs réels des premières divisions européennes (dernière saison connue).

    python outils/ligues_europe_clubs.py CHEMIN/football.json CHEMIN/europe

Sources : openfootball/football.json et openfootball/europe (CC0). Pour chaque pays : nom du championnat, saison,
liste des clubs (ordre du classement recalculé) — sert à ajouter les championnats manquants au monde étendu,
avec des effectifs générés par le jeu (les joueurs ne sont pas dans ces sources).
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from palmares_reel import PAYS as PAYS_FJ, classement  # noqa: E402
from openfootball_europe import PAYS as PAYS_EU, FICHIER, lire  # noqa: E402


def depuis_football_json(src):
    out = {}
    for d in sorted(pathlib.Path(src).iterdir(), key=lambda x: x.name):
        if not re.match(r'^\d{4}(-\d\d)?$', d.name):
            continue
        for f in d.glob('*.1.json'):
            code = PAYS_FJ.get(f.name.split('.')[0])
            if not code:
                continue
            data = json.load(open(f, encoding='utf-8'))
            rk, n, _, _ = classement(data.get('matches', []))
            if len(rk) >= 8:
                out[code] = {'nom': re.sub(r'\s*\d{4}(/\d\d)?$', '', data.get('name', '')), 'saison': d.name, 'clubs': [t for t, _ in rk], 'joues': n}
    return out


def depuis_europe(src):
    out = {}
    for d in sorted(pathlib.Path(src).iterdir()):
        code = PAYS_EU.get(d.name)
        if not code or not d.is_dir():
            continue
        for f in sorted(d.glob('*.txt'), key=lambda x: x.name):
            m = FICHIER.match(f.name)
            if not m or m.group(4) != '1':
                continue
            nom, matches = lire(f)
            rk, n, _, _ = classement(matches)
            if len(rk) >= 6:
                out[code] = {'nom': nom, 'saison': f'{m.group(1)}-{m.group(2)}' if m.group(2) else m.group(1), 'clubs': [t for t, _ in rk], 'joues': n}
    return out


def main(fj, eu):
    res = depuis_europe(eu)
    res.update(depuis_football_json(fj))  # football.json prioritaire (grands championnats)
    js = ('// Généré par outils/ligues_europe_clubs.py — clubs réels des premières divisions (openfootball, CC0).\n'
          '// pays -> { nom, saison, clubs (ordre du classement recalculé), joues }. Effectifs générés par le jeu.\n'
          f'const LIGUES_EUROPE_CLUBS = {json.dumps(res, ensure_ascii=False, separators=(",", ":"))};\n')
    (pathlib.Path(__file__).resolve().parent.parent / 'js' / 'ligues_europe_clubs.js').write_text(js, encoding='utf-8')
    for k, v in sorted(res.items()):
        print(k, v['saison'], len(v['clubs']), v['clubs'][:2])
    print(len(js) // 1024, 'Ko')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
