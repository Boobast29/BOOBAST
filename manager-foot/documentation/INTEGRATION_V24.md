# Interface et données : complément à la v23

Le jeu conserve les fonctions récentes du dépôt : centre « À faire », chronique, recherche Ctrl+K, tiroir mobile, carrière et moteur. Les nouveaux écrans statistiques présentent un indicateur à la fois, une recherche, un minimum de minutes, des vues effectif par thème, des valeurs par90minutes couvertes et un exportCSV limité aux filtres visibles. Les statistiques d'une partie ne sont pas mélangées aux historiques importés.

## Joueurs et photos

Placer Football_Monde_JSON_Visuels_v12.zip à côté de manager-foot ou dans Téléchargements, puis lancer Installer_Joueurs_Photos.bat. Python3.9+ requis. L'installateur extrait le pack local, importe toutes les fiches et tous les historiques disponibles, vérifie le compte du manifeste et les identifiants, et comptabilise les portraits/logos locaux. Ensuite lancer Lancer_Manager_Foot.bat et choisir un club réel.

L'import complet vérifié a produit 436 020 fiches uniques, 17 884 chemins de portraits locaux disponibles et 706 logos locaux disponibles. Les historiques contiennent88372performances,34561absences,105454transferts,69438valeurs,34834sélections et33059entrées d'années civiles. Ces comptes ne signifient pas que chaque joueur a toutes ces informations. Les contrats et salaires du jeu restent simulés ; les effectifs proviennent des snapshots datés, pas d'une vérification individuelle actuelle.

Les images et la base restent dans les fichiers de données locaux. Le pack complet est fourni séparément ; il n'est pas ajouté comme un gros ZIP dans GitHub. Aucun compte, clé API ou téléchargement automatique de sources tierces n'est imposé pendant une partie.

## Règlements

Le référentiel donne des règles sportives sourcées pour18groupes des niveaux1–3 deFrance/Angleterre/Allemagne/Espagne/Italie. La vérification documentaire ne certifie pas tous les domaines réglementaires. Deux champs anglais de départage des demi-finales restent explicitement en attente. Le moteur de la v23 conserve des adaptations, signalées dans l'écran Règlement : notamment le tableau Championship à4équipes, alors que la source2026/27 en prévoit6. Ce complément ne réécrit pas tous les barrages ni les classements des sauvegardes existantes.

## Code réutilisé

La géométrie par sommets/arêtes de sports/configs/soccer.py de Roboflow est portée en JavaScript pour le terrain de la carte des tirs. Source originale et licenceMIT conservées dans third_party/roboflow-sports. Dimensions adaptées à105×68m, surface16,5m, surface de but5,5m ; la carte conserve les événements et leurs infobulles. Aucune vision vidéo n'est ajoutée.

Les autres dépôts transmis sont recensés dans SOURCES_GITHUB.md : distinguer code adapté, données importées et références examinées. Une disponibilité publique ne fournit pas à elle seule les droits sur toutes les données sous-jacentes.

## Vérification

Import SQLite complet et contrôle des comptes du manifeste ; portraits locaux effectivement chargés dans le navigateur et création d’un scénario de club réel. Six contrôles de navigation, recherche, minutes couvertes, export CSV et carte des tirs ont passé, aux largeurs 390, 768, 1024 et 1440 pixels, sans erreur JavaScript. L’installateur refuse les traversées de chemin et évite de réextraire un pack déjà installé. Le ZIP a passé le contrôle CRC.

Une fermeture de la recherche pendant son délai de saisie ne doit plus déclencher de lecture sur des champs supprimés. La revue SOURCES_GITHUB.md recense les 23 dépôts distincts transmis, avec les reprises effectives et les pistes restant à développer. Les modules de cellule de recrutement et de carrière déjà présents dans la branche Claude sont conservés. Le complément suivant, documenté dans COMPETENCES_LANGUES.md, ajoute les compétences détaillées et les langues.
