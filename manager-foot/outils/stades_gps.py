"""Génère js/stades_gps.js : coordonnées GPS de 136 stades (Angleterre, Écosse, France, Allemagne, Espagne),
depuis jokecamp/FootballData (MIT), fichier other/stadiums-with-GPS-coordinates.csv.

    python outils/stades_gps.py CHEMIN/stadiums-with-GPS-coordinates.csv
"""
import csv
import json
import pathlib
import sys


def main(src):
    out = {}
    for r in csv.DictReader(open(src, encoding='utf-8', errors='ignore')):
        try:
            lat, lon = round(float(r['Latitude']), 4), round(float(r['Longitude']), 4)
        except (KeyError, ValueError):
            continue
        nom = r['Team'].strip()
        out[nom] = [lat, lon, r['City'].strip(), r['Stadium'].strip()]
        alt = (r.get('FDCOUK') or '').strip()
        if alt and alt != nom:
            out.setdefault(alt, out[nom])
    js = ('// Généré par outils/stades_gps.py — jokecamp/FootballData (MIT), other/stadiums-with-GPS-coordinates.csv.\n'
          '// nom du club -> [latitude, longitude, ville, stade]\n'
          f'const STADES_GPS = {json.dumps(out, ensure_ascii=False, separators=(",", ":"))};\n')
    (pathlib.Path(__file__).resolve().parent.parent / 'js' / 'stades_gps.js').write_text(js, encoding='utf-8')
    print(len(out), 'entrées')


if __name__ == '__main__':
    main(sys.argv[1])
