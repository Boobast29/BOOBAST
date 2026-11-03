"""Génère js/open_football.js depuis ZOXEXIVO/open-football (Apache-2.0, voir vendor/open-football/LICENSE).

    python outils/open_football.py CHEMIN/open-football

Reprend uniquement :
- les réservoirs de prénoms et de noms par pays (src/database/src/data/database.db, JSON compressé gzip) ;
- les textes français d'adaptation des recrues (src/web/assets/i18n/events/fr.json, clés adaptation_*).
Les joueurs et leurs attributs ne sont pas repris.
"""
import gzip
import json
import pathlib
import sys

ISO_FIFA_MANUEL = {'gb': 'ENG'}


def main(src):
    src = pathlib.Path(src)
    db = json.loads(gzip.open(src / 'src/database/src/data/database.db').read().decode('utf-8'))
    racine = pathlib.Path(__file__).resolve().parent.parent
    # FIFA <- ISO alpha-2 grâce à la table déjà intégrée (js/donnees_ouvertes2.js)
    s = (racine / 'js/donnees_ouvertes2.js').read_text(encoding='utf-8')
    i = s.index('const DO2_PAYS = ') + len('const DO2_PAYS = ')
    pays, _ = json.JSONDecoder().raw_decode(s[i:])
    iso_fifa = {}
    for fifa, v in pays.items():
        iso_fifa.setdefault(v['iso2'], fifa)
    iso_fifa.update(ISO_FIFA_MANUEL)
    noms = {}
    for n in db['names']:
        f = iso_fifa.get(n['country_code'])
        if f and n['first_names'] and n['last_names']:
            noms[f] = {'f': n['first_names'], 'l': n['last_names']}
    ev = json.load(open(src / 'src/web/assets/i18n/events/fr.json', encoding='utf-8'))
    adapt = {k[len('adaptation_'):]: v for k, v in ev.items() if k.startswith('adaptation_')}
    js = ('// Généré par outils/open_football.py — ZOXEXIVO/open-football (Apache-2.0, vendor/open-football/LICENSE) :\n'
          '// réservoirs de prénoms/noms par pays et textes français d\'adaptation des recrues.\n'
          f'const OF_NOMS = {json.dumps(noms, ensure_ascii=False, separators=(",", ":"))};\n'
          f'const OF_ADAPT = {json.dumps(adapt, ensure_ascii=False, indent=0)};\n')
    (racine / 'js/open_football.js').write_text(js, encoding='utf-8')
    print(len(noms), 'pays', sorted(noms), len(adapt), 'textes')


if __name__ == '__main__':
    main(sys.argv[1])
