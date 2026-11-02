"""Serveur local du jeu : http://127.0.0.1:8765

    python outils/serveur.py [--port 8765] [--hors-ligne]

Sert l'interface (manager-foot/), l'API de la base mondiale (recherche, fiches, compétitions,
scénarios) et les images (pack, cache, téléchargement à la demande). Écoute uniquement en local.
Le jeu reste utilisable sans ce serveur en ouvrant index.html (mode fictif seulement).
"""
import argparse
import datetime
import json
import mimetypes
import os
import sys
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import BASE, RACINE_JEU, connexion, lire_config, normaliser, trouver_football_monde, unpack  # noqa: E402
import images  # noqa: E402
import scenario  # noqa: E402

LOCAL = threading.local()
FM = None
RES = None
STATIQUES_INTERDITS = ('donnees_jeu', 'outils', '.git')


def db():
    if not hasattr(LOCAL, 'con'):
        LOCAL.con = connexion(lecture_seule=False)
    return LOCAL.con


def age_bornes(age_min, age_max, ref):
    """Bornes de date de naissance pour un âge calculé à la date de partie."""
    r = datetime.date.fromisoformat(ref)
    out = []
    if age_min is not None:
        out.append(('naissance <= ?', r.replace(year=r.year - age_min).isoformat()))
    if age_max is not None:
        out.append(('naissance > ?', r.replace(year=r.year - age_max - 1).isoformat()))
    return out


def recherche(p):
    q = normaliser(p.get('q', ''))
    taille = max(1, min(50, int(p.get('taille', 25))))
    page = max(0, int(p.get('page', 0)))
    where, args = [], []
    if q:
        toks = [t for t in q.split() if t][:6]
        where.append('j.rowid IN (SELECT rowid FROM joueurs_fts WHERE joueurs_fts MATCH ?)')
        args.append(' AND '.join(f'"{t}"*' for t in toks))
    for champ, col in [('qualite', 'j.qualite'), ('poste', 'j.poste'), ('club', 'j.club_id')]:
        if p.get(champ):
            where.append(f'{col} = ?')
            args.append(p[champ])
    if p.get('nat'):
        where.append('j.nat LIKE ?')
        args.append(f'%{p["nat"]}%')
    if p.get('notes') == '1':
        where.append('j.niveau99 IS NOT NULL')
    if p.get('pot_connu') == '1':
        where.append('j.pot99 IS NOT NULL')
    if p.get('photo') == '1':
        where.append('(j.photo_local IS NOT NULL)')
    if p.get('riche') == '1':
        where.append('j.profil_riche = 1')
    if p.get('niveau_min'):
        where.append('j.niveau99 >= ?')
        args.append(int(p['niveau_min']))
    amin = int(p['age_min']) if p.get('age_min') else None
    amax = int(p['age_max']) if p.get('age_max') else None
    for cond, v in age_bornes(amin, amax, p.get('date_ref', '2026-07-01')):
        where.append('j.' + cond)
        args.append(v)
    w = ('WHERE ' + ' AND '.join(where)) if where else ''
    t0 = time.perf_counter()
    tri = 'j.niveau99 IS NULL, j.niveau99 DESC, j.nom' if p.get('tri') != 'nom' else 'j.nom_norm'
    rows = db().execute(f'''SELECT j.id, j.nom, j.naissance, j.nat, j.poste, j.poste_brut, j.club_id, c.nom AS club, j.qualite,
        j.niveau99, j.pot99, (j.photo_local IS NOT NULL OR j.photo_url IS NOT NULL) AS a_photo, j.profil_riche,
        (SELECT groupe FROM doublons_possibles d WHERE d.id = j.id) AS doublon
        FROM joueurs j LEFT JOIN clubs c ON c.id = j.club_id {w} ORDER BY {tri} LIMIT ? OFFSET ?''',
                        args + [taille + 1, page * taille]).fetchall()
    total = db().execute(f'SELECT count(*) FROM (SELECT 1 FROM joueurs j {w} LIMIT 10001)', args).fetchone()[0]
    ms = (time.perf_counter() - t0) * 1000
    return {'resultats': [dict(r) for r in rows[:taille]], 'page': page, 'taille': taille, 'suite': len(rows) > taille,
            'total': total, 'total_plafonne': total > 10000, 'ms': round(ms, 1)}


def fiche_joueur(pid):
    con = db()
    r = con.execute('SELECT * FROM joueurs WHERE id=?', (pid,)).fetchone()
    if not r:
        return None
    out = {k: r[k] for k in r.keys()}
    fr = con.execute('SELECT fiche FROM fiches WHERE id=?', (pid,)).fetchone()
    out['source'] = unpack(fr['fiche']) if fr else {}
    p = con.execute('SELECT fiche FROM profils WHERE id=?', (pid,)).fetchone()
    out['profil_v10'] = unpack(p['fiche']) if p else None
    c = con.execute('SELECT id, nom, pays, statut_identite FROM clubs WHERE id=?', (r['club_id'],)).fetchone() if r['club_id'] else None
    out['club'] = dict(c) if c else None
    if c:
        out['inscriptions'] = [dict(x) for x in con.execute('SELECT i.competition_id, k.nom, k.niveau, k.groupe FROM inscriptions i JOIN competitions k ON k.id=i.competition_id WHERE i.club_id=?', (c['id'],))]
    j = con.execute('SELECT fiche FROM jeunes WHERE id=?', (pid,)).fetchone()
    out['jeune_v9'] = json.loads(j['fiche']) if j else None
    out['libre'] = [dict(categorie=x['categorie'], fiche=json.loads(x['fiche'])) for x in con.execute('SELECT categorie, fiche FROM libres WHERE joueur_id=?', (pid,))]
    out['conflits'] = [json.loads(x['fiche']) for x in con.execute('SELECT fiche FROM conflits WHERE fiche LIKE ?', (f'%"{pid}"%',))]
    out['doublons_possibles'] = [dict(x) for x in con.execute('''SELECT j.id, j.nom, j.qualite, j.club_id FROM doublons_possibles d JOIN joueurs j ON j.id=d.id
        WHERE d.groupe=(SELECT groupe FROM doublons_possibles WHERE id=?) AND d.id<>?''', (pid, pid))]
    out['historiques_dispo'] = {x['tab']: x['n'] for x in con.execute('SELECT tab, count(*) n FROM historiques WHERE joueur_id=? GROUP BY tab', (pid,))}
    out['quarantaine_transferts'] = con.execute('SELECT count(*) FROM transferts_quarantaine WHERE joueur_id=?', (pid,)).fetchone()[0]
    return out


def historique(pid):
    con = db()
    out = {}
    for x in con.execute('SELECT tab, fiche FROM historiques WHERE joueur_id=?', (pid,)):
        recs = unpack(x['fiche']).get('records', [])
        out.setdefault(x['tab'], []).extend(recs)
    ann = out.get('annees_civiles')
    if ann:
        noms = {}
        for rec in ann:
            for tab, k in (('equipes', 'source_team_id'), ('competitions', 'source_league_id')):
                key = (tab, str(rec.get(k)))
                if key not in noms:
                    row = con.execute('SELECT fiche FROM ref_hf WHERE tab=? AND id=?', key).fetchone()
                    noms[key] = json.loads(row['fiche']).get('name') if row else None
                rec[tab[:-1] + '_nom'] = noms[key]
    for k in ('performances', 'annees_civiles', 'absences', 'transferts', 'valeurs'):
        if k in out:
            cle = {'performances': 'season_name', 'annees_civiles': 'calendar_year', 'absences': 'from_date',
                   'transferts': 'transfer_date', 'valeurs': 'date_unix'}[k]
            out[k].sort(key=lambda r: str(r.get(cle) or ''), reverse=True)
    out['avertissements'] = [
        'Saisons Transfermarkt (par saison/compétition) et années civiles API-Football ne sont jamais additionnées.',
        'Une cellule vide reste inconnue. Les totaux affichés ne sont pas des totaux de carrière exhaustifs.',
        'Valeurs de marché : estimations du fournisseur, jusqu’en septembre 2025.',
        'Absences historiques datées ; le statut médical actuel reste inconnu.',
    ]
    return out


def club(cid):
    con = db()
    c = con.execute('SELECT * FROM clubs WHERE id=?', (cid,)).fetchone()
    if not c:
        return None
    out = {k: c[k] for k in c.keys() if k != 'fiche'}
    out['inscriptions'] = [dict(x) for x in con.execute('SELECT i.competition_id, k.nom, k.niveau, k.groupe, i.source, i.date_source FROM inscriptions i JOIN competitions k ON k.id=i.competition_id WHERE i.club_id=?', (cid,))]
    out['effectif_note'] = [dict(x) for x in con.execute("SELECT id, nom, poste, naissance, nat, niveau99, pot99, photo_local IS NOT NULL OR photo_url IS NOT NULL AS a_photo FROM joueurs WHERE club_id=? AND qualite='rated_snapshot' ORDER BY niveau99 DESC", (cid,))]
    out['autres_fiches'] = {x['qualite']: x['n'] for x in con.execute("SELECT qualite, count(*) n FROM joueurs WHERE club_id=? AND qualite<>'rated_snapshot' GROUP BY qualite", (cid,))}
    a = con.execute('SELECT fiche FROM academies WHERE club_id=?', (cid,)).fetchone()
    out['academie_modele'] = json.loads(a['fiche']) if a else None
    out['jeunes_reels'] = con.execute('SELECT count(*) FROM jeunes WHERE club_id=?', (cid,)).fetchone()[0]
    return out


def competitions():
    con = db()
    out = []
    for k in con.execute('SELECT * FROM competitions ORDER BY pays, niveau, groupe'):
        n = con.execute('SELECT count(*) FROM inscriptions WHERE competition_id=?', (k['id'],)).fetchone()[0]
        doc = con.execute("""SELECT count(*) FROM inscriptions i WHERE competition_id=? AND
            (SELECT count(*) FROM joueurs j WHERE j.club_id=i.club_id AND j.qualite='rated_snapshot') >= 18""", (k['id'],)).fetchone()[0]
        out.append({'id': k['id'], 'nom': k['nom'], 'pays': k['pays'], 'niveau': k['niveau'], 'groupe': k['groupe'],
                    'saison': k['saison'], 'regles_verifiees': bool(k['regles_verifiees']), 'equipes': n, 'effectifs_documentes': doc})
    return out


def libres(p):
    where, args = ['1=1'], []
    cat = p.get('categorie', 'fc27_carriere')
    where.append('l.categorie=?')
    args.append(cat)
    if p.get('poste'):
        where.append('l.poste=?')
        args.append(p['poste'])
    if p.get('q'):
        where.append('l.nom_norm LIKE ?')
        args.append(f'%{normaliser(p["q"])}%')
    if p.get('niveau_min'):
        where.append('l.niveau99 >= ?')
        args.append(int(p['niveau_min']))
    if p.get('age_max'):
        where.append('l.age IS NOT NULL AND l.age <= ?')
        args.append(int(p['age_max']))
    taille = max(1, min(50, int(p.get('taille', 25))))
    page = max(0, int(p.get('page', 0)))
    rows = db().execute(f'''SELECT l.cle, l.categorie, l.joueur_id, l.nom, l.poste, l.niveau99, l.pot99, l.age, l.fiche
        FROM libres l WHERE {' AND '.join(where)} ORDER BY l.niveau99 IS NULL, l.niveau99 DESC, l.nom LIMIT ? OFFSET ?''', args + [taille + 1, page * taille]).fetchall()
    res = []
    for r in rows[:taille]:
        d = dict(r)
        d['fiche'] = json.loads(d['fiche'])
        res.append(d)
    return {'resultats': res, 'page': page, 'suite': len(rows) > taille}


def etat():
    con = db()
    meta = {r['cle']: r['valeur'] for r in con.execute("SELECT * FROM meta WHERE cle<>'portraits_factices'")}
    par_q = {r['qualite']: r['n'] for r in con.execute('SELECT qualite, count(*) n FROM joueurs GROUP BY qualite')}
    log = [dict(r) for r in con.execute("SELECT etape, statut, count(*) n, sum(lignes) lignes FROM import_log GROUP BY etape, statut")]
    return {'pack': str(FM), 'meta': meta, 'par_qualite': par_q, 'import': log,
            'factices_ecartes': len(json.loads(con.execute("SELECT valeur FROM meta WHERE cle='portraits_factices'").fetchone()[0] or '[]'))}


class Handler(BaseHTTPRequestHandler):
    server_version = 'ManagerFoot/1.0'

    def log_message(self, fmt, *a):
        if os.environ.get('MF_VERBEUX'):
            sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % a))

    def envoyer(self, code, corps, ctype='application/json; charset=utf-8', cache=None):
        if isinstance(corps, (dict, list)):
            corps = json.dumps(corps, ensure_ascii=False).encode('utf-8')
        elif isinstance(corps, str):
            corps = corps.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(corps)))
        self.send_header('Cache-Control', cache or 'no-store')
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        p = {k: v[-1] for k, v in urllib.parse.parse_qs(u.query).items()}
        parts = [urllib.parse.unquote(x) for x in u.path.split('/') if x]
        try:
            if parts[:1] == ['api']:
                return self.api_get(parts[1:], p)
            if parts[:1] == ['img'] and len(parts) == 3 and parts[1] in ('joueur', 'club', 'wd'):
                f = RES.trouver(db(), parts[1], parts[2], telecharger=p.get('dl', '1') == '1')
                if not f:
                    return self.envoyer(404, {'erreur': 'aucune image disponible'})
                data = f.read_bytes()
                ext = images.type_image(data)
                if not ext:
                    return self.envoyer(404, {'erreur': 'fichier image illisible'})
                return self.envoyer(200, data, images.MIME[ext], 'max-age=86400')
            return self.statique(u.path)
        except BrokenPipeError:
            pass
        except Exception as e:
            self.envoyer(500, {'erreur': repr(e)[:300]})

    def api_get(self, parts, p):
        if parts == ['etat']:
            return self.envoyer(200, etat())
        if parts == ['recherche']:
            return self.envoyer(200, recherche(p))
        if parts == ['competitions']:
            return self.envoyer(200, competitions())
        if parts == ['libres']:
            return self.envoyer(200, libres(p))
        if parts == ['ressources']:
            return self.envoyer(200, RES.bilan(db()))
        if parts == ['dictionnaire']:
            return self.envoyer(200, json.loads((FM / 'dictionnaire_attributs_v7.json').read_text(encoding='utf-8')))
        if parts == ['scenario']:
            t0 = time.perf_counter()
            s = scenario.construire(db(), p.get('pays', 'France'))
            s['ms'] = round((time.perf_counter() - t0) * 1000)
            return self.envoyer(200, s)
        if len(parts) == 2 and parts[0] == 'joueur':
            f = fiche_joueur(parts[1])
            return self.envoyer(200 if f else 404, f or {'erreur': 'joueur inconnu'})
        if len(parts) == 3 and parts[0] == 'joueur' and parts[2] == 'historique':
            return self.envoyer(200, historique(parts[1]))
        if len(parts) == 2 and parts[0] == 'club':
            c = club(parts[1])
            return self.envoyer(200 if c else 404, c or {'erreur': 'club inconnu'})
        return self.envoyer(404, {'erreur': 'route inconnue'})

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(x) for x in u.path.split('/') if x]
        n = int(self.headers.get('Content-Length') or 0)
        if n > images.MAX_OCTETS + 1024:
            return self.envoyer(413, {'erreur': 'trop volumineux'})
        body = self.rfile.read(n) if n else b''
        try:
            if parts == ['api', 'ressources', 'pause']:
                RES.en_pause = True
            elif parts == ['api', 'ressources', 'reprise']:
                RES.en_pause = False
                RES.hors_ligne = False
            elif parts == ['api', 'ressources', 'telecharger']:
                req = json.loads(body or b'{}')
                ids = []
                con = db()
                if req.get('club'):
                    ids += [('club', req['club'])] + [('joueur', r['id']) for r in con.execute("SELECT id FROM joueurs WHERE club_id=? AND qualite='rated_snapshot'", (req['club'],))]
                if req.get('competition'):
                    for c in con.execute('SELECT club_id FROM inscriptions WHERE competition_id=?', (req['competition'],)):
                        ids += [('club', c['club_id'])] + [('joueur', r['id']) for r in con.execute("SELECT id FROM joueurs WHERE club_id=? AND qualite='rated_snapshot'", (c['club_id'],))]
                ids += [('joueur', i) for i in req.get('joueurs', [])][:2000]
                n = 0
                for typ, i in ids:
                    if RES.trouver(con, typ, i, telecharger=True) is None:
                        n += 1
                return self.envoyer(200, {'planifies': n, 'total': len(ids)})
            elif len(parts) == 5 and parts[:3] == ['api', 'ressources', 'manuel'] and parts[3] in ('joueur', 'club'):
                RES.ajouter_manuel(db(), parts[3], parts[4], body)
            elif len(parts) == 6 and parts[:3] == ['api', 'ressources', 'manuel'] and parts[5] == 'retirer':
                RES.retirer_manuel(db(), parts[3], parts[4])
            else:
                return self.envoyer(404, {'erreur': 'route inconnue'})
            return self.envoyer(200, {'ok': True})
        except ValueError as e:
            return self.envoyer(400, {'erreur': str(e)})

    def statique(self, path):
        rel = urllib.parse.unquote(path).lstrip('/') or 'index.html'
        if rel.split('/')[0] in STATIQUES_INTERDITS:
            return self.envoyer(403, {'erreur': 'interdit'})
        f = images.chemin_sur(RACINE_JEU, rel)
        if not f:
            return self.envoyer(404, 'Introuvable', 'text/plain; charset=utf-8')
        ctype = mimetypes.guess_type(f.name)[0] or 'application/octet-stream'
        if ctype.startswith('text/') or ctype in ('application/javascript',):
            ctype += '; charset=utf-8'
        self.envoyer(200, f.read_bytes(), ctype)


def main():
    global FM, RES
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--donnees', help='dossier Football_Monde')
    ap.add_argument('--hors-ligne', action='store_true', help='ne jamais télécharger d\'image')
    a = ap.parse_args()
    FM = trouver_football_monde(a.donnees or lire_config().get('football_monde'))
    if not FM or not BASE.exists():
        sys.exit('Base absente : lance d\'abord  python outils/importer_monde.py --donnees CHEMIN/Football_Monde')
    RES = images.Ressources(lambda: connexion(), FM)
    RES.hors_ligne = a.hors_ligne
    srv = ThreadingHTTPServer(('127.0.0.1', a.port), Handler)
    print(f'Manager Foot prêt : http://127.0.0.1:{a.port}/  (Ctrl+C pour arrêter)', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
