# Huit dépôts généralistes utiles à Manager Foot

Revue du 2 novembre 2026. Sélection fondée sur les README, licences et arborescences des dépôts. Le code index.ts de Microdiff et les modules de tableau de Tabulator ont également été examinés. Aucun des huit projets n’est ajouté au moteur par ce lot documentaire. Les résultats sont des candidats d’intégration, pas des fonctionnalités déjà livrées.

| Priorité | Dépôt | Licence vérifiée | Application au jeu |
|---|---|---|---|
| 1 | [AsyncBanana/microdiff](https://github.com/AsyncBanana/microdiff) | MIT | Historique réversible de l’éditeur |
| 2 | [lucaong/minisearch](https://github.com/lucaong/minisearch) | MIT | Recherche locale tolérante aux fautes |
| 3 | [tabulator-tables/tabulator](https://github.com/tabulator-tables/tabulator) | MIT | Tableaux de recrutement et statistiques personnalisables |
| 4 | [ajv-validator/ajv](https://github.com/ajv-validator/ajv) | MIT | Validation des imports et des formats de sauvegarde |
| 5 | [leeoniya/uPlot](https://github.com/leeoniya/uPlot) | MIT | Courbes d’évolution lisibles |
| 6 | [statelyai/xstate](https://github.com/statelyai/xstate) | MIT | Négociations aux transitions contrôlées |
| 7 | [graphology/graphology](https://github.com/graphology/graphology) | MIT | Réseau explicable du vestiaire |
| 8 | [dexie/Dexie.js](https://github.com/dexie/Dexie.js) | Apache-2.0 | Sauvegardes navigateur transactionnelles |

## 1. Historique réversible de l’éditeur

**Ce que le joueur pourra faire.** Calculer les différences avant/après sur une fiche joueur, club ou compétition, puis construire Annuler/Rétablir et un journal lisible.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Microdiff calcule des différences ; il faut développer leur application inverse, les limites mémoire et la politique de persistance. Historique par entité et ID stable, pas un instantané du monde à chaque frappe.

**Vérification.** Modifier un salaire, un nom et une photo, annuler les trois puis les rétablir ; conserver les IDs ; une nouvelle édition après Annuler invalide la branche Rétablir.

## 2. Recherche locale tolérante aux fautes

**Ce que le joueur pourra faire.** Indexer les joueurs et clubs de la partie, les membres du staff et les écrans pour améliorer Ctrl+K : préfixes, accents normalisés et recherche approchée.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Garder les 436 020 identités du pack dans la recherche SQLite paginée. Ne pas les charger toutes au démarrage dans un index navigateur.

**Vérification.** Retrouver Mbappé avec Mbape, privilégier une correspondance exacte, proposer le bon club homonyme et actualiser l’index après transfert ou renommage.

## 3. Tableaux de recrutement et statistiques personnalisables

**Ce que le joueur pourra faire.** Choisir, déplacer et figer des colonnes ; trier et filtrer les cibles par poste, coût et fraîcheur ; conserver des vues comme Jeunes, Libres et Fin de contrat.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Prototype sur une seule table d’abord. Conserver les valeurs Inconnu et les règles de brouillard, les colonnes de source et les minutes couvertes. Mesurer le poids du bundle local.

**Vérification.** Créer une vue avec âge, poste, salaire et dernière observation, la retrouver après rechargement, exporter les lignes filtrées et tester le défilement sur mobile.

## 4. Validation des imports et des formats de sauvegarde

**Ce que le joueur pourra faire.** Définir des schémas versionnés pour joueurs, clubs, règlements et données importées ; présenter les erreurs avec leur chemin avant toute modification de la base.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Ajouter les contrôles métier que JSON Schema ne garantit pas seul : identifiants uniques par propriété, références entre tables, cohérence des dates et intégrité SQLite. Évaluer un validateur précompilé pour le navigateur.

**Vérification.** Un salaire négatif ou une saison mal formée bloque le lot sans import partiel ; une note null reste inconnue ; une donnée valide conserve sa source et sa date.

## 5. Courbes d’évolution lisibles

**Ce que le joueur pourra faire.** Comparer niveau observé, minutes, salaire et trésorerie sur plusieurs saisons avec légende, curseur et zoom ; distinguer les échelles et les données manquantes.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Utiliser des échantillons enregistrés et leurs dates. Les unités /99, minutes et euros restent sur des axes distincts ou des graphiques séparés. Copier les assets localement.

**Vérification.** Zoomer sur une saison et identifier la valeur à une date précise ; un trou historique ne devient pas une mesure inventée ; les moyennes ne mélangent pas source réelle et partie.

## 6. Négociations aux transitions contrôlées

**Ce que le joueur pourra faire.** Prototyper un flux de transfert avec états explicites offre, contre-offre, accord, agent, médical, signature, refus et expiration ; définir les événements et gardes autorisés.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Commencer par un flux isolé et des tests de transition. Ne pas remplacer d’un coup les états déjà enregistrés ; prévoir la migration et le lien au RNG sauvegardé.

**Vérification.** Un dossier expiré ne signe jamais, un double clic ne débite pas deux fois, un rechargement au médical reprend au même état sans relancer le hasard.

## 7. Réseau explicable du vestiaire

**Ce que le joueur pourra faire.** Représenter les joueurs comme nœuds et les liens réellement simulés comme arêtes : parrainage, automatismes, conflit et langue partagée ; afficher les groupes reliés au meneur.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Les métriques de graphe ne prouvent pas un leadership psychologique. Séparer données observées et hypothèses de simulation, puis calibrer toute conséquence sur le moral.

**Vérification.** Un départ retire le nœud sans supprimer les souvenirs historiques ; un parrainage crée le lien prévu ; une langue inconnue ne crée aucune affinité automatique.

## 8. Sauvegardes navigateur transactionnelles

**Ce que le joueur pourra faire.** Évaluer une couche IndexedDB pour versions de sauvegarde, migrations et regroupement atomique des écritures, avec une liste claire des sauvegardes et secours.

**Consigne d’implémentation.** Intégrer ce composant sur un périmètre isolé du jeu, sans modifier les autres fonctions déjà livrées. Le serveur Python et SQLite restent responsables de la base joueurs. Dexie vise les données navigateur ; aucun service cloud n’est nécessaire. Une migration du stockage existant doit être testée avant activation.

**Vérification.** Une interruption n’écrit pas une demi-sauvegarde ; une migration conserve la version antérieure ; les anciennes parties restent chargeables et les erreurs de quota sont affichées.

## Ordre de réalisation proposé

D’abord l’historique d’édition et la recherche locale. Ensuite un prototype de tableau sur la cellule de recrutement et des schémas d’import. Les courbes viennent quand les historiques ont un échantillonnage fiable. Le remplacement d’un flux de négociation et une migration des sauvegardes sont des chantiers distincts, à valider sur des copies de parties.

## Compatibilité et provenance

Les exemples des dépôts utilisent parfois npm ou un CDN. Pour ce jeu hors ligne, préparer les fichiers nécessaires à l’avance, les versionner localement avec leurs licences et vérifier le lancement sans réseau. Aucun compte ou service cloud ne doit devenir nécessaire pour jouer.

Ne pas ajouter toutes les bibliothèques à index.html dès maintenant : chaque intégration doit justifier son poids, ses effets sur les parties et ses tests. Les droits sur le code sont distincts des données, photos et logos du pack. Les licences copyleft restent incluses dans la recherche générale ; la présente sélection n’a pas été filtrée pour exclure ces licences.

Traçabilité machine : donnees_reference/sources_generalistes.json (références, empreintes des README et licences, état non intégré). L’ancien chemin olifolkerd/tabulator redirige : la référence canonique vérifiée est tabulator-tables/tabulator. JavaScript-Undo-Manager a aussi été examiné au niveau métadonnées, mais son dépôt archivé n’est pas retenu ici ; Microdiff est une brique de comparaison pour construire l’historique, pas un gestionnaire Annuler/Rétablir prêt à brancher.

