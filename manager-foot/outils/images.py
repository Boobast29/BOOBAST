"""Gestionnaire de ressources graphiques : portraits et logos.

Ordre : ajout manuel > fichier du pack (chemin fourni) > cache local > téléchargement à la demande.
- Téléchargements limités (3 simultanés), délai d'attente 8 s, 2 tentatives maximum par ressource,
  erreurs conservées : une URL refusée n'est jamais retentée en boucle.
- Une réponse n'est mise en cache que si c'est une image (signature PNG/JPEG/GIF/WebP) de taille raisonnable.
- Les fichiers sont écrits sous un nom dérivé d'un hachage, uniquement dans donnees_jeu/cache_images.
- Rien trouvé : le jeu affiche un portrait neutre à initiales / un blason générique (jamais la photo d'un autre).
"""
import datetime
import hashlib
import pathlib
import queue
import threading
import urllib.request

import enrichissements
from commun import CACHE_IMAGES

MAX_OCTETS = 3 * 1024 * 1024
TENTATIVES_MAX = 2
DELAI = 8
SIGNATURES = [(b'\x89PNG\r\n\x1a\n', 'png'), (b'\xff\xd8\xff', 'jpg'), (b'GIF8', 'gif')]


def type_image(data):
    for sig, ext in SIGNATURES:
        if data.startswith(sig):
            return ext
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'webp'
    return None


MIME = {'png': 'image/png', 'jpg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp'}


def chemin_sur(base, rel):
    """Résout rel sous base ; refuse toute sortie du dossier (../, chemin absolu)."""
    if not rel:
        return None
    p = (base / rel).resolve()
    try:
        p.relative_to(base.resolve())
    except ValueError:
        return None
    return p if p.is_file() else None


class Ressources:
    def __init__(self, con_factory, fm):
        self.con_factory = con_factory
        self.fm = fm
        self.verrou = threading.Lock()
        self.sem = threading.Semaphore(3)
        self.file = queue.Queue()
        self.en_pause = False
        self.hors_ligne = False
        self.en_attente = set()
        for _ in range(3):
            threading.Thread(target=self._ouvrier, daemon=True).start()

    def _nom_cache(self, typ, ident, ext):
        h = hashlib.sha1(f'{typ}|{ident}'.encode()).hexdigest()
        return CACHE_IMAGES / typ / h[:2] / f'{h}.{ext}'

    def _etat(self, con, typ, ident):
        return con.execute('SELECT * FROM images WHERE type=? AND id=?', (typ, ident)).fetchone()

    def _maj(self, con, typ, ident, **kw):
        with self.verrou, con:
            r = self._etat(con, typ, ident)
            cur = dict(r) if r else {'type': typ, 'id': ident, 'statut': None, 'chemin': None, 'url': None, 'tentatives': 0, 'erreur': None, 'octets': None}
            cur.update(kw)
            cur['maj'] = datetime.datetime.now().isoformat(timespec='seconds')
            con.execute('INSERT OR REPLACE INTO images VALUES (?,?,?,?,?,?,?,?,?)',
                        (typ, ident, cur['statut'], cur['chemin'], cur['url'], cur['tentatives'], cur['erreur'], cur['octets'], cur['maj']))

    def source(self, con, typ, ident):
        """Renvoie (chemin_local, url) connus pour la ressource."""
        if typ == 'wd':  # personne Wikidata (entraîneur, joueur d'effectif) : fichier Wikimedia Commons
            return (None, enrichissements.image_wd(con, ident))
        if typ == 'maillot':  # maillots : uniquement ajoutés à la main ou par un pack local
            return (None, None)
        if typ == 'joueur':
            r = con.execute('SELECT photo_local, photo_url FROM joueurs WHERE id=?', (ident,)).fetchone()
        else:
            r = con.execute('SELECT logo_local, logo_url FROM clubs WHERE id=?', (ident,)).fetchone()
            if r and not (r[0] or r[1]):
                return (None, enrichissements.logo_wd(con, ident))  # logo libre de Wikimedia Commons
        return (r[0], r[1]) if r else (None, None)

    def trouver(self, con, typ, ident, telecharger=True):
        """Chemin d'un fichier image prêt, ou None (le client utilise alors son repli)."""
        st = self._etat(con, typ, ident)
        if st and st['statut'] in ('manuel', 'telecharge') and st['chemin']:
            p = chemin_sur(CACHE_IMAGES, st['chemin'])
            if p:
                return p
        loc, url = self.source(con, typ, ident)
        p = chemin_sur(self.fm, loc)
        if p:
            return p
        if url and telecharger and not self.hors_ligne:
            if not st or (st['statut'] != 'erreur_definitive' and (st['tentatives'] or 0) < TENTATIVES_MAX):
                self.planifier(typ, ident)
        return None

    def planifier(self, typ, ident):
        k = (typ, ident)
        with self.verrou:
            if k in self.en_attente:
                return
            self.en_attente.add(k)
        self.file.put(k)

    def _ouvrier(self):
        con = self.con_factory()
        while True:
            typ, ident = self.file.get()
            try:
                while self.en_pause:
                    threading.Event().wait(1)
                self.telecharger(con, typ, ident)
            except Exception:
                pass
            finally:
                with self.verrou:
                    self.en_attente.discard((typ, ident))

    def telecharger(self, con, typ, ident):
        st = self._etat(con, typ, ident)
        if st and (st['statut'] in ('telecharge', 'manuel', 'erreur_definitive') or (st['tentatives'] or 0) >= TENTATIVES_MAX):
            return
        _, url = self.source(con, typ, ident)
        if not url or not url.startswith(('http://', 'https://')):
            self._maj(con, typ, ident, statut='sans_source')
            return
        tent = (st['tentatives'] if st else 0) + 1
        try:
            with self.sem:
                req = urllib.request.Request(url, headers={'User-Agent': 'ManagerFoot/1.0 (usage personnel, cache local)'})
                with urllib.request.urlopen(req, timeout=DELAI) as resp:
                    data = resp.read(MAX_OCTETS + 1)
            if len(data) > MAX_OCTETS:
                raise ValueError('image trop volumineuse')
            ext = type_image(data)
            if not ext:
                raise ValueError('réponse qui n\'est pas une image')
            dest = self._nom_cache(typ, ident, ext)
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp = dest.with_suffix('.part')
            tmp.write_bytes(data)
            tmp.replace(dest)
            self._maj(con, typ, ident, statut='telecharge', chemin=dest.relative_to(CACHE_IMAGES).as_posix(), url=url,
                      tentatives=tent, erreur=None, octets=len(data))
        except Exception as e:  # 403/404 : définitif ; réseau : nouvel essai borné
            code = getattr(e, 'code', None)
            definitif = code in (400, 401, 403, 404, 410) or tent >= TENTATIVES_MAX or isinstance(e, ValueError)
            if code is None and not isinstance(e, ValueError) and 'urlopen' in repr(e).lower():
                self.hors_ligne = True  # pas de connexion : on n'insiste pas, réessai manuel possible
            self._maj(con, typ, ident, statut='erreur_definitive' if definitif else 'erreur', url=url, tentatives=tent,
                      erreur=(f'HTTP {code}' if code else repr(e))[:200])

    def ajouter_manuel(self, con, typ, ident, data):
        ext = type_image(data)
        if not ext or len(data) > MAX_OCTETS:
            raise ValueError('fichier image invalide (PNG, JPEG, GIF ou WebP de moins de 3 Mo)')
        dest = self._nom_cache('manuel_' + typ, ident, ext)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        self._maj(con, typ, ident, statut='manuel', chemin=dest.relative_to(CACHE_IMAGES).as_posix(), erreur=None, octets=len(data))

    def retirer_manuel(self, con, typ, ident):
        st = self._etat(con, typ, ident)
        if st and st['statut'] == 'manuel':
            with self.verrou, con:
                con.execute('DELETE FROM images WHERE type=? AND id=?', (typ, ident))

    def bilan(self, con):
        q = lambda sql, *a: con.execute(sql, a).fetchone()[0]
        par = {r['statut']: r['n'] for r in con.execute('SELECT statut, count(*) n FROM images GROUP BY statut')}
        octets = 0
        if CACHE_IMAGES.exists():
            octets = sum(f.stat().st_size for f in CACHE_IMAGES.rglob('*') if f.is_file())
        return {
            'portraits_locaux_pack': q('SELECT count(*) FROM joueurs WHERE photo_local IS NOT NULL'),
            'portraits_url_seule': q('SELECT count(*) FROM joueurs WHERE photo_local IS NULL AND photo_url IS NOT NULL'),
            'logos_locaux_pack': q('SELECT count(*) FROM clubs WHERE logo_local IS NOT NULL'),
            'logos_url_seule': q('SELECT count(*) FROM clubs WHERE logo_local IS NULL AND logo_url IS NOT NULL'),
            'telecharges': par.get('telecharge', 0), 'manuels': par.get('manuel', 0),
            'en_erreur': par.get('erreur', 0) + par.get('erreur_definitive', 0), 'sans_source': par.get('sans_source', 0),
            'en_attente': len(self.en_attente), 'en_pause': self.en_pause, 'hors_ligne': self.hors_ligne,
            'octets_cache': octets,
            'dernieres_erreurs': [dict(r) for r in con.execute("SELECT type, id, erreur, tentatives, maj FROM images WHERE statut LIKE 'erreur%' ORDER BY maj DESC LIMIT 10")],
        }
