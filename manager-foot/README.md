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
- **3 coupes d'Europe au format actuel** (36 clubs chacune) :
  - phase de ligue en 8 matchs ;
  - barrages (9e-24e), puis 8es, quarts et demies en aller-retour (cumul, prolongation, tirs au but), finale sur terrain neutre ;
  - qualification : 4 premiers du championnat, 5e et vainqueur de la coupe, 6e ;
  - grosses primes à chaque étape.
- **Supercoupes** nationale et européenne en début de saison.
- **109 clubs étrangers** répartis dans 19 pays, richesse selon le pays.
- **Football international** :
  - classement des sélections ;
  - 3 trêves par saison (sélections, buts, fatigue, blessures) ;
  - Mondial des nations (2030, 2034…) et Euro des nations (2028, 2032…), avec groupes, tableau final et meilleur buteur ;
  - Ballon d'or chaque saison.
- Noms des compétitions génériques par défaut, renommables dans l'éditeur.
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
- **Tactique avancée** :
  - placement libre des joueurs (le poste s'adapte à la zone du terrain) ;
  - rôle détaillé par joueur (Renard des surfaces, Pivot, Faux 9, Ailier intérieur, Latéral inversé, Meneur reculé…) et mission (Défense / Soutien / Attaque), avec de vrais effets dans le moteur ;
  - consignes supplémentaires : contre-pressing, piège du hors-jeu, gagner du temps ;
  - familiarité tactique : un nouveau système s'apprend ;
  - 3 tactiques enregistrables ;
  - plan de match avec marquage individuel ;
  - en direct : changement de dispositif, de mentalité, des missions et du marquage.
- **Gestion de l'effectif** : statut promis à chaque joueur (Joueur clé, Titulaire, Rotation, Remplaçant, Espoir) comparé à son temps de jeu réel, confiance envers l'entraîneur, repos, équipe réserve.
- **Bureau de direction** : missions confiées au staff, interventions auprès des joueurs et de l'entraîneur, vestiaire, presse et commission de ligue. Un briefing affiche le prochain adversaire, les absents, les joueurs à ménager et les missions en cours. Trois plans sportifs financés sur quatre semaines permettent de développer un jeune ayant joué, de récupérer physiquement ou de renforcer le soutien des supporters ; leur bilan est conservé dans la sauvegarde. Comparaison de deux à quatre joueurs côte à côte.
- **Vestiaire** : hiérarchie et leaders, clans (langue, jeunes), ambiance, moral qui se propage dans le groupe, automatismes entre coéquipiers (passes plus réussies), conflits à apaiser, liste des joueurs mécontents avec leurs raisons.
- **Mercato approfondi** :
  - clauses libératoires (pour toi comme pour l'IA) ;
  - paiement comptant ou échelonné sur 1 ou 2 ans, bonus après 25 matchs, % à la revente ;
  - échange de joueurs ;
  - statut promis et clause dans le contrat ;
  - prêts entrants avec part du salaire et option d'achat ;
  - surenchères et batailles entre clubs, dernier jour du mercato ;
  - historique des transferts et échéancier financier.
- **Développement individuel** : attribut à travailler, apprentissage d'un nouveau poste (polyvalence par poste), parrainage d'un jeune par un ancien (transmission de la personnalité).
- **Centre de formation** : promotion annuelle de 4 à 7 jeunes (pépites possibles), potentiel estimé selon le formateur, poste ciblé, promotion ou libération.
- **Missions de recrutement** : critères (poste, âge, potentiel) et zone (France, Europe, monde, libres). Les missions « monde » dénichent des pépites inconnues.
- **Carrière d'entraîneur** : réputation, bilan, 12 succès à débloquer, limogeages d'entraîneurs adverses et postes vacants auxquels postuler.
- **Président** : demandes de budget, de plafond salarial ou d'investissement dans les installations.
- **Supporters & médias** : humeur des supporters (influe sur l'affluence), discours d'avant-match, conférence de presse d'après-match.
- **Analyse** : tendances xG, classement xG de la ligue, comparaison de deux joueurs en radar.
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
