# Manager Foot

Jeu de gestion d'équipe de football (original, inspiré du genre « football manager »),
qui tourne dans le navigateur, sans installation ni connexion internet.

## Jouer

1. Télécharge le dossier `manager-foot` (ou tout le dépôt).
2. Double-clique sur `index.html` → le jeu s'ouvre dans Chrome / Edge / Firefox.

La partie est sauvegardée automatiquement dans le navigateur après chaque match.
Menu **Options** → « Exporter la sauvegarde » pour garder un fichier.

## Contenu

- 20 clubs fictifs, ~540 joueurs générés (attributs 1-20, potentiel, âge, nationalité, contrat).
- **Effectif** : notes, condition, moral, stats de saison, fiche joueur détaillée.
- **Tactique** : 7 formations, mentalité, composition par clic sur le terrain, banc de 9.
- **Match en direct** : commentaires minute par minute, stats, 5 changements, mentalité en cours de match, blessures, cartons.
- **Calendrier / classement** aller-retour 38 journées, buteurs, passeurs, meilleures notes.
- **Mercato** (été J1-5, hiver J20-22) : offres, négociation salaire, agents libres, offres reçues, liste des transferts.
- **Finances** : billetterie, droits TV, salaires.
- **Saisons enchaînées** : vieillissement, progression, retraites, centre de formation, objectifs du président.

## Mettre tes propres données (vrais joueurs, photos, logos)

Le jeu n'embarque aucune donnée réelle (droits d'image des joueurs, logos de clubs déposés,
bases de stats propriétaires). Mais tu peux importer ta propre base pour un usage perso :

1. Écran d'accueil → **Exporter la base (modèle)** → fichier `base-ligue.json`.
2. Modifie-le : noms des clubs/joueurs, `photo` et `logo` (URL d'image ou image `data:`),
   attributs 1-20 (`fin, pas, dri, tec, tac, vit, phy, men, gar`) **ou** juste `"ovr": 1-100`.
   Postes : `GB, DC, DG, DD, MDC, MC, MOC, AG, AD, BU`.
3. Écran d'accueil → **Importer une base (JSON)**, puis choisis ton club.

Exemple minimal :

```json
{
  "leagueName": "Ma Ligue",
  "clubs": [
    { "name": "Mon Club", "short": "MCL", "colors": ["#003366", "#ffffff"], "rep": 80,
      "stadium": "Stade X", "capacity": 40000, "logo": "https://…/logo.png",
      "players": [ { "name": "Jean Dupont", "age": 24, "nat": "FRA", "pos": "BU", "ovr": 82, "photo": "https://…/photo.jpg" } ] }
  ]
}
```

Les effectifs incomplets sont complétés automatiquement (min. 4 clubs).
