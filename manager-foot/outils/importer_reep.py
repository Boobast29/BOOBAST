"""Registre reep (CC0) : relie les joueurs, entraîneurs et clubs de la base à Wikidata et à 30 sources.

    python outils/importer_reep.py                 # télécharge reep (git ou zip GitHub) dans donnees_jeu/reep
    python outils/importer_reep.py --reep DOSSIER  # utilise un dossier reep déjà présent (data/people.csv…)

Source : https://github.com/withqwerty/reep (licence CC0 1.0, domaine public).
Ce que fait l'import (rien n'est écrasé dans les fiches d'origine) :
- tables reep_personnes (entraîneurs + joueurs ayant un identifiant Transfermarkt ou EA/SoFIFA) et reep_clubs ;
- table liens : joueur/club de la base -> identifiant Wikidata (méthode et confiance notées) ;
- complète la taille des joueurs quand elle est inconnue ;
- les identifiants Wikidata servent ensuite à enrichir_wikidata.py (entraîneurs, logos, stades, photos libres).
"""
import argparse
import csv
import io
import os
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
from commun import normaliser  # noqa: E402

DEPOT = 'https://github.com/withqwerty/reep'
ZIP = 'https://codeload.github.com/withqwerty/reep/zip/refs/heads/main'

SCHEMA = """
CREATE TABLE IF NOT EXISTS reep_personnes(reep_id TEXT PRIMARY KEY, qid TEXT, type TEXT, nom TEXT, nom_norm TEXT, nom_complet TEXT,
  naissance TEXT, nat TEXT, poste TEXT, taille INTEGER, tm TEXT, tm_entraineur TEXT, sofifa TEXT, fbref TEXT);
CREATE INDEX IF NOT EXISTS rp_tm ON reep_personnes(tm);
CREATE INDEX IF NOT EXISTS rp_sofifa ON reep_personnes(sofifa);
CREATE INDEX IF NOT EXISTS rp_nom ON reep_personnes(nom_norm, naissance);
CREATE INDEX IF NOT EXISTS rp_qid ON reep_personnes(qid);
CREATE TABLE IF NOT EXISTS reep_clubs(reep_id TEXT PRIMARY KEY, qid TEXT, nom TEXT, nom_norm TEXT, pays TEXT, fondation TEXT,
  stade TEXT, tm TEXT, sofifa TEXT);
CREATE INDEX IF NOT EXISTS rc_nom ON reep_clubs(nom_norm, pays);
CREATE INDEX IF NOT EXISTS rc_tm ON reep_clubs(tm);
CREATE TABLE IF NOT EXISTS liens(type TEXT, id TEXT, qid TEXT, reep_id TEXT, methode TEXT, confiance REAL, PRIMARY KEY(type, id));
CREATE INDEX IF NOT EXISTS l_qid ON liens(qid);
"""
# pays de la base -> pays du registre
PAYS_REEP = {'England': 'United Kingdom', 'Angleterre': 'United Kingdom', 'France': 'France', 'Germany': 'Germany',
             'Allemagne': 'Germany', 'Spain': 'Spain', 'Espagne': 'Spain', 'Italy': 'Italy', 'Italie': 'Italy'}
MOTS_CLUB = {'fc', 'afc', 'cf', 'sc', 'ac', 'as', 'us', 'sv', 'vfb', 'vfl', 'tsv', 'rc', 'cd', 'ud', 'sd', 'ssc', 'acf', 'ogc',
             'estac', 'club', 'de', 'del', 'la', 'le', 'calcio', 'football', 'futbol', 'fussball', '1', 'e', 'v', 'bc', 'fk', 'sport'}


def nom_club(s):
    return ' '.join(m for m in normaliser(s).replace('-', ' ').replace('.', ' ').split() if m not in MOTS_CLUB)


def recuperer(dest):
    """Télécharge le registre (git si disponible, sinon archive zip). Renvoie le dossier data/."""
    data = dest / 'data'
    if (data / 'people.csv').is_file():
        return data
    dest.parent.mkdir(parents=True, exist_ok=True)
    if shutil.which('git'):
        print('Téléchargement de reep (git, ~170 Mo)…', flush=True)
        r = subprocess.run(['git', 'clone', '--depth', '1', DEPOT, str(dest)], capture_output=True, text=True)
        if r.returncode == 0 and (data / 'people.csv').is_file():
            return data
        print('git a échoué :', r.stderr.strip()[:300], flush=True)
    print('Téléchargement de reep (zip)…', flush=True)
    req = urllib.request.Request(ZIP, headers={'User-Agent': 'ManagerFoot/1.0 (jeu personnel)'})
    with urllib.request.urlopen(req, timeout=120) as r:
        z = zipfile.ZipFile(io.BytesIO(r.read()))
    for n in z.namelist():
        if '/data/' in n and n.endswith(('.csv', '.json')) and '/samples/' not in n:
            out = data / pathlib.Path(n).name
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(z.read(n))
    return data


def importer(con, data, verbeux=True):
    csv.field_size_limit(10 ** 8)
    con.executescript(SCHEMA)
    t0 = time.perf_counter()
    with con:
        con.execute('DELETE FROM reep_personnes'); con.execute('DELETE FROM reep_clubs')
        lot = []
        for r in csv.DictReader(open(data / 'people.csv', encoding='utf-8')):
            if r['type'] == 'player' and not (r['key_transfermarkt'] or r['key_sofifa']):
                continue
            lot.append((r['reep_id'], r['key_wikidata'] or None, r['type'], r['name'], normaliser(r['name']), r['full_name'] or None,
                        r['date_of_birth'] or None, r['nationality'] or None, r['position'] or None,
                        int(float(r['height_cm'])) if r['height_cm'] else None, r['key_transfermarkt'] or None,
                        r['key_transfermarkt_manager'] or None, r['key_sofifa'] or None, r['key_fbref'] or None))
            if len(lot) >= 20000:
                con.executemany('INSERT OR REPLACE INTO reep_personnes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', lot); lot = []
        con.executemany('INSERT OR REPLACE INTO reep_personnes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', lot)
        con.executemany('INSERT OR REPLACE INTO reep_clubs VALUES (?,?,?,?,?,?,?,?,?)',
                        [(r['reep_id'], r['key_wikidata'] or None, r['name'], nom_club(r['name']), r['country'] or None,
                          (r['founded'] or '')[:4] or None, r['stadium'] or None, r['key_transfermarkt'] or None, r['key_sofifa'] or None)
                         for r in csv.DictReader(open(data / 'teams.csv', encoding='utf-8'))])
    n_p = con.execute('SELECT COUNT(*) FROM reep_personnes').fetchone()[0]
    n_e = con.execute("SELECT COUNT(*) FROM reep_personnes WHERE type='coach'").fetchone()[0]
    n_c = con.execute('SELECT COUNT(*) FROM reep_clubs').fetchone()[0]
    if verbeux:
        print(f'Registre : {n_p:,} personnes dont {n_e:,} entraîneurs, {n_c:,} clubs ({time.perf_counter() - t0:.1f} s)'.replace(',', ' '), flush=True)
    return lier(con, verbeux)


def lier(con, verbeux=True):
    """Liens base -> Wikidata. Joueurs : identifiant EA (= SoFIFA), puis Transfermarkt, puis nom + date de naissance exacts."""
    st = {'joueurs_ea': 0, 'joueurs_tm': 0, 'joueurs_nom': 0, 'tailles': 0, 'clubs': 0, 'clubs_ambigus': 0}
    with con:
        con.execute("DELETE FROM liens WHERE methode LIKE 'reep%'")
        for meth, sql in (('reep:ea', 'SELECT j.id, p.qid, p.reep_id, p.taille, j.taille AS jt FROM joueurs j JOIN reep_personnes p ON p.sofifa = j.ea_id WHERE j.ea_id IS NOT NULL AND j.ea_id <> \'\' AND p.qid IS NOT NULL'),
                          ('reep:tm', 'SELECT j.id, p.qid, p.reep_id, p.taille, j.taille AS jt FROM joueurs j JOIN reep_personnes p ON p.tm = j.tm_id WHERE j.tm_id IS NOT NULL AND j.tm_id <> \'\' AND p.qid IS NOT NULL'),
                          ('reep:nom+naissance', 'SELECT j.id, p.qid, p.reep_id, p.taille, j.taille AS jt FROM joueurs j JOIN reep_personnes p ON p.nom_norm = j.nom_norm AND p.naissance = substr(j.naissance, 1, 10) WHERE j.naissance IS NOT NULL AND p.qid IS NOT NULL AND p.type = \'player\'')):
            vus = set()
            for r in con.execute(sql).fetchall():
                if r['id'] in vus:
                    continue  # plusieurs candidats : on garde le premier lien, la méthode suivante ne l'écrase pas
                vus.add(r['id'])
                cur = con.execute("SELECT 1 FROM liens WHERE type='joueur' AND id=?", (r['id'],)).fetchone()
                if cur:
                    continue
                con.execute('INSERT INTO liens VALUES (?,?,?,?,?,?)', ('joueur', r['id'], r['qid'], r['reep_id'], meth, 1.0 if meth != 'reep:nom+naissance' else .9))
                st['joueurs_' + {'reep:ea': 'ea', 'reep:tm': 'tm', 'reep:nom+naissance': 'nom'}[meth]] += 1
                if r['taille'] and not r['jt']:
                    con.execute('UPDATE joueurs SET taille=? WHERE id=?', (r['taille'], r['id'])); st['tailles'] += 1
        # clubs : nom normalisé (sans FC, AC, SV…) + pays ; un seul candidat, sinon on préfère celui qui a un stade
        for c in con.execute('SELECT id, nom, pays FROM clubs').fetchall():
            pays = PAYS_REEP.get(c['pays'] or '', c['pays'])
            cands = con.execute('SELECT * FROM reep_clubs WHERE nom_norm=? AND (pays=? OR pays IS NULL)', (nom_club(c['nom'] or ''), pays)).fetchall()
            if len(cands) > 1:
                cands = [x for x in cands if x['stade']] or cands
            if len(cands) == 1 and cands[0]['qid']:
                con.execute('INSERT OR REPLACE INTO liens VALUES (?,?,?,?,?,?)', ('club', c['id'], cands[0]['qid'], cands[0]['reep_id'], 'reep:nom+pays', .85))
                st['clubs'] += 1
            elif len(cands) > 1:
                st['clubs_ambigus'] += 1
    if verbeux:
        print('Liens :', st, flush=True)
    return st


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--reep', help='dossier reep (contenant data/people.csv) ; sinon téléchargement dans donnees_jeu/reep')
    a = ap.parse_args()
    data = pathlib.Path(a.reep) / 'data' if a.reep else recuperer(commun.DOSSIER_JEU_DONNEES / 'reep')
    if not (data / 'people.csv').is_file():
        data = pathlib.Path(a.reep) if a.reep else data
    con = commun.connexion()
    importer(con, data)
    print('Terminé. Étape suivante (internet) : python outils/enrichir_wikidata.py', flush=True)


if __name__ == '__main__':
    main()
