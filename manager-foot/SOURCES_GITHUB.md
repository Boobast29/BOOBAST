# Revue des 23 dépôts GitHub transmis

Revue du 2 novembre 2026. Les liens répétés ont été dédupliqués. Les README ont été examinés pour 22 dépôts ; pour le projet Raphaël Alcala, seule l’arborescence contenant un PDF a été examinée. Une référence examinée ne signifie pas que son code ou ses données ont été intégrés.

| Dépôt | Contenu utile | Usage réel dans ce complément | Licence / réserve |
|---|---|---|---|
| [ZOXEXIVO/open-football](https://github.com/ZOXEXIVO/open-football) | Simulation du monde, clubs, transferts et finances. | Référence pour les futurs besoins des clubs IA ; aucun moteur Rust incorporé. | Apache-2.0 ; vérifier séparément les données. |
| [eddwebster/football_analytics](https://github.com/eddwebster/football_analytics) | Catalogue de méthodes et ressources analytiques. | Référence pour les indicateurs et leur documentation. | Vérifier chaque ressource avant copie. |
| [FantasyFootballAnalytics/FantasyFootballAnalyticsR](https://github.com/FantasyFootballAnalytics/FantasyFootballAnalyticsR) | Analyses de fantasy NFL : quarterbacks, receveurs, running backs. | Écarté des imports joueurs : football américain. Aucun environnement R ajouté. | Aucune copie. |
| [jakeyk11/football-data-analytics](https://github.com/jakeyk11/football-data-analytics) | Analyses, graphiques et traitements Python. | Inspiration méthodologique : minutes couvertes, rapports ciblés ; aucun modèle copié. | Vérifier licence et données avant reprise supplémentaire. |
| [xgabora/Club-Football-Match-Data](https://github.com/xgabora/Club-Football-Match-Data) | Résultats historiques agrégés ; sources football-data.co.uk et ClubElo. | Référence de calibration ; pas une base de portraits ou d’effectifs actuels. | Droits des sources à vérifier. |
| [withqwerty/football-docs](https://github.com/withqwerty/football-docs) | Documentation de fournisseurs et de schémas. | Référence de normalisation ; ce dépôt ne constitue pas lui-même une base joueurs. | Vérifier la licence du fournisseur retenu. |
| [LeandreGachet/reseaux-transferts-football](https://github.com/LeandreGachet/reseaux-transferts-football) | Analyse des réseaux de transferts. | Piste pour relations entre clubs et marchés ; aucun réseau calculé dans ce complément. | À vérifier avant copie. |
| [raphaelalcala/Projet-Determinants-de-la-valeur-marchande-des-joueurs-de-football](https://github.com/raphaelalcala/Projet-Determinants-de-la-valeur-marchande-des-joueurs-de-football) | Arborescence consultée : rapport PDF, aucun code exécutable identifié. | Référence documentaire potentielle ; contenu du PDF non évalué ici. | Aucune copie. |
| [ArijBattikh/Footbar_Data_Scientist](https://github.com/ArijBattikh/Footbar_Data_Scientist) | Reconnaissance d’actions à partir de données de capteurs. | Non intégré : le jeu ne dispose pas de ces mesures. | À vérifier avant reprise. |
| [GK-FOMI/Datalake-Football-Project](https://github.com/GK-FOMI/Datalake-Football-Project) | Architecture de collecte et d’analyse : Airflow, Spark, Elasticsearch. | Référence de traçabilité ; maintien de SQLite et du fonctionnement hors ligne. | À vérifier avant copie. |
| [MO7KUN/Football-Player-Market-Value-Prediction](https://github.com/MO7KUN/Football-Player-Market-Value-Prediction) | Étude de prédiction de valeur marchande avec séparation temporelle. | Référence pour une estimation future et son incertitude ; aucun modèle entraîné intégré. | Code et données à vérifier séparément. |
| [flora-francx/recrutement-football-jeunes-attaquants](https://github.com/flora-francx/recrutement-football-jeunes-attaquants) | Projet de sélection de jeunes attaquants, nettoyage et tableaux de bord. | Référence pour filtres de recrutement ; aucun moteur Power BI imposé. | À vérifier avant copie. |
| [openfootball/europe](https://github.com/openfootball/europe) | Archives européennes de compétitions. | 29 archives françaises déjà présentes dans le pack v11 sont conservées. | CC0 pour le projet ; conserver la provenance. |
| [felipeall/transfermarkt-api](https://github.com/felipeall/transfermarkt-api) | Adaptateur API vers Transfermarkt. | Non requis en partie ; aucun accès tiers automatique ajouté. | MIT pour le code ne vaut pas licence des données. |
| [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) | Instantanés historiques joueurs, matchs et valeurs. | Source datée ; collecte annoncée en pause en juillet 2026, pas une confirmation des effectifs 2026/27. | Vérifier les conditions des données avant redistribution. |
| [JaseZiv/worldfootballR](https://github.com/JaseZiv/worldfootballR) | Collecte et analyse multi-source en R. | Référence ; dépôt archivé, aucune dépendance R ajoutée. | Droits des fournisseurs distincts du code. |
| [roboflow/sports](https://github.com/roboflow/sports) | Géométrie du terrain et outils d’analyse vidéo. | CODE ADAPTÉ : sommets/arêtes du terrain portés en JS et utilisés dans la carte des tirs. Aucun modèle vidéo. | MIT ; source et licence conservées dans third_party. |
| [google-research/football](https://github.com/google-research/football) | Environnement de recherche et apprentissage par renforcement. | Non intégré : moteur Python/C++ distinct, dépôt archivé en août 2026. | Vérifier les composants séparément avant reprise. |
| [withqwerty/reep](https://github.com/withqwerty/reep) | Correspondances d’identités entre sources. | Identifiants et instantané du pack conservés ; pas de migration automatique vers Reep v1. | Conditions des données à distinguer de celles des outils. |
| [manrajgrover/football-cli](https://github.com/manrajgrover/football-cli) | Consultation de résultats et classements en terminal. | Référence d’organisation ; aucune clé API ou dépendance Node nécessaire au jeu. | MIT pour le code ; données tierces distinctes. |
| [openfootball/football.json](https://github.com/openfootball/football.json) | Calendriers et résultats au format JSON. | Source candidate pour imports historiques ; aucune nouvelle collecte JSON incluse ici. | CC0. |
| [jokecamp/FootballData](https://github.com/jokecamp/FootballData) | Catalogue hétérogène de CSV et JSON historiques. | Référence ; pas de mélange automatique de vieux effectifs avec les parties actuelles. | Conditions variables selon le sous-ensemble. |
| [probberechts/soccerdata](https://github.com/probberechts/soccerdata) | Adaptateurs Python par fournisseur et cache local. | Référence pour les connecteurs ; aucun scraper ou environnement pandas imposé. | Apache-2.0 pour le code ; droits fournisseurs distincts. |

## Priorités retenues

1. **Livré** : import local complet du pack existant, audit des identifiants et images, installateur ZIP/dossier, écran de statistiques lisible, terrain de la carte des tirs et référentiel documentaire des règles.
2. **À développer ensuite** : cellule de recrutement pilotable, rapports datés sur plusieurs matchs et incertitude liée à l’observateur ; utiliser les projets analytiques comme méthodes, puis valider sur les données disponibles.
3. **À développer ensuite** : clubs IA recrutant selon postes vacants, masse salariale et échéances ; s’inspirer de la simulation de ZOXEXIVO sans remplacer le moteur actuel.
4. **À développer ensuite** : évaluations évolutives distinguant niveau simulé et note source, vieillissement, temps de jeu et blessures ; aucune réécriture silencieuse des notes historiques.
5. **À développer ensuite** : marché des directeurs sportifs et offres d’emploi selon bilan, réputation et profil du club.

Le code de Roboflow est la reprise de code effective de ce complément, au commit `42c80c06b6b65a7f89455b89fe31cdf4c38ba227`. Les sources originales et la licence MIT sont fournies. Les autres dépôts ne sont pas ajoutés en bloc : leurs langages, données et conditions diffèrent. Les 436 020 fiches et les portraits proviennent du pack Football Monde existant, dont l’import complet a été testé ; ils ne sont pas attribués à ces 23 dépôts indistinctement.

Le référentiel officiel des compétitions repose sur les organismes compétents, et non sur ces dépôts. Il distingue les règles documentées, les champs en attente et les adaptations du moteur.
