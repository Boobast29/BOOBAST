"""Visages générés par IA pour les joueurs sans photo.

    python outils/generer_visages_ia.py --essai                         # liste les joueurs concernés et les consignes, sans rien générer
    python outils/generer_visages_ia.py --moteur local                  # Stable Diffusion sur ton PC (AUTOMATIC1111 / Forge lancé avec --api)
    python outils/generer_visages_ia.py --moteur deepinfra --cle CLE    # service en ligne DeepInfra (payant, FLUX schnell), ou variable DEEPINFRA_API_KEY
    python outils/generer_visages_ia.py --pays France --max 300         # joueurs des championnats d'un pays, les mieux notés d'abord
    python outils/generer_visages_ia.py --retirer                       # supprime tous les visages générés

Les portraits représentent des personnes fictives : la consigne ne contient jamais le nom du joueur (on ne cherche pas à
imiter son vrai visage), seulement l'âge, la nationalité et la tenue. Ils sont enregistrés comme images ajoutées
(table images, statut « manuel ») et repérés dans la table images_ia : le jeu les marque « Visage généré par IA ».
Une vraie photo (pack, Wikimedia) reste toujours prioritaire : un joueur qui a déjà une image n'est pas traité.
"""
import argparse
import base64
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commun  # noqa: E402
import images  # noqa: E402

SCHEMA = 'CREATE TABLE IF NOT EXISTS images_ia(id TEXT PRIMARY KEY, moteur TEXT, consigne TEXT, graine INTEGER, maj TEXT)'
NEGATIF = 'text, watermark, logo, signature, cartoon, drawing, deformed, extra fingers, blurry, celebrity likeness'


def consigne(j):
    age = j['age'] or 25
    nat = j['nat'] or 'international'
    return (f'professional studio headshot portrait of a fictional {age}-year-old male football player from {nat}, '
            f'plain dark training top, neutral grey background, soft studio light, sharp focus, photorealistic, head and shoulders, looking at camera')


def graine(ident):
    return int(hashlib.sha1(str(ident).encode()).hexdigest()[:8], 16) % 2_000_000_000


def age_de(naissance):
    try:
        y, m, d = (int(x) for x in naissance[:10].split('-'))
        t = datetime.date(2026, 7, 1)
        return t.year - y - ((t.month, t.day) < (m, d))
    except Exception:
        return None


def candidats(con, pays=None, maxi=200):
    """Joueurs sans aucune image (ni pack, ni Wikimedia, ni téléchargement), les mieux notés d'abord."""
    sql = ("SELECT j.id, j.nom, j.naissance, j.nat, j.niveau99 FROM joueurs j "
           "WHERE j.photo_local IS NULL AND j.photo_url IS NULL "
           "AND NOT EXISTS (SELECT 1 FROM images i WHERE i.type='joueur' AND i.id=j.id AND i.statut IN ('manuel','telecharge')) ")
    args = []
    if pays:
        sql += ("AND j.club_id IN (SELECT s.club_id FROM inscriptions s JOIN competitions c ON c.id = s.competition_id WHERE c.pays=?) ")
        args.append(pays)
    sql += 'ORDER BY coalesce(j.niveau99, 0) DESC, j.id LIMIT ?'
    args.append(maxi)
    return [{**dict(r), 'age': age_de(r['naissance'])} for r in con.execute(sql, args)]


def _post(url, corps, entetes, delai=180):
    req = urllib.request.Request(url, data=json.dumps(corps).encode(), headers={'Content-Type': 'application/json', **entetes}, method='POST')
    with urllib.request.urlopen(req, timeout=delai) as r:
        return json.loads(r.read().decode())


def generer_local(texte, g, url):
    r = _post(url.rstrip('/') + '/sdapi/v1/txt2img', {'prompt': texte, 'negative_prompt': NEGATIF, 'seed': g, 'steps': 24,
                                                     'width': 384, 'height': 384, 'cfg_scale': 6.5, 'sampler_name': 'DPM++ 2M'}, {})
    return base64.b64decode(r['images'][0].split(',', 1)[-1])


def generer_deepinfra(texte, g, cle, url='https://api.deepinfra.com/v1/openai/images/generations'):
    r = _post(url, {'model': 'black-forest-labs/FLUX-1-schnell', 'prompt': texte, 'size': '384x384', 'n': 1, 'response_format': 'b64_json', 'seed': g},
              {'Authorization': f'Bearer {cle}'})
    return base64.b64decode(r['data'][0]['b64_json'])


def executer(con, moteur, pays=None, maxi=200, url='http://127.0.0.1:7860', cle=None, essai=False, generateur=None):
    con.execute(SCHEMA)
    res = images.Ressources(lambda: con, None)
    liste = candidats(con, pays, maxi)
    faits, erreurs = 0, 0
    for k, j in enumerate(liste):
        texte, g = consigne(j), graine(j['id'])
        if essai:
            print(f"{j['nom']} ({j['age']} ans, {j['nat']}) -> {texte}")
            continue
        try:
            if generateur:
                data = generateur(texte, g)
            elif moteur == 'deepinfra':
                data = generer_deepinfra(texte, g, cle)
            else:
                data = generer_local(texte, g, url)
            res.ajouter_manuel(con, 'joueur', j['id'], data)
            with con:
                con.execute('INSERT OR REPLACE INTO images_ia VALUES (?,?,?,?,?)', (j['id'], moteur, texte, g, datetime.datetime.now().isoformat(timespec='seconds')))
            faits += 1
        except Exception as e:  # une erreur n'arrête pas la série ; trois de suite : on s'arrête (service absent, clé refusée…)
            erreurs += 1
            print(f"  {j['nom']} : {str(e)[:120]}", flush=True)
            if erreurs >= 3 and faits == 0:
                print('Trois échecs de suite : vérifie que le générateur est lancé (option --api) ou que la clé est valide.')
                break
        if (k + 1) % 10 == 0:
            print(f'  {k + 1}/{len(liste)}', flush=True)
    return {'candidats': len(liste), 'generes': faits, 'erreurs': erreurs}


def retirer(con):
    con.execute(SCHEMA)
    res = images.Ressources(lambda: con, None)
    ids = [r[0] for r in con.execute('SELECT id FROM images_ia')]
    for i in ids:
        res.retirer_manuel(con, 'joueur', i)
    with con:
        con.execute('DELETE FROM images_ia')
    return len(ids)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--moteur', choices=['local', 'deepinfra'], default='local')
    ap.add_argument('--url', default='http://127.0.0.1:7860', help='adresse du générateur local (AUTOMATIC1111 / Forge)')
    ap.add_argument('--cle', default=os.environ.get('DEEPINFRA_API_KEY'), help='clé DeepInfra (ou variable DEEPINFRA_API_KEY)')
    ap.add_argument('--pays', help='seulement les joueurs des championnats de ce pays (ex. France)')
    ap.add_argument('--max', type=int, default=200)
    ap.add_argument('--essai', action='store_true', help='affiche les consignes sans générer')
    ap.add_argument('--retirer', action='store_true', help='supprime tous les visages générés')
    a = ap.parse_args()
    con = commun.connexion()
    if a.retirer:
        print(f'{retirer(con)} visage(s) généré(s) retiré(s).')
        return
    if a.moteur == 'deepinfra' and not a.cle and not a.essai:
        sys.exit('Clé DeepInfra manquante : --cle CLE ou variable DEEPINFRA_API_KEY.')
    t0 = time.perf_counter()
    print(executer(con, a.moteur, a.pays, a.max, a.url, a.cle, a.essai), f'({time.perf_counter() - t0:.0f} s)')


if __name__ == '__main__':
    main()
