"""Catalogue FMB hors ligne. Index séparé des joueurs de la partie (Python standard)."""
import hashlib
import io
import json
import os
import time
from pathlib import Path
import sqlite3
import zipfile

from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, normaliser
import images


class Catalogue:
    def __init__(self, football_monde=None, stockage=None):
        self.stockage = Path(stockage or DOSSIER_JEU_DONNEES / 'catalogue_fmb')
        self.stockage.mkdir(parents=True, exist_ok=True)
        self.racine = Path(football_monde) if football_monde else self.stockage / 'pack' / 'Football_Monde'
        self.fichier = self.racine / 'extension_fmb_v15' / 'catalogue_fmb_v15.json'
        if not self.fichier.is_file():
            self.racine = self.stockage / 'pack' / 'Football_Monde'
            self.fichier = self.racine / 'extension_fmb_v15' / 'catalogue_fmb_v15.json'
            self._extraire()
        self.base = self.stockage / 'catalogue.sqlite'
        empreinte = hashlib.sha256(self.fichier.read_bytes()).hexdigest()
        if self.base.exists():
            con = sqlite3.connect(self.base)  # fermée explicitement : sous Windows, un fichier ouvert ne peut pas être remplacé
            try:
                if con.execute('SELECT hash FROM meta').fetchone()[0] == empreinte:
                    return
            except (sqlite3.Error, TypeError):
                pass
            finally:
                con.close()
        self._indexer(empreinte)

    def _extraire(self):
        pack = RACINE_JEU / 'packs'
        m = json.loads((pack / 'football-monde-fmb.json').read_text(encoding='utf-8'))
        contenu = bytearray()
        for part in m['parts']:
            f = images.chemin_sur(pack, part['file'])
            data = f.read_bytes() if f else b''
            if len(data) != part['bytes'] or hashlib.sha256(data).hexdigest() != part['sha256']:
                raise ValueError('Pack FMB incomplet ou corrompu : ' + part['file'])
            contenu.extend(data)
        if hashlib.sha256(contenu).hexdigest() != m['sha256']:
            raise ValueError('Empreinte du pack FMB incorrecte')
        dest = self.stockage / 'pack'
        dest.mkdir(exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(contenu)) as z:
            infos = z.infolist()
            if len(infos) > 1000 or sum(i.file_size for i in infos) > 200_000_000:
                raise ValueError('Archive FMB trop volumineuse')
            for i in infos:
                cible = (dest / i.filename).resolve()
                if dest.resolve() not in cible.parents:
                    raise ValueError('Chemin hors du pack')
                if i.is_dir():
                    cible.mkdir(parents=True, exist_ok=True)
                else:
                    cible.parent.mkdir(parents=True, exist_ok=True)
                    cible.write_bytes(z.read(i))

    def _indexer(self, empreinte):
        data = json.loads(self.fichier.read_text(encoding='utf-8'))
        if not all(isinstance(data.get(k), list) for k in ('people', 'clubs', 'competitions', 'detailed_profiles', 'memberships')):
            raise ValueError('Schéma FMB invalide')
        details = {(x['entity_type'], str(x['fm_uid'])): x for x in data['detailed_profiles']}
        membres = {}
        for x in data['memberships']:
            membres.setdefault((x['entity_type'], str(x['person_fm_uid'])), []).append(x)
        tmp = self.base.with_suffix('.tmp')
        tmp.unlink(missing_ok=True)
        c = sqlite3.connect(tmp)
        with c:
            c.executescript('''CREATE TABLE meta(hash TEXT, contenu TEXT);
                CREATE TABLE fiches(type TEXT, id TEXT, nom TEXT, recherche TEXT, detail INTEGER,
                  photo TEXT, contenu TEXT, PRIMARY KEY(type,id));
                CREATE INDEX tri_fiches ON fiches(type, nom);''')
            for genre, liste in [('people', data['people']), ('clubs', data['clubs']), ('competitions', data['competitions'])]:
                for raw in liste:
                    x = dict(raw)
                    typ = x['entity_type'] if genre == 'people' else genre
                    uid = str(x['fm_uid'])
                    if genre == 'people':
                        d = details.get((typ, uid))
                        x['detail'] = d
                        x['memberships'] = membres.get((typ, uid), [])
                    else:
                        d = None
                    photo = (x.get('photo') or x.get('logo') or {}).get('local_path')
                    c.execute('INSERT INTO fiches VALUES(?,?,?,?,?,?,?)', (typ, uid, x['name'], normaliser(x['name']), bool(d), photo, json.dumps(x, ensure_ascii=False)))
            c.execute('INSERT INTO meta VALUES(?,?)', (empreinte, json.dumps(data['metadata'], ensure_ascii=False)))
        c.close()
        for essai in range(5):  # Windows : un antivirus ou un autre serveur peut bloquer le fichier un instant
            try:
                os.replace(tmp, self.base)
                return
            except PermissionError:
                time.sleep(.5)
        self.base = tmp  # toujours bloqué (autre fenêtre du jeu ouverte ?) : on lit l'index tout neuf directement
        print('Index du catalogue utilisé depuis catalogue.tmp (catalogue.sqlite est bloqué : ferme les autres fenêtres du jeu).', flush=True)

    def connection(self):
        con = sqlite3.connect(f'{self.base.as_uri()}?mode=ro', uri=True)
        con.row_factory = sqlite3.Row
        return con

    def etat(self):
        with self.connection() as c:
            chiffres = {r['type']: r['n'] for r in c.execute('SELECT type,count(*) n FROM fiches GROUP BY type')}
            return {'comptes': chiffres, 'profils_detailles_catalogue': c.execute('SELECT count(*) FROM fiches WHERE detail=1').fetchone()[0],
                    'source': json.loads(c.execute('SELECT contenu FROM meta').fetchone()[0]),
                    'note': 'Instantané FM26 26.3.2. Notes FMB sur 99. Affectations et salaires non vérifiés dans le monde réel.'}

    def liste(self, p):
        typ = p.get('type', 'players')
        if typ not in ('players', 'staff', 'clubs', 'competitions'):
            raise ValueError('Type inconnu')
        page = max(0, min(100000, int(p.get('page', 0))))
        taille = max(1, min(50, int(p.get('taille', 24))))
        where, args = ['type=?'], [typ]
        # Normalisation enlève % et _, la recherche ne peut pas injecter de SQL.
        for mot in normaliser(p.get('q', '')[:200]).split()[:6]:
            where.append('recherche LIKE ?'); args.append('%' + mot + '%')
        if p.get('detail') == '1':
            where.append('detail=1')
        if p.get('photo') == '1':
            where.append('photo IS NOT NULL')
        w = ' AND '.join(where)
        with self.connection() as c:
            total = c.execute('SELECT count(*) FROM fiches WHERE ' + w, args).fetchone()[0]
            rows = c.execute('SELECT type,id,nom,detail,photo FROM fiches WHERE ' + w + ' ORDER BY nom,id LIMIT ? OFFSET ?', args+[taille,page*taille]).fetchall()
            return {'total': total, 'page': page, 'taille': taille, 'resultats': [dict(x) for x in rows]}

    def fiche(self, typ, uid):
        with self.connection() as c:
            row = c.execute('SELECT contenu FROM fiches WHERE type=? AND id=?', (typ,uid)).fetchone()
            return json.loads(row[0]) if row else None

    def photo(self, typ, uid):
        with self.connection() as c:
            row = c.execute('SELECT photo FROM fiches WHERE type=? AND id=?', (typ,uid)).fetchone()
        if not row or not row[0]:
            return None
        rel = row[0].replace('\\', '/')
        if rel.startswith('Football_Monde/'):
            rel = rel[len('Football_Monde/'):]
        f = images.chemin_sur(self.racine, rel)
        if not f:
            return None
        data = f.read_bytes()
        ext = images.type_image(data)
        return (data, images.MIME[ext]) if ext else None
