# Manager Foot

Jeu de gestion de club de football, original, qui tourne dans le navigateur.
Pas d'installation, pas besoin d'internet.

## Jouer

1. Télécharge le dossier `manager-foot` (ou tout le dépôt).
2. Double-clique sur `index.html`. Le jeu s'ouvre dans Chrome, Edge ou Firefox.

La partie se sauvegarde automatiquement dans le navigateur (IndexedDB).
Menu **Options** → « Exporter la sauvegarde » pour garder un fichier ou changer de PC.

Raccourcis : `Espace` = continuer · `1`…`9` = menus · `/` = recherche · `Échap` = fermer · `Espace` en match = pause.

## Contenu

- **2 divisions de 20 clubs** avec montées et descentes, plus une **coupe** à élimination directe (prolongations, tirs au but).
- **Coupe d'Europe** : les 4 premiers du championnat et 12 clubs étrangers. Phase de groupes, puis quarts, demies et finale, avec de grosses primes.
- **Staff** (adjoint, entraîneur technique, kiné, recruteur, formateur) et **infrastructures** (centre d'entraînement, académie, agrandissement du stade).
- **Recrutement réaliste** : les joueurs que tu ne connais pas ont une note estimée (~) et un potentiel inconnu. Envoie ton recruteur pour obtenir un rapport.
- **Prêts** de jeunes joueurs pour les faire progresser.
- **Joueurs qui ont du caractère** : demandes de transfert, stars courtisées par de grands clubs.
- **Journal** : séries, crises, buteurs en forme, rumeurs de mercato.
- **Ambiance sonore** du stade (foule, sifflet, but) et **conseils de l'adjoint** pendant le match.
- **Vacances** : ton adjoint dirige l'équipe pendant plusieurs semaines.
- **Moteur de match action par action** (environ 900 actions par match) :
  - passes courtes, vers l'avant, longues, en profondeur, dribbles, centres, duels aériens, tirs ;
  - chaque action oppose le porteur au défenseur le plus proche, selon leurs attributs, leurs positions, le pressing, la fatigue et la météo ;
  - xG calculé selon la distance et l'angle du tir, hors-jeu, contre-attaques, fautes situées sur le terrain (coup franc direct ou penalty) ;
  - notes des joueurs calculées à partir de leurs actions réelles ;
  - calibrage : environ 2,7 buts, 25 tirs, 77 % de passes réussies, 21 fautes, 3 cartons par match, 44 % de victoires à domicile, 22 % de nuls ;
  - aucune consigne tactique ne domine.
- **Analyse d'après-match** : carte des tirs, courbe des xG, statistiques d'équipe, statistiques détaillées de chaque joueur (passes, passes clés, dribbles, tacles, récupérations, arrêts).
- **Statistiques de saison** par joueur (minutes, xG, % de passes, actions par 90 minutes).
- **Match en direct** avec **vue 2D animée** (le ballon suit les vraies passes du moteur) et commentaires. Au programme :
  - xG, penaltys, coups francs, corners, contres, VAR ;
  - cartons, blessures, fatigue en temps réel ;
  - 5 changements, causerie à la mi-temps ;
  - consignes modifiables pendant le match.
- **Tactique** : 10 formations, mentalité et glisser-déposer des joueurs. Consignes d'équipe (pressing, tempo, largeur, ligne défensive, style de passe) qui agissent vraiment sur le moteur. Tireurs de penaltys et de coups francs, capitaine.
- **Entraînement** : programme de la semaine, intensité, cohésion du groupe, réunions d'équipe.
- **Vie du vestiaire** : personnalités, moral, forme, discussions individuelles et promesses de temps de jeu.
- **Président** : objectifs, jauge de confiance. Tu peux être licencié ou recevoir des offres d'autres clubs.
- **Mercato** : négociation en 2 temps (indemnité puis salaire), contre-offres, liste de suivi, offres reçues avec contre-proposition, agents libres.
- **Économie propre à chaque championnat** : droits TV (50 % égalitaire, 25 % notoriété, 25 % classement), prix des billets, niveau des salaires et des sponsors. La D1 est riche, la D2 fauchée. Les pays étrangers sont plus ou moins riches (Angleterre > Espagne > … > Serbie). Tout est réglable dans l'éditeur.
- **Finances** :
  - recettes : billetterie (prix réglable, affluence selon forme/adversaire/météo), merchandising, sponsors ;
  - dépenses : staff, installations, déplacements, commissions d'agents ;
  - budget transferts et plafond salarial fixés par le président (répartition ajustable) ;
  - choix du sponsor maillot (sécurité / équilibre / ambition) ;
  - dette avec intérêts, « parachute » pour les relégués, contrôle de gestion (interdiction de recruter si déficit).
- **Blessures réalistes** :
  - 20 types (contusion, entorse, élongation, déchirure, ménisque, ligaments croisés, fractures, pubalgie, virus…) avec des durées en jours ;
  - risque individuel : fatigue, âge, fragilité cachée, pressing adverse, météo, intensité d'entraînement ;
  - rechutes, convalescence, reprise anticipée par infiltration, séquelles après une longue blessure ;
  - **Infirmerie** et **centre médical**.
- **Météo** (soleil, canicule, pluie, orage, vent, froid, neige) : effets sur la fatigue, les fautes, les frappes, les centres, les blessures et l'affluence. Pluie et neige visibles en 2D.
- **Saisons enchaînées** : progression et vieillissement des joueurs, retraites, centre de formation.
- **Récompenses** : joueur du mois, joueur de l'année, espoir, meilleur buteur, équipe type, armoire à trophées.

## Mettre tes propres clubs, joueurs, logos et photos

Le jeu ne contient aucune donnée réelle : les droits d'image des joueurs, les logos (marques déposées) et les bases de stats appartiennent à leurs propriétaires.
L'**éditeur** te permet d'y mettre ce que tu veux, pour ton usage perso.

- **Éditeur** (écran d'accueil → « Éditer la base », ou menu ✏ en jeu) : renomme les clubs, joueurs et championnats, change les couleurs, notes, postes, âges…
- **Logo / photo depuis ton PC** : bouton « depuis le PC » sur chaque club ou joueur.
- **Photos et logos en masse** : nomme les images comme le joueur (`Prénom Nom.jpg`) ou le club (`Nom du club.png`), puis sélectionne-les toutes d'un coup.
- **Fichier JSON** : « Exporter (JSON) » → modifie-le → « Importer (JSON) ».

Exemple minimal de fichier JSON :

```json
{
  "leagueNames": ["Ma Ligue 1", "Ma Ligue 2"],
  "cupName": "Ma Coupe",
  "clubs": [
    { "name": "Mon Club", "short": "MCL", "div": 1, "colors": ["#003366", "#ffffff"], "rep": 80,
      "stadium": "Stade X", "capacity": 40000, "logo": "https://…/logo.png",
      "players": [ { "name": "Jean Dupont", "num": 9, "age": 24, "nat": "FRA", "pos": "BU", "ovr": 82, "photo": "https://…/photo.jpg" } ] }
  ]
}
```

- Postes : `GB, DC, DG, DD, MDC, MC, MOC, AG, AD, BU`.
- Attributs de 1 à 20 (`fin, pas, dri, tec, tac, vit, phy, men, gar`), ou seulement `"ovr"` de 1 à 100.
- Il faut au moins 4 clubs. Les effectifs incomplets sont complétés automatiquement.
