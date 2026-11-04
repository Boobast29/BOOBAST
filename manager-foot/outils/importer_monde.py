"""Importe le pack Football_Monde (V8 + V9 + V10) dans une base SQLite locale indexée.

    python outils/importer_monde.py [--donnees CHEMIN/Football_Monde] [--sans-historiques] [--forcer]

- Identifiants canoniques conservés ; INSERT OR REPLACE : relancer l'import ne crée aucun doublon.
- Reprise : chaque fichier source est noté dans import_log avec une empreinte ; un fichier
  déjà importé à l'identique est sauté. Une interruption reprend au fichier suivant.
- Les fichiers source ne sont jamais modifiés. Le snapshot source reste séparé de la partie.
"""
import argparse
import collections
import datetime
import gzip
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import (BASE, connexion, ecrire_config, lire_config, normaliser, pack,  # noqa: E402
                    poste_jeu, trouver_football_monde)

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta(cle TEXT PRIMARY KEY, valeur TEXT);
CREATE TABLE IF NOT EXISTS import_log(etape TEXT, fichier TEXT, empreinte TEXT, lignes INTEGER,
  debut TEXT, fin TEXT, statut TEXT, erreur TEXT, PRIMARY KEY(etape, fichier));
CREATE TABLE IF NOT EXISTS joueurs(
  id TEXT PRIMARY KEY, nom TEXT, nom_norm TEXT, naissance TEXT, nat TEXT, poste TEXT, poste_brut TEXT,
  taille INTEGER, club_id TEXT, qualite TEXT, niveau99 INTEGER, pot99 INTEGER, ea_id TEXT, tm_id TEXT,
  photo_local TEXT, photo_url TEXT, photo_origine TEXT, profil_riche INTEGER DEFAULT 0, lot TEXT);
CREATE TABLE IF NOT EXISTS fiches(id TEXT PRIMARY KEY, fiche BLOB);
CREATE INDEX IF NOT EXISTS j_nom ON joueurs(nom_norm);
CREATE INDEX IF NOT EXISTS j_club ON joueurs(club_id);
CREATE INDEX IF NOT EXISTS j_qual ON joueurs(qualite, niveau99);
CREATE INDEX IF NOT EXISTS j_ea ON joueurs(ea_id);
CREATE INDEX IF NOT EXISTS j_tm ON joueurs(tm_id);
CREATE INDEX IF NOT EXISTS j_pos ON joueurs(poste, niveau99);
CREATE INDEX IF NOT EXISTS j_qpos ON joueurs(qualite, poste, niveau99);
CREATE TABLE IF NOT EXISTS clubs(id TEXT PRIMARY KEY, nom TEXT, nom_norm TEXT, pays TEXT,
  logo_local TEXT, logo_url TEXT, statut_identite TEXT, fiche BLOB);
CREATE INDEX IF NOT EXISTS c_nom ON clubs(nom_norm);
CREATE TABLE IF NOT EXISTS profils(id TEXT PRIMARY KEY, fichier TEXT, fiche BLOB);
CREATE TABLE IF NOT EXISTS competitions(id TEXT PRIMARY KEY, nom TEXT, pays TEXT, niveau INTEGER,
  groupe TEXT, saison TEXT, regles_verifiees INTEGER, fiche TEXT);
CREATE TABLE IF NOT EXISTS inscriptions(competition_id TEXT, club_id TEXT, nom TEXT, pays TEXT, niveau INTEGER,
  reserve INTEGER, source TEXT, date_source TEXT, PRIMARY KEY(competition_id, club_id));
CREATE TABLE IF NOT EXISTS jeunes(id TEXT PRIMARY KEY, club_id TEXT, age_ref INTEGER, fiche TEXT);
CREATE TABLE IF NOT EXISTS academies(club_id TEXT PRIMARY KEY, fiche TEXT);
CREATE TABLE IF NOT EXISTS libres(cle TEXT PRIMARY KEY, categorie TEXT, joueur_id TEXT, nom TEXT, nom_norm TEXT,
  poste TEXT, niveau99 INTEGER, pot99 INTEGER, age INTEGER, fiche TEXT);
CREATE INDEX IF NOT EXISTS l_cat ON libres(categorie, niveau99);
CREATE TABLE IF NOT EXISTS conflits(n INTEGER PRIMARY KEY, fiche TEXT);
CREATE TABLE IF NOT EXISTS doublons_possibles(id TEXT PRIMARY KEY, groupe TEXT);
CREATE TABLE IF NOT EXISTS historiques(tab TEXT, joueur_id TEXT, source_fichier TEXT, fiche BLOB);
CREATE INDEX IF NOT EXISTS h_j ON historiques(joueur_id, tab);
CREATE TABLE IF NOT EXISTS ref_hf(tab TEXT, id TEXT, fiche TEXT, PRIMARY KEY(tab, id));
CREATE TABLE IF NOT EXISTS transferts_quarantaine(joueur_id TEXT, fiche TEXT);
CREATE TABLE IF NOT EXISTS images(type TEXT, id TEXT, statut TEXT, chemin TEXT, url TEXT, tentatives INTEGER DEFAULT 0,
  erreur TEXT, octets INTEGER, maj TEXT, PRIMARY KEY(type, id));
"""

AUJOURDHUI = datetime.date.today().isoformat()


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def empreinte(path):
    st = os.stat(path)
    return f'{st.st_size}-{int(st.st_mtime)}'


def migrer_schema(con):
    """v1 -> v2 : fiches JSON sorties de la table joueurs (recherche 10x plus rapide). Données conservées."""
    cols = [r[1] for r in con.execute('PRAGMA table_info(joueurs)')]
    if 'fiche' not in cols:
        return
    log('Migration du schéma de la base (fiches séparées)…')
    with con:
        con.execute('CREATE TABLE IF NOT EXISTS fiches(id TEXT PRIMARY KEY, fiche BLOB)')
        con.execute('INSERT OR REPLACE INTO fiches SELECT id, fiche FROM joueurs')
        keep = [c for c in cols if c != 'fiche']
        con.execute('DROP TABLE IF EXISTS joueurs_fts')
        con.execute('ALTER TABLE joueurs RENAME TO joueurs_v1')
        con.execute('''CREATE TABLE joueurs(id TEXT PRIMARY KEY, nom TEXT, nom_norm TEXT, naissance TEXT, nat TEXT, poste TEXT, poste_brut TEXT,
          taille INTEGER, club_id TEXT, qualite TEXT, niveau99 INTEGER, pot99 INTEGER, ea_id TEXT, tm_id TEXT,
          photo_local TEXT, photo_url TEXT, photo_origine TEXT, profil_riche INTEGER DEFAULT 0, lot TEXT)''')
        con.execute(f'INSERT INTO joueurs(rowid, {", ".join(keep)}) SELECT rowid, {", ".join(keep)} FROM joueurs_v1')
        n1 = con.execute('SELECT count(*) FROM joueurs_v1').fetchone()[0]
        n2 = con.execute('SELECT count(*) FROM joueurs').fetchone()[0]
        if n1 != n2:
            raise RuntimeError('migration : nombre de lignes différent, annulation')
        con.execute('DROP TABLE joueurs_v1')
        for idx in ('j_nom', 'j_club', 'j_qual', 'j_ea', 'j_tm'):
            con.execute(f'DROP INDEX IF EXISTS {idx}')
        con.execute("INSERT OR REPLACE INTO meta VALUES ('schema', '2')")
    con.executescript(SCHEMA)
    with con:
        con.execute("CREATE VIRTUAL TABLE joueurs_fts USING fts5(nom_norm, content='joueurs', content_rowid='rowid', tokenize='unicode61')")
        con.execute("INSERT INTO joueurs_fts(joueurs_fts) VALUES ('rebuild')")
    con.execute('VACUUM')
    log('Migration terminée')


def calculer_doublons(con):
    """Même nom normalisé + même date de naissance : signalé pour l'éditeur, jamais fusionné."""
    with con:
        con.execute('DELETE FROM doublons_possibles')
        con.execute('''INSERT INTO doublons_possibles SELECT j.id, j.nom_norm || '|' || j.naissance FROM joueurs j JOIN
            (SELECT nom_norm, naissance FROM joueurs WHERE naissance IS NOT NULL GROUP BY nom_norm, naissance HAVING count(*) > 1) d
            ON d.nom_norm = j.nom_norm AND d.naissance = j.naissance''')
    log('Doublons possibles signalés (non fusionnés) :', con.execute('SELECT count(*) FROM doublons_possibles').fetchone()[0], 'fiches')


class Importeur:
    def __init__(self, fm, forcer=False):
        self.fm = fm
        self.forcer = forcer
        self.con = connexion()
        migrer_schema(self.con)
        self.con.executescript(SCHEMA)
        self.placeholders = set()

    def deja(self, etape, fichier, emp):
        if self.forcer:
            return False
        r = self.con.execute('SELECT empreinte, statut FROM import_log WHERE etape=? AND fichier=?', (etape, fichier)).fetchone()
        return bool(r and r['empreinte'] == emp and r['statut'] == 'ok')

    def etape(self, etape, fichier, fn):
        """Exécute fn() dans une transaction et journalise ; saute si déjà fait à l'identique."""
        path = self.fm / fichier
        emp = empreinte(path)
        if self.deja(etape, fichier, emp):
            return 0
        debut = datetime.datetime.now().isoformat(timespec='seconds')
        try:
            with self.con:
                n = fn(path)
                self.con.execute('INSERT OR REPLACE INTO import_log VALUES (?,?,?,?,?,?,?,?)',
                                 (etape, fichier, emp, n, debut, datetime.datetime.now().isoformat(timespec='seconds'), 'ok', None))
            return n
        except Exception as e:  # journalise l'erreur, la transaction est annulée
            with self.con:
                self.con.execute('INSERT OR REPLACE INTO import_log VALUES (?,?,?,?,?,?,?,?)',
                                 (etape, fichier, emp, 0, debut, datetime.datetime.now().isoformat(timespec='seconds'), 'erreur', repr(e)[:500]))
            raise ValueError(f'Import impossible : {fichier} — {e}') from e

    # ---------- Images factices (silhouette par défaut) ----------
    def detecter_placeholders(self):
        """Une même image répétée sur de nombreuses fiches est une silhouette par défaut, pas un portrait."""
        compte = collections.Counter()
        par_fichier = {}
        for d in ['assets/players', 'extension_stats_v10/assets/portraits', 'extension_stats_v10/assets/portraits_libres']:
            p = self.fm / d
            if not p.is_dir():
                continue
            for f in os.listdir(p):
                rel = f'{d}/{f}'
                h = hashlib.md5((p / f).read_bytes()).hexdigest()
                par_fichier[rel] = h
                compte[h] += 1
        bad = {h for h, n in compte.items() if n >= 5}
        self.placeholders = {rel for rel, h in par_fichier.items() if h in bad}
        with self.con:
            self.con.execute("INSERT OR REPLACE INTO meta VALUES ('portraits_factices', ?)", (json.dumps(sorted(self.placeholders)),))
        log(f'Portraits locaux : {len(par_fichier)} fichiers, {len(self.placeholders)} silhouettes par défaut écartées')

    def photo_valide(self, rel):
        return bool(rel) and rel not in self.placeholders and (self.fm / rel).is_file()

    # ---------- Clubs ----------
    def clubs(self, path):
        data = json.loads(path.read_text(encoding='utf-8'))['clubs']
        logos = json.loads((self.fm / 'extension_stats_v10/logos_cache_v10.json').read_text(encoding='utf-8'))['clubs']
        rows = []
        for c in data:
            logo = c.get('logo') or {}
            loc = logo.get('local_path')
            l10 = logos.get(c['id'])
            if (not loc or not (self.fm / loc).is_file()) and l10 and l10.get('status') == 'downloaded':
                loc = l10.get('local_path')
            if loc and not (self.fm / loc).is_file():
                loc = None
            url = logo.get('url') or (l10 or {}).get('source_url')
            rows.append((c['id'], c.get('name'), normaliser(c.get('name')), c.get('country'), loc, url,
                         c.get('identity_link_method'), pack(c)))
        self.con.executemany('INSERT OR REPLACE INTO clubs VALUES (?,?,?,?,?,?,?,?)', rows)
        return len(rows)

    def clubs_v9(self, path):
        d = json.loads(path.read_text(encoding='utf-8'))
        n = 0
        for c in d['additional_clubs']:
            if self.con.execute('SELECT 1 FROM clubs WHERE id=?', (c['id'],)).fetchone():
                continue
            logo = c.get('logo') or {}
            self.con.execute('INSERT OR REPLACE INTO clubs VALUES (?,?,?,?,?,?,?,?)',
                             (c['id'], c['name'], normaliser(c['name']), c.get('country'), logo.get('local_path'), logo.get('url'),
                              c.get('identity_status'), pack(c)))
            n += 1
        for comp in d['competitions']:
            self.con.execute('INSERT OR REPLACE INTO competitions VALUES (?,?,?,?,?,?,?,?)',
                             (comp['id'], comp['name'], comp['country'], comp['tier'], comp.get('group'), comp.get('season'),
                              1 if comp.get('rules_verified') else 0, json.dumps(comp, ensure_ascii=False)))
        for m in d['membership_records']:
            self.con.execute('INSERT OR REPLACE INTO inscriptions VALUES (?,?,?,?,?,?,?,?)',
                             (m['competition_id'], m['club_id'], m['name'], m['country'], m['tier'],
                              1 if m.get('is_reserve_in_senior_pyramid') else 0, m.get('membership_source'), m.get('membership_date')))
            # le pays de l'inscription renseigne le club quand il manque
            self.con.execute('UPDATE clubs SET pays=? WHERE id=? AND pays IS NULL', (m['country'], m['club_id']))
        return n + len(d['competitions']) + len(d['membership_records'])

    # ---------- Joueurs (88 lots) ----------
    def lot(self, path):
        rows = []
        cache10 = self.photos10
        for r in json.loads(path.read_text(encoding='utf-8'))['players']:
            cap = r.get('capacites') or {}
            ext = r.get('external_ids') or {}
            ea = ext.get('eafc')
            ph = r.get('photo') or {}
            loc, url, orig = None, ph.get('url'), None
            p10 = cache10.get(f'ea_player_{ea}') if ea else None
            if p10 and p10.get('status') == 'downloaded' and self.photo_valide(p10.get('local_path')):
                loc, orig = p10['local_path'], 'cache_v10'
            elif self.photo_valide(ph.get('local_path')):
                loc, orig = ph['local_path'], 'pack_v8'
            if url and 'default.jpg' in url:
                url = None  # URL de la silhouette par défaut : pas un portrait
            if not url and p10:
                url = p10.get('source_url')
            rows.append((r['id'], r.get('name'), normaliser(r.get('name')), r.get('date_of_birth'), r.get('nationalities_raw'),
                         poste_jeu(r.get('position')), r.get('position'), r.get('height_cm'), r.get('club_id'), r.get('data_quality'),
                         cap.get('niveau_actuel_sur_99'), cap.get('potentiel_sur_99'), ea, ext.get('transfermarkt'),
                         loc, url, orig, 0, path.name, pack(r)))
        self.con.executemany('INSERT OR REPLACE INTO joueurs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [x[:-1] for x in rows])
        self.con.executemany('INSERT OR REPLACE INTO fiches VALUES (?,?)', [(x[0], x[-1]) for x in rows])
        return len(rows)

    def profils(self, path):
        n = 0
        for r in json.loads(path.read_text(encoding='utf-8'))['players']:
            pid = r['canonical_player_id']
            self.con.execute('INSERT OR REPLACE INTO profils VALUES (?,?,?)', (pid, path.name, pack(r)))
            ph = r.get('photo') or {}
            if self.photo_valide(ph.get('local_path')):
                self.con.execute("UPDATE joueurs SET photo_local=?, photo_origine='profil_v10' WHERE id=? AND photo_local IS NULL",
                                 (ph['local_path'], pid))
            if ph.get('url') and 'default.jpg' not in ph['url']:
                self.con.execute('UPDATE joueurs SET photo_url=? WHERE id=? AND photo_url IS NULL', (ph['url'], pid))
            n += 1
        return n

    def selection_riche(self, path):
        ids = json.loads(path.read_text(encoding='utf-8'))['canonical_player_ids']
        self.con.execute('UPDATE joueurs SET profil_riche=0')
        self.con.executemany('UPDATE joueurs SET profil_riche=1 WHERE id=?', [(i,) for i in ids])
        return len(ids)

    # ---------- V9 : jeunes, académies ----------
    def jeunes(self, path):
        d = json.loads(path.read_text(encoding='utf-8'))
        self.con.executemany('INSERT OR REPLACE INTO jeunes VALUES (?,?,?,?)',
                             [(p['id'], p.get('club_id'), p.get('age_at_2026_07_01'), json.dumps(p, ensure_ascii=False)) for p in d['players']])
        return len(d['players'])

    def academies(self, path):
        d = json.loads(path.read_text(encoding='utf-8'))
        self.con.executemany('INSERT OR REPLACE INTO academies VALUES (?,?)',
                             [(a['club_id'], json.dumps(a, ensure_ascii=False)) for a in d['academies']])
        with self.con:
            self.con.execute("INSERT OR REPLACE INTO meta VALUES ('structures_formation', ?)",
                             (json.dumps({'youth_competitions': len(d['youth_competitions']), 'youth_teams': len(d['youth_teams']), 'note': d.get('note')}, ensure_ascii=False),))
        return len(d['academies'])

    # ---------- V10 : joueurs libres ----------
    def libres_fc27(self, path):
        d = json.loads(path.read_text(encoding='utf-8'))
        rows = []
        for p in d['players']:
            cle = 'fc27_' + str(p.get('source_ea_player_id'))
            pid = p.get('canonical_player_id')
            if not pid and p.get('source_ea_player_id'):
                r = self.con.execute('SELECT id FROM joueurs WHERE ea_id=?', (str(p['source_ea_player_id']),)).fetchall()
                pid = r[0]['id'] if len(r) == 1 else None
            age = int(p['age_source']) if str(p.get('age_source') or '').isdigit() else None
            rows.append((cle, 'fc27_carriere', pid, p.get('name'), normaliser(p.get('name')),
                         poste_jeu((p.get('positions_source') or '').split(' ')[0] if p.get('positions_source') else None),
                         p.get('note_sur_99'), p.get('potentiel_sur_99'), age, json.dumps(p, ensure_ascii=False)))
        self.con.executemany('INSERT OR REPLACE INTO libres VALUES (?,?,?,?,?,?,?,?,?,?)', rows)
        return len(rows)

    def libres_archive(self, path):
        d = json.loads(path.read_text(encoding='utf-8'))
        rows = [('arch_' + p['canonical_player_id'], 'archive_a_reverifier', p['canonical_player_id'], p.get('name'), normaliser(p.get('name')),
                 poste_jeu(p.get('position')), None, None, None, json.dumps(p, ensure_ascii=False)) for p in d['players']]
        self.con.executemany('INSERT OR REPLACE INTO libres VALUES (?,?,?,?,?,?,?,?,?,?)', rows)
        return len(rows)

    def conflits(self, path):
        d = json.loads(path.read_text(encoding='utf-8'))
        self.con.execute('DELETE FROM conflits')
        self.con.executemany('INSERT INTO conflits VALUES (?,?)', [(i, json.dumps(c, ensure_ascii=False)) for i, c in enumerate(d)])
        return len(d)

    # ---------- V10 : archives historiques (gzip JSONL) ----------
    def archive_par_joueur(self, tab):
        def fn(path):
            self.con.execute('DELETE FROM historiques WHERE source_fichier=?', (path.name,))
            n, batch, quarant = 0, [], 0
            with gzip.open(path, 'rt', encoding='utf-8') as f:
                for line in f:
                    o = json.loads(line)
                    pid = o.get('canonical_player_id')
                    if not pid:
                        continue  # non relié : reste dans la source, aucune personne créée
                    if tab == 'transferts':
                        ok = []
                        for rec in o.get('records', []):
                            dt = rec.get('transfer_date') or ''
                            if dt and dt > AUJOURDHUI:  # date future ou aberrante : mise à part, jamais corrigée
                                self.con.execute('INSERT INTO transferts_quarantaine VALUES (?,?)', (pid, json.dumps(rec, ensure_ascii=False)))
                                quarant += 1
                            else:
                                ok.append(rec)
                        o['records'] = ok
                    batch.append((tab, pid, path.name, pack(o)))
                    n += 1
                    if len(batch) >= 5000:
                        self.con.executemany('INSERT INTO historiques VALUES (?,?,?,?)', batch)
                        batch = []
            if batch:
                self.con.executemany('INSERT INTO historiques VALUES (?,?,?,?)', batch)
            if quarant:
                log(f'  {quarant} transferts à date future mis en quarantaine')
            return n
        return fn

    def archive_annees_civiles(self, path):
        self.con.execute('DELETE FROM historiques WHERE source_fichier=?', (path.name,))
        groupes = collections.defaultdict(list)
        n = 0
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            for line in f:
                o = json.loads(line)
                pid = o.get('canonical_player_id')
                if pid:
                    groupes[pid].append(line.strip())
                    n += 1
        batch = []
        for pid, lines in groupes.items():
            recs = [json.loads(x) for x in lines]
            batch.append(('annees_civiles', pid, path.name, pack({'records': recs})))
            if len(batch) >= 5000:
                self.con.executemany('INSERT INTO historiques VALUES (?,?,?,?)', batch)
                batch = []
        if batch:
            self.con.executemany('INSERT INTO historiques VALUES (?,?,?,?)', batch)
        return n

    def ref(self, tab):
        def fn(path):
            n = 0
            with gzip.open(path, 'rt', encoding='utf-8') as f:
                for line in f:
                    o = json.loads(line)
                    self.con.execute('INSERT OR REPLACE INTO ref_hf VALUES (?,?,?)', (tab, str(o['id']), line.strip()))
                    n += 1
            return n
        return fn

    # ---------- Orchestration ----------
    def run(self, historiques=True):
        t0 = time.time()
        fm = self.fm
        self.detecter_placeholders()
        self.photos10 = json.loads((fm / 'extension_stats_v10/photos_cache_v10.json').read_text(encoding='utf-8'))['players']
        manifest = json.loads((fm / 'base_geante_v8/manifest.json').read_text(encoding='utf-8'))

        log('Clubs…', self.etape('clubs', 'base_geante_v8/clubs.json', self.clubs))
        log('Compétitions V9…', self.etape('competitions', 'extension_jeunes_divisions_v9/championnats_2026_2027.json', self.clubs_v9))
        total = 0
        for i, fn in enumerate(manifest['player_files']):
            n = self.etape('joueurs', f'base_geante_v8/joueurs/{fn}', self.lot)
            total += n
            if n:
                log(f'Lot {i + 1}/{len(manifest["player_files"])} {fn} : {n} fiches')
        profils = sorted(p.name for p in (fm / 'extension_stats_v10/profils_jeu').glob('*.json') if not p.name.startswith('.'))
        for fn in profils:
            n = self.etape('profils', f'extension_stats_v10/profils_jeu/{fn}', self.profils)
            if n:
                log(f'Profils V10 {fn} : {n}')
        log('Sélection riche…', self.etape('riches', 'extension_stats_v10/profils_riches_selection.json', self.selection_riche))
        log('Jeunes réels…', self.etape('jeunes', 'extension_jeunes_divisions_v9/jeunes_reels_15_21_ans.json', self.jeunes))
        log('Académies (modèle)…', self.etape('academies', 'extension_jeunes_divisions_v9/structures_formation_jeu.json', self.academies))
        log('Libres FC27…', self.etape('libres', 'extension_stats_v10/joueurs_libres/libres_base_carriere_fc27.json', self.libres_fc27))
        log('Sans club (archive)…', self.etape('libres', 'extension_stats_v10/joueurs_libres/sans_club_archive_a_reverifier.json', self.libres_archive))
        log('Conflits…', self.etape('conflits', 'base_geante_v8/conflits_identite.json', self.conflits))
        if historiques:
            H = 'extension_stats_v10/historiques/'
            for tab, f in [('performances', 'performances_saison_tm'), ('absences', 'absences_historiques_tm'),
                           ('transferts', 'transferts_tm'), ('valeurs', 'valeurs_marche_tm'), ('selections', 'selections_tm')]:
                log(f'Archive {f}…', self.etape('historiques', H + f + '.jsonl.gz', self.archive_par_joueur(tab)))
            log('Archive années civiles…', self.etape('historiques', H + 'statistiques_annees_civiles_hf.jsonl.gz', self.archive_annees_civiles))
            log('Référentiel équipes…', self.etape('ref', H + 'equipes_source_hf.jsonl.gz', self.ref('equipes')))
            log('Référentiel compétitions…', self.etape('ref', H + 'competitions_source_hf.jsonl.gz', self.ref('competitions')))

        n = self.con.execute('SELECT count(*) FROM joueurs').fetchone()[0]
        calculer_doublons(self.con)
        log('Index de recherche…')
        with self.con:
            self.con.execute('DROP TABLE IF EXISTS joueurs_fts')
            self.con.execute("CREATE VIRTUAL TABLE joueurs_fts USING fts5(nom_norm, content='joueurs', content_rowid='rowid', tokenize='unicode61')")
            self.con.execute("INSERT INTO joueurs_fts(joueurs_fts) VALUES ('rebuild')")
            for k, v in [('pack_dossier', str(fm)), ('import_termine', datetime.datetime.now().isoformat(timespec='seconds')),
                         ('nb_joueurs_attendu', manifest['players']), ('nb_joueurs', n),
                         ('dates_sources', json.dumps({'registre_reep_v0': '2026-06-21', 'attributs_ea': manifest.get('detailed_attributes_date'),
                                                       'potentiels': manifest.get('potential_provider_declared_date'),
                                                       'matchs_historiques_jusqu_au': '2026-07-04', 'valeurs_marche_jusqu_au': '2025-09-11',
                                                       'absences_maj': '2026-09-29'}))]:
                self.con.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', (k, str(v)))
        if n != manifest['players']:
            log(f'ATTENTION : {n} fiches en base, {manifest["players"]} attendues')
        else:
            log(f'Contrôle : {n} fiches, identique au manifeste')
        dup = self.con.execute('SELECT count(*) - count(DISTINCT id) FROM joueurs').fetchone()[0]
        log(f'Doublons d\'identifiant : {dup}')
        self.con.execute('PRAGMA optimize')
        log(f'Import terminé en {time.time() - t0:.0f} s -> {BASE}')
        return n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--donnees', help='dossier Football_Monde')
    ap.add_argument('--sans-historiques', action='store_true', help='ne pas importer les archives gzip (plus rapide)')
    ap.add_argument('--forcer', action='store_true', help='réimporter même les fichiers déjà importés')
    a = ap.parse_args()
    fm = trouver_football_monde(a.donnees)
    if not fm:
        sys.exit('Dossier Football_Monde introuvable. Indique-le avec --donnees CHEMIN.')
    cfg = lire_config()
    cfg['football_monde'] = str(fm)
    ecrire_config(cfg)
    log('Pack :', fm)
    Importeur(fm, a.forcer).run(not a.sans_historiques)


if __name__ == '__main__':
    main()
