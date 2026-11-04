"""Catalogue FMB hors ligne. Index séparé des joueurs de la partie (Python standard)."""
import hashlib
import gzip
import io
import json
import os
from pathlib import Path
import re
import sqlite3
import zipfile
from decimal import Decimal

from commun import RACINE_JEU, DOSSIER_JEU_DONNEES, normaliser
import images

SCHEMA_VERSION = 4


def entier_source(valeur):
    """Une cellule absente ou non numérique demeure inconnue."""
    texte = str(valeur or '').strip()
    return int(texte) if texte.isdecimal() else None


def montant_source_gbp(valeur):
    """Montant affiché par FMblog, en livres ; '-' n'est jamais assimilé à zéro."""
    match = re.fullmatch(r'£([\d,.]+)([kmb]?)(?: p/w)?', str(valeur or '').strip(), re.I)
    if not match:
        return None
    try:
        nombre = Decimal(match[1].replace(',', ''))
        montant = nombre * {'': 1, 'k': 1_000, 'm': 1_000_000, 'b': 1_000_000_000}[match[2].lower()]
        return int(montant) if 0 <= montant <= 1_000_000_000_000 else None
    except (ArithmeticError, ValueError):
        return None


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
        self.supplement, empreinte_supplement = self._lire_supplement()
        empreinte = hashlib.sha256(self.fichier.read_bytes() + empreinte_supplement.encode()).hexdigest()
        if self.base.exists():
            with sqlite3.connect(self.base) as con:
                try:
                    row = con.execute('SELECT hash, schema_version FROM meta').fetchone()
                    if row and row[0] == empreinte and row[1] == SCHEMA_VERSION:
                        return
                except (sqlite3.Error, TypeError):
                    pass
        self._indexer(empreinte)

    def _lire_supplement(self):
        pack = RACINE_JEU / 'packs'
        chemin = pack / 'fmblog-fm26.manifest.json'
        if not chemin.is_file():
            return {}, ''
        manifest = json.loads(chemin.read_text(encoding='utf-8'))
        chunks = []
        for part in manifest['parts']:
            fichier = images.chemin_sur(pack, part['file'])
            octets = fichier.read_bytes() if fichier else b''
            if len(octets) != part['bytes'] or hashlib.sha256(octets).hexdigest() != part['sha256']:
                raise ValueError('Complément FMblog incomplet ou corrompu : ' + part['file'])
            chunks.append(octets)
        profils = json.loads(gzip.decompress(b''.join(chunks)))['players']
        if len(profils) != manifest['profiles']:
            raise ValueError('Nombre de profils FMblog incohérent')
        return {str(p['fmUid']): p for p in profils if p.get('sourceGender') == 'male' and len(p.get('attributes') or {}) >= 30}, hashlib.sha256(b''.join(chunks)).hexdigest()

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
        with sqlite3.connect(tmp) as c:
            c.executescript('''CREATE TABLE meta(hash TEXT, contenu TEXT, schema_version INTEGER);
                CREATE TABLE fiches(type TEXT, id TEXT, nom TEXT, recherche TEXT, detail INTEGER,
                  photo TEXT, contenu TEXT, poste TEXT, age INTEGER, niveau INTEGER,
                  potentiel INTEGER, club TEXT, valeur_gbp INTEGER, salaire_hebdo_gbp INTEGER,
                  PRIMARY KEY(type,id));
                CREATE INDEX tri_fiches ON fiches(type, nom);
                CREATE INDEX filtres_joueurs ON fiches(type, poste, age, niveau);''')
            clubs = {str(x['fm_uid']): x['name'] for x in data['clubs']}
            for genre, liste in [('people', data['people']), ('clubs', data['clubs']), ('competitions', data['competitions'])]:
                for raw in liste:
                    x = dict(raw)
                    typ = x['entity_type'] if genre == 'people' else genre
                    uid = str(x['fm_uid'])
                    if genre == 'people':
                        d = details.get((typ, uid))
                        supplement = self.supplement.get(uid) if typ == 'players' else None
                        if supplement and supplement['name'] == x['name']:
                            x['supplement'] = supplement
                        x['detail'] = d
                        x['memberships'] = membres.get((typ, uid), [])
                        fields = next((o.get('fields_source') for o in x.get('observations', []) if o.get('fields_source')), {})
                        fields = fields or {}
                        club_uid = x['memberships'][0].get('owner_club_fm_uid') if x['memberships'] else None
                        poste = fields.get('position') or (d.get('role_or_position_source') if d else None)
                        age = entier_source(fields.get('age'))
                        niveau = entier_source(fields.get('abi'))
                        potentiel = entier_source(fields.get('pot'))
                        club = clubs.get(str(club_uid)) if club_uid is not None else None
                        valeur = montant_source_gbp(fields.get('value'))
                        salaire = montant_source_gbp(fields.get('wage'))
                    else:
                        d = None
                        poste = age = niveau = potentiel = club = None
                        valeur = salaire = None
                    photo = (x.get('photo') or x.get('logo') or {}).get('local_path')
                    c.execute('INSERT INTO fiches VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                              (typ, uid, x['name'], normaliser(x['name']), bool(d or x.get('supplement')), photo, json.dumps(x, ensure_ascii=False),
                               poste, age, niveau, potentiel, club, valeur, salaire))
            c.execute('INSERT INTO meta VALUES(?, ?, ?)', (empreinte, json.dumps(data['metadata'], ensure_ascii=False), SCHEMA_VERSION))
        os.replace(tmp, self.base)

    def connection(self):
        con = sqlite3.connect(f'{self.base.as_uri()}?mode=ro', uri=True)
        con.row_factory = sqlite3.Row
        return con

    def etat(self):
        with self.connection() as c:
            chiffres = {r['type']: r['n'] for r in c.execute('SELECT type,count(*) n FROM fiches GROUP BY type')}
            return {'comptes': chiffres, 'profils_detailles_catalogue': c.execute('SELECT count(*) FROM fiches WHERE detail=1').fetchone()[0],
                    'profils_detailles_joueurs': c.execute("SELECT count(*) FROM fiches WHERE type='players' AND detail=1").fetchone()[0],
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
        if typ == 'players':
            if p.get('club'):
                where.append('INSTR(LOWER(club), LOWER(?)) > 0')
                args.append(p['club'][:80].strip())
            if p.get('poste'):
                if p['poste'] not in ('GK', 'DC', 'DR', 'DL', 'WBR', 'WBL', 'DM', 'MC', 'MR', 'ML', 'AMC', 'AMR', 'AML', 'ST'):
                    raise ValueError('Poste inconnu')
                where.append("(',' || REPLACE(poste, ' ', '') || ',') LIKE ?")
                args.append('%,' + p['poste'] + ',%')
            for param, colonne in [('age_max', 'age'), ('niveau_min', 'niveau')]:
                if p.get(param):
                    valeur = int(p[param])
                    if not 0 <= valeur <= 99:
                        raise ValueError('Filtre hors limites')
                    where.append(colonne + (' <= ?' if param == 'age_max' else ' >= ?')); args.append(valeur)
            for param, colonne in [('valeur_max', 'valeur_gbp'), ('salaire_max', 'salaire_hebdo_gbp')]:
                if p.get(param):
                    valeur = int(p[param])
                    if not 0 <= valeur <= 1_000_000_000_000:
                        raise ValueError('Filtre hors limites')
                    where.append(colonne + ' IS NOT NULL AND ' + colonne + ' <= ?'); args.append(valeur)
        tri = p.get('tri', 'nom')
        ordre = {'nom': 'nom, id', 'niveau': 'niveau IS NULL, niveau DESC, nom, id',
                 'potentiel': 'potentiel IS NULL, potentiel DESC, nom, id',
                 'age': 'age IS NULL, age, nom, id',
                 'marge': 'niveau IS NULL OR potentiel IS NULL, (potentiel - niveau) DESC, nom, id',
                 'valeur': 'valeur_gbp IS NULL, valeur_gbp, nom, id'}.get(tri)
        if ordre is None:
            raise ValueError('Tri inconnu')
        w = ' AND '.join(where)
        with self.connection() as c:
            total = c.execute('SELECT count(*) FROM fiches WHERE ' + w, args).fetchone()[0]
            rows = c.execute('SELECT type,id,nom,detail,photo,poste,age,niveau,potentiel,club,valeur_gbp,salaire_hebdo_gbp FROM fiches WHERE ' + w + ' ORDER BY ' + ordre + ' LIMIT ? OFFSET ?', args+[taille,page*taille]).fetchall()
            return {'total': total, 'page': page, 'taille': taille, 'resultats': [dict(x) for x in rows]}

    def fiche(self, typ, uid):
        with self.connection() as c:
            row = c.execute('SELECT contenu,poste,age,niveau,potentiel,club,valeur_gbp,salaire_hebdo_gbp FROM fiches WHERE type=? AND id=?', (typ,uid)).fetchone()
            if not row:
                return None
            data = json.loads(row['contenu'])
            data['_index'] = {k: row[k] for k in ('poste', 'age', 'niveau', 'potentiel', 'club', 'valeur_gbp', 'salaire_hebdo_gbp')}
            return data

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
