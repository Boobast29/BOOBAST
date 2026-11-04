"""Nationalités des joueurs du monde étendu FM26 (packs/monde-*.json.gz n'en contiennent pas).

    python outils/nationalites_monde.py

Appariement prudent sur ta base mondiale (joueurs notés, Football_Monde) puis sur transfermarkt-datasets (tm_joueurs) :
même nom normalisé et âge à ±1 an, correspondance unique seulement (homonymes ignorés). Écrit packs/nationalites-monde.json
{fmUid: code} que le jeu lit au chargement du monde étendu. Aucune nationalité n'est devinée : sans correspondance,
le jeu affiche « — ».
"""
import gzip
import json
import os
import pathlib
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
from commun import RACINE_JEU, normaliser  # noqa: E402
from scenario import age_au, code_nat  # noqa: E402

SORTIE = RACINE_JEU / 'packs' / 'nationalites-monde.json'


def index_source(con):
    idx = defaultdict(list)
    try:
        for r in con.execute('SELECT nom, naissance, nat FROM joueurs WHERE nat IS NOT NULL AND nom IS NOT NULL'):
            idx[normaliser(r['nom'])].append((age_au(r['naissance']), r['nat']))
    except Exception:
        pass
    try:
        for r in con.execute('SELECT nom, naissance, nat FROM tm_joueurs WHERE nat IS NOT NULL AND nom IS NOT NULL'):
            idx[normaliser(r['nom'])].append((age_au(r['naissance']), r['nat']))
    except Exception:
        pass
    return idx


def apparier(idx, joueurs):
    out = {}
    for p in joueurs:
        cands = {code_nat(nat) for age, nat in idx.get(normaliser(p.get('name') or ''), []) if age is None or p.get('age') is None or abs(age - p['age']) <= 1}
        cands.discard(None)
        if len(cands) == 1:
            out[str(p['fmUid'])] = cands.pop()
    return out


def executer(con=None, dossier=RACINE_JEU / 'packs'):
    con = con or commun.connexion()
    idx = index_source(con)
    if not idx:
        return {'joueurs': 0, 'apparies': 0, 'note': 'base mondiale et Transfermarkt absents : installe-les d\'abord (lanceur unique)'}
    total, res = 0, {}
    for f in sorted(pathlib.Path(dossier).glob('monde-*.json.gz')):
        d = json.load(gzip.open(f, 'rt', encoding='utf-8'))
        joueurs = [p for c in d.get('clubs', []) for p in c.get('players', [])]
        total += len(joueurs)
        res.update(apparier(idx, joueurs))
    pathlib.Path(dossier, 'nationalites-monde.json').write_text(json.dumps(res, separators=(',', ':')), encoding='utf-8')
    return {'joueurs': total, 'apparies': len(res)}


if __name__ == '__main__':
    print(executer())
