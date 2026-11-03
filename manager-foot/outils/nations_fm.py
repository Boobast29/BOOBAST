"""Génère outils/nations_fm.json : identifiant de nation de la base Football Manager -> code FIFA du jeu.

    python outils/nations_fm.py CHEMIN/FMSuperScout/app/nations.js

Source : mavarobli/FMSuperScout (MIT, vendor/fmsuperscout/LICENSE), app/nations.js (noms NL/EN/FR/DE et drapeau UE par
identifiant FM). Les noms français et anglais sont rapprochés de la table des pays déjà intégrée (js/donnees_ouvertes2.js,
datasets/country-codes + mledoze/countries) et de quelques cas particuliers du football.
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from commun import normaliser  # noqa: E402

MANUEL = {'england': 'ENG', 'angleterre': 'ENG', 'scotland': 'SCO', 'ecosse': 'SCO', 'wales': 'WAL', 'pays de galles': 'WAL',
          'northern ireland': 'NIR', 'irlande du nord': 'NIR', 'republic of ireland': 'IRL', 'irlande': 'IRL', 'kosovo': 'KVX',
          'usa': 'USA', 'etats unis': 'USA', 'korea republic': 'KOR', 'coree du sud': 'KOR', 'korea dpr': 'PRK', 'cote d ivoire': 'CIV',
          'czech republic': 'CZE', 'tchequie': 'CZE', 'republique tcheque': 'CZE', 'dr congo': 'COD', 'rd congo': 'COD', 'congo': 'CGO',
          'cape verde': 'CPV', 'cap vert': 'CPV', 'turkey': 'TUR', 'turquie': 'TUR', 'russia': 'RUS', 'iran': 'IRN', 'syria': 'SYR',
          'bosnia and herzegovina': 'BIH', 'bosnie herzegovine': 'BIH', 'north macedonia': 'MKD', 'macedoine du nord': 'MKD',
          'faroe islands': 'FRO', 'iles feroe': 'FRO', 'curacao': 'CUW', 'chinese taipei': 'TPE', 'hong kong': 'HKG', 'netherlands': 'NED',
          'pays bas': 'NED', 'germany': 'GER', 'allemagne': 'GER', 'switzerland': 'SUI', 'suisse': 'SUI', 'croatia': 'CRO', 'croatie': 'CRO',
          'ivory coast': 'CIV', 'central african rep': 'CTA', 'mauritius': 'MRI', 'hong kong china pr': 'HKG', 'macao china pr': 'MAC',
          'myanmar': 'MYA', 'uae': 'UAE', 'st kitts and nevis': 'SKN', 'st vincent': 'VIN', 'suriname': 'SUR', 'tahiti': 'TAH'}


def main(src):
    racine = pathlib.Path(__file__).resolve().parent.parent
    s = (racine / 'js/donnees_ouvertes2.js').read_text(encoding='utf-8')
    i = s.index('const DO2_PAYS = ') + len('const DO2_PAYS = ')
    pays, _ = json.JSONDecoder().raw_decode(s[i:])
    par_nom = {}
    for fifa, v in pays.items():
        par_nom.setdefault(normaliser(v['nom']), fifa)
    par_nom.update({normaliser(k): v for k, v in MANUEL.items()})
    out, manque = {}, []
    for m in re.finditer(r"^\s*(\d+):\s*\[(.*)\],?\s*$", pathlib.Path(src).read_text(encoding='utf-8'), re.M):
        noms = re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))
        if len(noms) < 3:
            continue
        nl, en, fr = noms[0], noms[1], noms[2]
        code = par_nom.get(normaliser(fr)) or par_nom.get(normaliser(en))
        if code:
            out[m.group(1)] = code
        else:
            manque.append(f'{m.group(1)} {en}')
    dest = pathlib.Path(__file__).resolve().parent / 'nations_fm.json'
    dest.write_text(json.dumps({'_source': 'mavarobli/FMSuperScout app/nations.js (MIT) ; identifiant FM -> code FIFA', **out}, ensure_ascii=False, indent=0), encoding='utf-8')
    print(len(out), 'nations reliées ;', len(manque), 'sans correspondance :', ', '.join(manque[:30]))


if __name__ == '__main__':
    main(sys.argv[1])
