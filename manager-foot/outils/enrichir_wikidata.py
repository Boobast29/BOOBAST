"""Enrichissement depuis Wikidata (à lancer avec internet, après importer_reep.py).

    python outils/enrichir_wikidata.py                   # clubs des 5 pays du jeu : entraîneurs, logos, stades, photos
    python outils/enrichir_wikidata.py --pays France     # un seul pays
    python outils/enrichir_wikidata.py --sans-effectifs  # ne pas chercher les effectifs des divisions sans joueurs notés
    python outils/enrichir_wikidata.py --sans-photos

Données Wikidata : domaine public (CC0). Photos et logos : fichiers de Wikimedia Commons, téléchargés à la demande par
le jeu (cache local), chacun sous sa propre licence (souvent CC BY-SA : auteur et licence visibles sur la page Commons).
Les logos protégés absents de Commons ne sont pas récupérés : le jeu garde alors le logo du pack ou un blason générique.

Requêtes groupées (40 clubs, 150 joueurs), pause entre requêtes, identification du programme (règles d'usage Wikidata).
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402

SPARQL = 'https://query.wikidata.org/sparql'
UA = 'ManagerFoot/1.0 (jeu de gestion personnel ; https://github.com/withqwerty/reep pour les identifiants)'
PAUSE = 1.5
SCHEMA = """
CREATE TABLE IF NOT EXISTS wd_clubs(qid TEXT PRIMARY KEY, logo TEXT, stade TEXT, capacite INTEGER, couleurs TEXT, fondation TEXT, maj TEXT);
CREATE TABLE IF NOT EXISTS wd_entraineurs(club_qid TEXT PRIMARY KEY, qid TEXT, nom TEXT, naissance TEXT, nat TEXT, image TEXT, debut TEXT, maj TEXT);
CREATE TABLE IF NOT EXISTS wd_images(qid TEXT PRIMARY KEY, image TEXT, maj TEXT);
CREATE TABLE IF NOT EXISTS wd_effectifs(club_qid TEXT, qid TEXT, nom TEXT, naissance TEXT, nat TEXT, poste TEXT, image TEXT, debut TEXT, maj TEXT,
  PRIMARY KEY(club_qid, qid));
"""
# poste Wikidata (P413, libellé français ou anglais) -> poste du jeu
MOTS_POSTES = [(('gardien', 'goalkeeper'), 'GB'), (('arrière gauche', 'left-back', 'left back'), 'DG'), (('arrière droit', 'right-back', 'right back'), 'DD'),
               (('milieu défensif', 'defensive midfielder'), 'MDC'), (('milieu offensif', 'attacking midfielder'), 'MOC'),
               (('ailier gauche', 'left winger'), 'AG'), (('ailier droit', 'right winger'), 'AD'), (('ailier', 'winger'), 'AG'),
               (('défenseur', 'defender', 'arrière', 'back'), 'DC'), (('milieu', 'midfielder'), 'MC'),
               (('attaquant', 'avant-centre', 'forward', 'striker'), 'BU')]


def poste_wd(libelle):
    l = (libelle or '').lower()
    for mots, p in MOTS_POSTES:
        if any(m in l for m in mots):
            return p
    return None


def commons_url(v, largeur=300):
    """Valeur Wikidata d'une image (URL Special:FilePath) -> vignette PNG/JPEG de largeur fixe (SVG converti par Commons)."""
    if not v:
        return None
    nom = v.rsplit('/', 1)[-1]
    return f'https://commons.wikimedia.org/wiki/Special:FilePath/{nom}?width={largeur}'


def requete(q, transport=None):
    if transport:  # tests : réponses enregistrées
        return transport(q)
    url = SPARQL + '?' + urllib.parse.urlencode({'query': q, 'format': 'json'})
    for essai in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:  # 429 / 503 : on ralentit
            print(f'  requête refusée ({e}), nouvel essai…', flush=True)
            time.sleep(5 * (essai + 1))
    return {'results': {'bindings': []}}


def val(b, k):
    x = b.get(k)
    return x['value'] if x else None


def qid_de(uri):
    return uri.rsplit('/', 1)[-1] if uri else None


def requete_clubs(qids):
    v = ' '.join('wd:' + q for q in qids)
    return f"""SELECT ?club ?coach ?coachLabel ?debut ?dob ?natLabel ?cimg ?logo ?stadeLabel ?cap ?colLabel ?fond WHERE {{
  VALUES ?club {{ {v} }}
  OPTIONAL {{ ?club p:P286 ?st . ?st ps:P286 ?coach . FILTER NOT EXISTS {{ ?st pq:P582 ?fin }}
             OPTIONAL {{ ?st pq:P580 ?debut }} OPTIONAL {{ ?coach wdt:P569 ?dob }} OPTIONAL {{ ?coach wdt:P27 ?nat }} OPTIONAL {{ ?coach wdt:P18 ?cimg }} }}
  OPTIONAL {{ ?club wdt:P154 ?logo }}
  OPTIONAL {{ ?club wdt:P115 ?stade . OPTIONAL {{ ?stade wdt:P1083 ?cap }} }}
  OPTIONAL {{ ?club wdt:P6364 ?col }}
  OPTIONAL {{ ?club wdt:P571 ?fond }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,fr". }}
}}"""


def requete_images(qids):
    return f"SELECT ?p ?img WHERE {{ VALUES ?p {{ {' '.join('wd:' + q for q in qids)} }} ?p wdt:P18 ?img }}"


def requete_effectif(club):
    return f"""SELECT ?p ?pLabel ?dob ?natLabel ?posLabel ?img ?debut WHERE {{
  ?p p:P54 ?st . ?st ps:P54 wd:{club} . FILTER NOT EXISTS {{ ?st pq:P582 ?fin }}
  OPTIONAL {{ ?st pq:P580 ?debut }}
  ?p wdt:P106 wd:Q937857 . ?p wdt:P569 ?dob . FILTER(YEAR(?dob) >= 1984)
  OPTIONAL {{ ?p wdt:P413 ?pos }} OPTIONAL {{ ?p wdt:P27 ?nat }} OPTIONAL {{ ?p wdt:P18 ?img }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,fr". }}
}} LIMIT 80"""


def maintenant():
    return time.strftime('%Y-%m-%d')


def clubs(con, qids, transport=None):
    n_e = n_l = n_s = 0
    for i in range(0, len(qids), 40):
        lot = qids[i:i + 40]
        rep = requete(requete_clubs(lot), transport)
        par = {}
        for b in rep['results']['bindings']:
            par.setdefault(qid_de(val(b, 'club')), []).append(b)
        with con:
            for q, bs in par.items():
                b0 = bs[0]
                cap = max((int(float(val(b, 'cap'))) for b in bs if val(b, 'cap')), default=None)
                cols = sorted({val(b, 'colLabel') for b in bs if val(b, 'colLabel')})
                logo = next((val(b, 'logo') for b in bs if val(b, 'logo')), None)
                con.execute('INSERT OR REPLACE INTO wd_clubs VALUES (?,?,?,?,?,?,?)',
                            (q, commons_url(logo, 200), val(b0, 'stadeLabel'), cap, ', '.join(cols) or None, (val(b0, 'fond') or '')[:4] or None, maintenant()))
                n_l += bool(logo); n_s += bool(val(b0, 'stadeLabel'))
                coachs = [b for b in bs if val(b, 'coach')]
                if coachs:  # plusieurs entraîneurs « en cours » : le plus récent
                    c = max(coachs, key=lambda b: val(b, 'debut') or '')
                    con.execute('INSERT OR REPLACE INTO wd_entraineurs VALUES (?,?,?,?,?,?,?,?)',
                                (q, qid_de(val(c, 'coach')), val(c, 'coachLabel'), (val(c, 'dob') or '')[:10] or None, val(c, 'natLabel'),
                                 commons_url(val(c, 'cimg')), (val(c, 'debut') or '')[:10] or None, maintenant()))
                    n_e += 1
        print(f'  clubs {min(i + 40, len(qids))}/{len(qids)}', flush=True)
        if not transport:
            time.sleep(PAUSE)
    return {'entraineurs': n_e, 'logos': n_l, 'stades': n_s}


def photos(con, transport=None):
    qids = [r[0] for r in con.execute("""SELECT l.qid FROM liens l JOIN joueurs j ON j.id = l.id
        WHERE l.type='joueur' AND (j.photo_url IS NULL OR j.photo_url='') AND (j.photo_local IS NULL OR j.photo_local='')
        AND l.qid NOT IN (SELECT qid FROM wd_images)""")]
    n = 0
    for i in range(0, len(qids), 150):
        rep = requete(requete_images(qids[i:i + 150]), transport)
        with con:
            for b in rep['results']['bindings']:
                con.execute('INSERT OR REPLACE INTO wd_images VALUES (?,?,?)', (qid_de(val(b, 'p')), commons_url(val(b, 'img')), maintenant())); n += 1
            # joueurs sans photo : URL Commons, téléchargée à la demande par le gestionnaire d'images (cache, signature vérifiée)
            con.execute("""UPDATE joueurs SET photo_url = (SELECT w.image FROM liens l JOIN wd_images w ON w.qid = l.qid WHERE l.type='joueur' AND l.id = joueurs.id),
                photo_origine = 'Wikimedia Commons (voir licence du fichier)'
                WHERE (photo_url IS NULL OR photo_url='') AND (photo_local IS NULL OR photo_local='')
                AND id IN (SELECT l.id FROM liens l JOIN wd_images w ON w.qid = l.qid WHERE l.type='joueur')""")
        if i // 150 % 10 == 0:
            print(f'  photos {min(i + 150, len(qids))}/{len(qids)}', flush=True)
        if not transport:
            time.sleep(PAUSE)
    return {'photos': n}


def effectifs(con, clubs_qid, transport=None):
    n = 0
    for k, q in enumerate(clubs_qid):
        rep = requete(requete_effectif(q), transport)
        with con:
            con.execute('DELETE FROM wd_effectifs WHERE club_qid=?', (q,))
            vus = set()
            for b in rep['results']['bindings']:
                p = qid_de(val(b, 'p'))
                if p in vus:
                    continue
                vus.add(p)
                con.execute('INSERT OR REPLACE INTO wd_effectifs VALUES (?,?,?,?,?,?,?,?,?)',
                            (q, p, val(b, 'pLabel'), (val(b, 'dob') or '')[:10], val(b, 'natLabel'), poste_wd(val(b, 'posLabel')),
                             commons_url(val(b, 'img')), (val(b, 'debut') or '')[:10] or None, maintenant()))
                n += 1
        if k % 10 == 9:
            print(f'  effectifs {k + 1}/{len(clubs_qid)}', flush=True)
        if not transport:
            time.sleep(PAUSE)
    return {'joueurs_effectifs': n}


def executer(con, pays=None, avec_photos=True, avec_effectifs=True, transport=None):
    con.executescript(SCHEMA)
    filtre = 'AND i.pays=?' if pays else ''
    rows = con.execute(f"""SELECT DISTINCT l.qid, i.club_id,
        (SELECT COUNT(*) FROM joueurs j WHERE j.club_id = i.club_id AND j.qualite='rated_snapshot') AS notes
        FROM inscriptions i JOIN liens l ON l.type='club' AND l.id = i.club_id WHERE l.qid IS NOT NULL {filtre}""",
                       (pays,) if pays else ()).fetchall()
    qids = sorted({r['qid'] for r in rows})
    print(f'{len(qids)} clubs liés à Wikidata', flush=True)
    st = clubs(con, qids, transport)
    if avec_photos:
        st.update(photos(con, transport))
    if avec_effectifs:
        maigres = sorted({r['qid'] for r in rows if r['notes'] < 18})
        print(f'{len(maigres)} clubs avec moins de 18 joueurs notés : effectifs actuels Wikidata', flush=True)
        st.update(effectifs(con, maigres, transport))
    print('Wikidata :', st, flush=True)
    return st


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pays')
    ap.add_argument('--sans-photos', action='store_true')
    ap.add_argument('--sans-effectifs', action='store_true')
    a = ap.parse_args()
    executer(commun.connexion(), a.pays, not a.sans_photos, not a.sans_effectifs)


if __name__ == '__main__':
    main()
