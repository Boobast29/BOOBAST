# Monde étendu FM26

Depuis l’accueil : **Monde : clubs et championnats** → consulter un pays → **Préparer la carrière · tous les pays** → choisir un club.

Le pack comprend 355 clubs, 18 compétitions, 18 589 joueurs affectés sans ambiguïté, dont 1 018 avec attributs détaillés documentés, et 12 324 fiches de staff. Il reprend le catalogue FMB déjà versionné et l’enrichit avec les fiches FMInside récupérées. Tous les pays et les 18 championnats/groupes sont chargés dans une même carrière. Le club choisi détermine le pays utilisant le moteur complet ; les autres championnats et coupes avancent en simulation rapide. Leurs classements et historiques sont conservés dans la sauvegarde. Les promotions sont simplifiées (trois places au maximum, réparties entre groupes), sans barrages, et ne changent jamais le pays d’un club. Les matchs rapides ne produisent pas les statistiques individuelles détaillées d’un match complet. Le menu en partie **Tous les pays** affiche les classements étrangers.

Les noms et affectations viennent des instantanés Football Manager, sans vérification de la situation actuelle. Une partie des effectifs source est incomplète (notamment National : 17 clubs référencés ; trois liens de réserves italiennes renvoient au club parent de D1 et sont exclus des divisions inférieures faute d’identifiant distinct). Les attributs détaillés documentés sont conservés ; pour les autres joueurs, les qualités sont estimées à partir du niveau global source, ou d’une valeur de simulation si ce niveau est inconnu. Chaque joueur porte `dataQuality` (`documented_attributes`, `estimated_attributes`, `generated_filler`). Les budgets, installations, personnalités et données absentes utilisent les règles de simulation du moteur. La nationalité inconnue est `UNK`. Les jeunes/réserves sont rattachés au club parent, sans compétition de jeunes séparée.

Le staff est conservé dans `club.staffReference` comme référence documentaire ; les fonctions du staff de la carrière ne sont pas automatiquement remplacées. Les logos restent des liens externes. Les salaires connus FMInside restent hebdomadaires dans le moteur et sont affichés au mois ; les salaires en livres du pack FMB ne sont pas transformés en euros arbitrairement. Les dates de contrat source sont conservées comme métadonnées ; les durées jouables suivent encore le moteur.

Le bouton **Joueurs FMInside → Intégrer aux nouvelles carrières** fusionne les profils par UID FM, puis à défaut par nom exact et club reconnu. Il ignore les homonymes ambigus et n’ajoute un nouveau joueur que dans un club reconnu. Il ne déplace pas un joueur déjà identifié par UID vers un autre club. Le monde courant des nouvelles carrières est remplacé lors de la préparation du monde multi-pays ; les sauvegardes de parties existantes sont distinctes.

Reconstruction depuis la racine `manager-foot` :

```sh
python outils/importer_fminside.py --pages 30 --sortie packs/fminside-fm26.json
python outils/construire_base_mondiale.py
node tests/integration_fminside_node.js
```

`--pages 0` continue la découverte tant que le site renvoie de nouvelles fiches ; ce n’est pas une garantie d’exhaustivité. Les fiches déjà collectées sont réutilisées. Les erreurs et la couverture partielle figurent dans le JSON. Les archives nationales sont compressées en gzip pour limiter le téléchargement.

Premier complément publié : 600 profils FMInside FM26 avec 36 attributs chacun, dont une partie concerne des clubs hors des 18 compétitions ou ne correspond pas aux affectations sources retenues. Le nombre de joueurs détaillés dans les bases nationales combinées est de 536, toutes sources confondues. Les tentatives suivantes ont rencontré des délais de connexion.

Dans le monde multi-pays, les joueurs de nationalité inconnue ne sont pas arbitrairement comptés comme non-UE pour bloquer les transferts. Leur statut réglementaire réel reste inconnu.

Le complément FMInside est chargé depuis `packs/fminside-fm26.json.gz` et appliqué par UID aux bases nationales au chargement. Cela permet de publier de nouveaux attributs sans retransmettre toutes les bases de pays.

Correctif fourni : FMScout FM27 v261031, deux fichiers LNC analysés sans exécuter le programme batch. Correspondances par UID exact : 314 clubs et 18 compétitions. Les anciens noms de clubs et la version du correctif sont conservés dans les métadonnées ; ce pack ne fournit aucun attribut joueur.

Mise à jour suivante : 1 282 profils FMInside validés (au moins 36 attributs chacun), sans erreur de collecte sur la reprise. Le total dans les pays jouables est de 1 018 profils documentés : Angleterre 350, France 91, Allemagne 142, Italie 185, Espagne 250. `packs/couverture-attributs.json` contient l’audit reproductible.

Le catalogue se parcourt par pages de 50 résultats. Dans une partie multi-pays : **Tous les pays → Actualiser les attributs documentés** propose une mise à jour par UID, après confirmation. La progression accumulée est conservée sous forme d’écart à la base initiale, avec bornage des notes. Âge, club, contrats, salaires et statistiques de carrière restent ceux de la sauvegarde. Les qualités initiales documentées, estimées ou fictives sont signalées sur la fiche joueur.

Le moteur historique qui regroupait toutes les divisions étrangères d’un pays est désactivé pour les carrières multi-pays, pour éviter deux simulations concurrentes. Le mercato permet de filtrer une compétition étrangère précise. Les nouvelles écritures de points de reprise JSON et gzip sont atomiques. L’importateur accepte les deux structures HTML FMInside observées, y compris les cellules `profile-stat-value`, et conserve le poste naturel lorsqu’il est indiqué.

Contrôles : `node tests/monde_etendu_node.js`, `node tests/sources_joueurs_node.js`, `node tests/integration_fminside_node.js`, `python outils/auditer_couverture_fmi.py`. L’installation du navigateur de test a échoué dans l’environnement ; les contrôles portent sur les fonctions du moteur et la syntaxe des scripts, sans validation visuelle complète.

Lot ciblé sur la base du jeu : 1 200 nouvelles fiches validées, toutes rattachées par UID aux effectifs connus, pour 343 clubs enrichis et les 18 compétitions couvertes. Totaux : 2 482 profils FMInside dans le répertoire, 2 218 joueurs avec attributs documentés dans les pays jouables. Le rapport de couverture contient le détail du ciblage ; aucun joueur extérieur n’a été ajouté lors de ce lot.

Pour poursuivre uniquement sur les clubs du jeu :

```sh
python outils/enrichir_effectifs.py --limite 1200
```

Pour cibler tous les joueurs encore non documentés, réserves comprises :

```sh
python outils/enrichir_effectifs.py --tout
```

Sous Windows, `Completer_Attributs_Des_Clubs.bat` lance ce dernier mode avec Python et curl disponibles. Les fiches déjà récupérées sont réutilisées. Le téléchargement peut être long ; une relance reprend les cibles manquantes. Le script contrôle les identifiants et les valeurs, actualise les compteurs puis prépare les fichiers du jeu. Les profils indisponibles ou incomplets restent signalés, sans notes inventées. La publication en petites parties vérifiées facilite les compléments successifs ; l’ancien fichier gzip reste lisible.

Joueurs libres : premier lot de 150 profils explicitement identifiés par le filtre « Free transfers / No contract » de FMInside en version FM26. Un club vide ne suffit jamais à déclarer un joueur libre. Le statut correspond à l’instantané FM26 de la source, sans vérification en temps réel. Le catalogue indique ce statut ; les nouvelles carrières multi-pays ajoutent ces joueurs au marché des agents libres, après dédoublonnage par UID. Les profils déjà rattachés à un club dans la base ou dans une carrière restent sous contrat dans ce club. Les exigences salariales des agents libres sont estimées pour la simulation, et leur recrutement passe par les négociations habituelles.

Dans une carrière existante, **Tous les pays → Actualiser les attributs documentés** propose aussi l’ajout des agents libres manquants. Les signatures déjà réalisées, les salaires et les contrats de la carrière sont conservés.

Collecte dédiée : `python outils/enrichir_effectifs.py --libres-seulement --pages-libres 3` ; mettre `0` pour toutes les pages. `Completer_Joueurs_Libres.bat` lance ce mode complet sous Windows. `--libres` ajoute un lot de joueurs libres à la collecte habituelle des effectifs. Les pages sont filtrées sur le statut explicite « Free Agent » et la source FM26.

La mise à jour d’une carrière écrit dans son emplacement de sauvegarde actif et conserve une copie avant modification. Les anciens profils homonymes sans UID empêchent un ajout ambigu de joueur libre, sans modification de leur contrat.

### Enrichissement Transfermarkt, 3 novembre 2026
1 942 profils rapprochés par nom normalisé et date de naissance exacte et unique.
Export CC0 `dcaribou/transfermarkt-datasets`, arrêté au 6 juillet 2026 :
biographie, taille, nationalité, agent, valeurs historiques, statistiques par saison
(compétitions couvertes seulement, jusqu'au 28 juin), dix derniers transferts passés.
Les retours de prêt annoncés après la date de l'export sont exclus.
Ces champs restent distincts des statistiques et valeurs de simulation.
Rui Patrício et Rafinha sont exclus des nouvelles recrues libres (retraités),
Sergio Ramos est éligible selon sa fiche Transfermarkt sans club depuis janvier 2026.
Toby Alderweireld est également marqué retraité. Ces quatre statuts proviennent
des profils publics indexés : fraîcheur du cache inconnue. Le site direct impose
une vérification humaine ; la liste entière n'a donc pas été vérifiée en direct.
Les autres libres conservent le statut d'instantané FM26 non vérifié actuellement.
Les carrières existantes peuvent charger les biographies avec « Actualiser les
attributs documentés » ; aucun joueur déjà présent n'est supprimé ou libéré.
Reproduction : `python outils/enrichir_fiches_transfermarkt.py DOSSIER_CSV_GZ`,
puis `python outils/auditer_couverture_fmi.py`.

### Complément FMB en ligne
Le catalogue charge désormais `fmblog-fm26.manifest.json` en complément de
FMInside. Chaque partie compressée est vérifiée (taille et SHA-256), puis les
fiches sont fusionnées par UID ; FMInside garde la priorité lorsqu'un UID existe
dans les deux catalogues. Les versions restent distinctes : FMInside 26.2.0 et
FMB FM26 26.3.2. Aucun calcul de moyenne entre versions.

Les attributs FMB sont des scores indépendants calculés sur 99, adaptés à
l'échelle de simulation par le convertisseur existant, et non les notes brutes
originales de Football Manager. Les treize indicateurs composites FMB sont
conservés séparément et affichés comme tels dans la fiche. Source et modèle sont
visibles dans « Joueurs documentés ». Les salaires FMB affichés en livres et
abrégés restent du texte source ; ils ne remplacent pas les salaires en euros du
jeu. Aucun contrat réel actuel n'est déduit de ces fiches.

La collecte cible les joueurs sans attributs détaillés des effectifs existants,
priorité aux premières équipes, répartis entre les cinq pays et les 18 ligues.
Chaque URL canonique doit confirmer l'UID FM26 attendu ; une fiche doit présenter
au moins 30 attributs publics entre 1 et 99. L'audit vérifie que chaque UID
correspond au club cible déjà présent dans le jeu. Les compteurs du lot figurent
dans `packs/couverture-attributs.json` (`fmBlogProfiles`, `documentedProfiles`).

Pour ajouter un lot : `Completer_Attributs_FMBlog.bat`, ou
`python outils/importer_fmblog.py --limite 1000 --workers 4`, puis
`python outils/auditer_couverture_fmi.py`. La reprise relit le manifeste compressé
versionné, sans nécessiter le JSON de travail. Les échecs restent dans le journal
du complément et ne créent pas de faux profils. Les biographies et indicateurs
peuvent être ajoutés aux carrières existantes par la mise à jour documentaire,
sans effacer progression, statistiques, contrats ou transferts de la partie.

Autres sources examinées : Footyshoe (instantané de carrière daté du 7 juillet
2025) et SquadCompass (26.2.0, même date de carrière). Leurs contrats ne sont pas
utilisés comme preuve d'un statut réel actuel. FMPlayer répondait 503 lors de
l'essai ; aucune donnée de ce site n'a été ajoutée.
