"""Contrôle reproductible des homonymes du pack mondial.

Un nom et une date de naissance communs ne prouvent pas une identité commune.
Le rapport distingue les identités corroborées par un identifiant source partagé
des rapprochements qui exigent encore une vérification humaine.
"""
import csv
import json
from collections import defaultdict

from commun import BASE, DOSSIER_JEU_DONNEES, connexion


def analyser(con, sortie=DOSSIER_JEU_DONNEES):
    groupes = defaultdict(list)
    requete = '''SELECT j.id, j.nom, j.nom_norm, j.naissance, j.club_id, j.ea_id, j.tm_id
        FROM joueurs j JOIN (
          SELECT nom_norm, naissance FROM joueurs WHERE nom_norm <> '' AND naissance IS NOT NULL
          GROUP BY nom_norm, naissance HAVING count(*) > 1
        ) d ON d.nom_norm=j.nom_norm AND d.naissance=j.naissance
        ORDER BY j.nom_norm, j.naissance, j.id'''
    for row in con.execute(requete):
        groupes[(row['nom_norm'], row['naissance'])].append(dict(row))

    confirmes, ambigus = [], []
    for (nom, naissance), joueurs in groupes.items():
        ids = []
        for champ in ('ea_id', 'tm_id'):
            index = defaultdict(list)
            for j in joueurs:
                if j[champ]:
                    index[str(j[champ])].append(j)
            for source, membres in index.items():
                if len(membres) < 2:
                    continue
                autre = 'tm_id' if champ == 'ea_id' else 'ea_id'
                valeurs = {str(j[autre]) for j in membres if j[autre]}
                clubs = {j['club_id'] for j in membres if j['club_id']}
                if len(valeurs) <= 1 and len(clubs) <= 1:
                    ids.append({'source': champ, 'identifiant': source,
                                'joueurs': [j['id'] for j in membres]})
        entree = {'nom': joueurs[0]['nom'], 'naissance': naissance,
                  'ids': [j['id'] for j in joueurs], 'preuves': ids}
        (confirmes if ids else ambigus).append(entree)

    sortie.mkdir(parents=True, exist_ok=True)
    rapport = {'fiches': con.execute('SELECT count(*) FROM joueurs').fetchone()[0],
               'identifiants_internes_dupliques': con.execute('SELECT count(*)-count(DISTINCT id) FROM joueurs').fetchone()[0],
               'groupes_homonymes': len(groupes), 'groupes_corroborees': len(confirmes),
               'groupes_a_verifier': len(ambigus), 'fiches_supprimees': 0,
               'raison': 'Une collision de nom et date ne justifie pas une suppression automatique.',
               'groupes_corroborees_detail': confirmes}
    (sortie / 'rapport_doublons.json').write_text(json.dumps(rapport, ensure_ascii=False, indent=2), encoding='utf-8')
    with (sortie / 'doublons_a_verifier.csv').open('w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['nom', 'naissance', 'identifiants_joueurs'])
        writer.writerows((g['nom'], g['naissance'], ' | '.join(g['ids'])) for g in ambigus)
    return rapport


if __name__ == '__main__':
    if not BASE.is_file():
        raise SystemExit('Base mondiale absente. Lance Tout_Installer avant cet audit.')
    with connexion(lecture_seule=True) as db:
        resultat = analyser(db)
    print(json.dumps({k: v for k, v in resultat.items() if k != 'groupes_corroborees_detail'}, ensure_ascii=False, indent=2))
