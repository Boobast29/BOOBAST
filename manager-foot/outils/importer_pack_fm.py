"""Importe sur ton PC un pack graphique Football Manager déjà téléchargé (visages, logos, maillots), pour ton usage personnel.

    python outils/importer_pack_fm.py --pack DOSSIER_DU_PACK --liste EXPORT_FM [--type joueurs|logos|maillots] [--essai]

Les packs de la communauté FM (FMEurope, sortitoutsi…) nomment leurs images par l'identifiant unique (UID) de Football Manager,
souvent via un fichier config.xml. Pour savoir à qui appartient chaque UID, il faut une liste exportée depuis Football Manager :
dans une vue de joueurs ou de clubs, ajoute la colonne « UID » (ou « ID unique »), puis Ctrl+P > « Page web » (.html)
ou « Fichier texte » (.rtf/.txt). Le nom (et la date de naissance s'il y en a une) sert à retrouver le joueur ou le club de la base.

Rien n'est envoyé ni publié : les images sont copiées dans donnees_jeu/cache_images (dossier non versionné) et
enregistrées comme ajouts manuels. Les logos et photos de ces packs restent la propriété de leurs ayants droit :
ne les redistribue pas. Pour retirer un pack : python outils/importer_pack_fm.py --retirer --type ...
"""
import argparse
import html
import os
import pathlib
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import CACHE_IMAGES, connexion, normaliser  # noqa: E402
import images  # noqa: E402

EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
COL_UID = ('uid', 'unique id', 'id unique', 'identifiant unique', 'id')
COL_NOM = ('name', 'nom', 'player', 'joueur', 'club', 'team', 'equipe', 'équipe')
COL_DDN = ('dob', 'date of birth', 'date de naissance', 'ne le', 'né le', 'naissance')
TYPES = {'joueurs': 'joueur', 'logos': 'club', 'maillots': 'maillot'}


def lire_liste(path):
    """Lignes {uid, nom, ddn} d'un export FM (page web .html, ou texte .rtf/.txt à colonnes séparées par « | »)."""
    brut = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore')
    lignes = []
    if '<tr' in brut.lower():
        for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', brut, flags=re.S | re.I):
            cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', tr, flags=re.S | re.I)]
            if cells:
                lignes.append(cells)
    else:
        for l in brut.splitlines():
            if l.count('|') >= 2:
                lignes.append([c.strip() for c in l.strip().strip('|').split('|')])
    if not lignes:
        return []
    tete = [normaliser(c) for c in lignes[0]]

    def col(noms):
        for n in noms:
            n = normaliser(n)
            if n in tete:
                return tete.index(n)
        return None
    iu, inom, iddn = col(COL_UID), col(COL_NOM), col(COL_DDN)
    if iu is None or inom is None:
        raise SystemExit(f'Colonnes « UID » et « Nom » introuvables dans {path} (en-tête lu : {lignes[0]})')
    out = []
    for c in lignes[1:]:
        if len(c) <= max(iu, inom) or not c[iu].strip().isdigit():
            continue
        ddn = c[iddn] if iddn is not None and len(c) > iddn else ''
        an = re.search(r'(19|20)\d\d', ddn)
        out.append({'uid': c[iu].strip(), 'nom': c[inom], 'an': an.group(0) if an else None})
    return out


# chemins FM des images selon le type (config.xml) : visage d'une personne, logo d'une équipe, maillot d'une équipe.
# Les logos de compétitions et de nations portent leurs propres numéros, qui peuvent coïncider avec ceux des clubs :
# ils sont exclus.
CIBLES = {'joueur': r'pictures/person/(\d+)/portrait', 'club': r'pictures/team/(\d+)/logo', 'maillot': r'pictures/team/(\d+)/kits?/([a-z]+)'}
EXCLUS = re.compile(r'(^|[\\/])(comps?|competitions?|nations?|countries|continents?)([\\/]|$)', re.I)
PREF_MAILLOT = ['home', 'domicile', 'away', 'third']


def fichiers_pack(dossier, typ='joueur'):
    """UID -> fichier image, d'après config.xml (attributs from/to) ou, à défaut, le nom de fichier numérique."""
    dossier = pathlib.Path(dossier)
    par_uid, rang = {}, {}
    imgs = {}
    for p in dossier.rglob('*'):
        if p.suffix.lower() in EXT and not EXCLUS.search(str(p.relative_to(dossier).parent)):
            imgs.setdefault(p.stem, p)
    motif = re.compile(CIBLES[typ], re.I)
    for cfg in dossier.rglob('config.xml'):
        for frm, to in re.findall(r'<record\s+from="([^"]+)"\s+to="([^"]+)"', cfg.read_text(encoding='utf-8', errors='ignore')):
            m = motif.search(to)
            if not m:
                continue
            img = next((p for p in cfg.parent.glob(glob_echappe(frm) + '.*') if p.suffix.lower() in EXT), None) or imgs.get(frm)
            if not img:
                continue
            r = PREF_MAILLOT.index(m.group(2).lower()) if typ == 'maillot' and m.group(2).lower() in PREF_MAILLOT else 9 if typ == 'maillot' else 0
            if m.group(1) not in par_uid or r < rang[m.group(1)]:
                par_uid[m.group(1)], rang[m.group(1)] = img, r
    if typ != 'maillot':  # sans config.xml : fichiers nommés par l'UID (les maillots ont toujours un config.xml)
        for stem, p in imgs.items():
            if stem.isdigit():
                par_uid.setdefault(stem, p)
    return par_uid


def glob_echappe(s):
    return re.sub(r'([\[\]*?])', r'[\1]', s)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pack', help='dossier du pack (contient les images et souvent config.xml)')
    ap.add_argument('--liste', help='export Football Manager avec les colonnes UID et Nom')
    ap.add_argument('--type', choices=TYPES, help='joueurs (visages), logos ou maillots ; deviné depuis le dossier sinon')
    ap.add_argument('--essai', action='store_true', help='affiche les correspondances sans rien importer')
    ap.add_argument('--retirer', action='store_true', help='retire toutes les images manuelles du type donné')
    a = ap.parse_args()
    con = connexion()
    res = images.Ressources(connexion, None)
    if a.retirer:
        if not a.type:
            raise SystemExit('--retirer demande --type')
        typ = TYPES[a.type]
        ids = [r[0] for r in con.execute("SELECT id FROM images WHERE type=? AND statut='manuel'", (typ,))]
        for i in ids:
            res.retirer_manuel(con, typ, i)
        con.commit()
        return print(f'{len(ids)} image(s) retirée(s).')
    if not a.pack or not a.liste:
        ap.error('--pack et --liste sont nécessaires')
    t = a.type or ('maillots' if re.search(r'kit|maillot', a.pack, re.I) else 'logos' if re.search(r'logo|badge|club', a.pack, re.I) else 'joueurs')
    typ = TYPES[t]
    pack, liste = fichiers_pack(a.pack, typ), lire_liste(a.liste)
    print(f'Pack : {len(pack)} image(s) ; liste FM : {len(liste)} ligne(s) ; type : {t}')
    if typ == 'joueur':
        idx = defaultdict(list)
        for i, nom, ddn in con.execute('SELECT id, nom_norm, naissance FROM joueurs'):
            idx[nom].append((i, (ddn or '')[:4]))
    else:
        idx = defaultdict(list)
        for i, nom in con.execute('SELECT id, nom_norm FROM clubs'):
            idx[nom].append((i, None))
    ok = sans_image = sans_match = ambigus = 0
    for r in liste:
        f = pack.get(r['uid'])
        if not f:
            sans_image += 1
            continue
        cand = idx.get(normaliser(r['nom']), [])
        if r['an'] and typ == 'joueur':
            cand = [c for c in cand if not c[1] or c[1] == r['an']] or []
        if not cand:
            sans_match += 1
            continue
        if len(cand) > 1:
            ambigus += 1
            continue
        if a.essai:
            print(f"  {r['nom']} (UID {r['uid']}) -> {cand[0][0]} : {f.name}")
        else:
            try:
                res.ajouter_manuel(con, typ, cand[0][0], f.read_bytes())
            except ValueError as e:
                print(f'  ignoré {f.name} : {e}')
                continue
        ok += 1
    con.commit()
    print(f"{'Correspondances' if a.essai else 'Images importées'} : {ok} · sans image dans le pack : {sans_image} · "
          f'sans correspondance dans la base : {sans_match} · homonymes ignorés : {ambigus}')
    print(f'Dossier des images : {CACHE_IMAGES}')


if __name__ == '__main__':
    main()
