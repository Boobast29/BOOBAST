# Dépôts généralistes : deuxième sélection

Revue du 2 novembre 2026. Douze candidats supplémentaires et un projet en maintenance étudié à titre de comparaison. README et licences ont été consultés à des références précises. Aucun de ces projets n’est intégré par cette revue documentaire. Les bibliothèques de tests sont distinguées des composants susceptibles d’être chargés dans le jeu.

| Ordre | Dépôt | Licence constatée | Apport proposé |
|---|---|---|---|
| 1 | [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | MIT | Tests du moteur sur de nombreux scénarios |
| 2 | [mholt/PapaParse](https://github.com/mholt/PapaParse) | MIT | Import et export CSV robustes |
| 3 | [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | MPL-2.0 | Contrôle de l’accessibilité de l’interface |
| 4 | [101arrowz/fflate](https://github.com/101arrowz/fflate) | MIT | Sauvegardes et exports compressés |
| 5 | [MikeMcl/decimal.js](https://github.com/MikeMcl/decimal.js) | MIT | Calculs monétaires à arrondis maîtrisés |
| 6 | [TanStack/virtual](https://github.com/TanStack/virtual) | MIT | Grandes listes sans trop d’éléments affichés |
| 7 | [floating-ui/floating-ui](https://github.com/floating-ui/floating-ui) | MIT | Infobulles et menus mieux positionnés |
| 8 | [SortableJS/Sortable](https://github.com/SortableJS/Sortable) | MIT | Organisation tactile des listes |
| 9 | [cytoscape/cytoscape.js](https://github.com/cytoscape/cytoscape.js) | MIT | Carte interactive des relations du club |
| 10 | [jkbrzt/rrule](https://github.com/jkbrzt/rrule) | BSD à trois clauses ; notices rrule.js et python-dateutil | Échéances récurrentes de gestion |
| 11 | [rtfpessoa/diff2html](https://github.com/rtfpessoa/diff2html) | MIT | Comparaison visuelle d’exports avant/après |
| 12 | [germanbisurgi/jedison](https://github.com/germanbisurgi/jedison) | MIT | Formulaires structurés pour l’éditeur |
| 13 | [json-editor/json-editor](https://github.com/json-editor/json-editor) | MIT | Alternative de formulaires, à comparer |

## 1. Tests du moteur sur de nombreux scénarios

**Usage concret.** Générer des successions reproductibles de transferts, prêts, blessures et fins de saison ; vérifier les invariants après chaque action.

**Validation à demander.** Le journal rejoint la trésorerie, aucun joueur n’appartient à deux clubs, aucun double débit à la signature ; conserver graine et scénario minimal qui reproduisent une erreur.

**Périmètre et recoupements.** Outil de développement uniquement. Ne pas modifier le RNG des parties ni annoncer une simulation décennale validée avant de l’avoir exécutée.

## 2. Import et export CSV robustes

**Usage concret.** Importer une sélection de joueurs, membres du staff ou statistiques avec aperçu des colonnes, séparateur et correspondances.

**Validation à demander.** Un nom accentué avec guillemets et retours à la ligne est conservé ; un ID numérique long reste une chaîne ; une ligne invalide ne crée pas de joueur partiel.

**Périmètre et recoupements.** Conserver les IDs comme chaînes et les inconnus comme null, puis appliquer schémas et contrôles métier. Éviter la conversion numérique automatique de toutes les colonnes.

## 3. Contrôle de l’accessibilité de l’interface

**Usage concret.** Repérer les champs sans étiquette, les boutons sans nom, les défauts de contraste et certaines erreurs de structure sur les écrans existants.

**Validation à demander.** Ajouter un audit aux tests des profils, négociations et statistiques, puis vérifier manuellement le parcours clavier et le retour du focus après fermeture d’une fenêtre.

**Périmètre et recoupements.** Outil de test. Un audit sans erreur ne certifie pas toute l’accessibilité ; conserver la revue manuelle des éléments signalés comme incomplets.

## 4. Sauvegardes et exports compressés

**Usage concret.** Préparer un export ZIP contenant une partie, sa version de schéma et un manifeste ; permettre la réimportation après validation.

**Validation à demander.** Exporter une copie puis la recharger en conservant les IDs, les montants et l’état du RNG ; vérifier un ZIP tronqué sans écraser la partie active.

**Périmètre et recoupements.** Distinguer l’export d’une partie du gros pack Football Monde, qui conserve son installateur Python. Mesurer mémoire et taille décompressée ; prévoir les limites avant import.

## 5. Calculs monétaires à arrondis maîtrisés

**Usage concret.** Évaluer les calculs de commissions, pourcentages à la revente et échéanciers, avec une règle d’arrondi explicite.

**Validation à demander.** La somme des échéances égale exactement l’engagement initial, y compris quand il faut répartir un reste ; conversion mensuel/hebdomadaire documentée.

**Périmètre et recoupements.** Comparer d’abord avec des centimes entiers. Une bibliothèque décimale ne corrige pas une règle de conversion ou une double comptabilisation mal définie. Ne pas migrer les anciennes valeurs sans contrôle.

## 6. Grandes listes sans trop d’éléments affichés

**Usage concret.** Afficher la partie visible d’une longue liste de mails, rapports ou joueurs, en conservant sélection et défilement.

**Validation à demander.** Sur une liste de test de 10 000 lignes, vérifier le nombre limité de nœuds affichés, la navigation clavier, le retour à une sélection et le comportement à 390 pixels.

**Périmètre et recoupements.** Utiliser le cœur indépendant du framework. Recoupe la virtualisation de Tabulator : choisir une solution par écran, sans empiler les deux. Garder la pagination SQLite pour la base mondiale.

## 7. Infobulles et menus mieux positionnés

**Usage concret.** Expliquer une note estimée, un coût ou une condition de contrat dans un panneau ancré au bon champ qui reste visible.

**Validation à demander.** Vérifier les coins de fenêtre, le défilement, le zoom, l’ouverture au clavier et au toucher, et la fermeture par Échap.

**Périmètre et recoupements.** La version DOM convient au JavaScript existant. Le bon positionnement ne suffit pas à rendre une interaction accessible : ajouter noms, rôles et gestion du focus.

## 8. Organisation tactile des listes

**Usage concret.** Réordonner les priorités de recrutement et les missions, avec poignées de déplacement et sauvegarde de l’ordre.

**Validation à demander.** Un déplacement conserve les IDs et les filtres ; l’ordre persiste après rechargement ; des boutons Monter/Descendre permettent la même action au clavier.

**Périmètre et recoupements.** Le glisser-déposer ne doit pas signer un contrat ni modifier un attribut de joueur. Préciser si l’ordre agit sur la simulation ou seulement sur l’affichage.

## 9. Carte interactive des relations du club

**Usage concret.** Afficher les liens existants entre joueurs, parrains, groupes de langue et conflits, avec filtres et sélection d’un membre.

**Validation à demander.** Cliquer un lien explique son type et sa source ; une langue inconnue ne crée pas un lien fictif ; les événements du jeu, pas le dessin, modifient les relations.

**Périmètre et recoupements.** Recoupe Graphology pour le modèle de graphe. Choisir une architecture unique et garder la visualisation séparée des conséquences de gameplay. La branche examinée est unstable : choisir une release avant intégration.

## 10. Échéances récurrentes de gestion

**Usage concret.** Planifier des bilans mensuels, réunions, inspections et relances avec exclusions et date de fin.

**Validation à demander.** Tester une saison bissextile, une réunion reportée et un changement de saison ; aucun double événement après rechargement.

**Périmètre et recoupements.** Une récurrence ne valide ni le calendrier officiel ni une date de mercato. Utiliser une seule convention de dates, tester fuseaux et changements d’heure, conserver toutes les notices du fichier LICENCE.

## 11. Comparaison visuelle d’exports avant/après

**Usage concret.** Dans un écran avancé, comparer deux exports de base ou de règlements pour voir les changements avant remplacement.

**Validation à demander.** Une modification de salaire ou de règle ressort dans le bon fichier ; afficher un résumé métier et la source des deux versions.

**Périmètre et recoupements.** Attend un diff texte unifié ou Git, pas directement les objets de Microdiff. N’apporte pas à lui seul Annuler/Rétablir. Priorité secondaire pour l’interface destinée au joueur.

## 12. Formulaires structurés pour l’éditeur

**Usage concret.** Générer des formulaires de joueurs, clubs et règles à partir de schémas, avec champs conditionnels et validation.

**Validation à demander.** Afficher des libellés français, conserver les IDs immuables, distinguer null et zéro, puis vérifier les références métier avant enregistrement.

**Périmètre et recoupements.** À prototyper sur une fiche ; réutiliser les schémas plutôt que créer une seconde définition des règles. Aucun framework React n’est requis.

## 13. Alternative de formulaires, à comparer

**Usage concret.** Projet examiné pour les formulaires basés sur JSON Schema, puis placé derrière Jedison dans cette sélection.

**Validation à demander.** Avant toute reprise, tester la compatibilité du draft de schéma, les champs conditionnels et les données existantes.

**Périmètre et recoupements.** Le README déclare le projet en maintenance et renvoie vers Jedison pour les nouveaux projets. Garder comme comparaison, pas comme premier choix pour une nouvelle intégration.

## Combinaisons utiles sans doublons

- **Imports** : PapaParse pour lire les CSV ; Ajv pour les schémas déjà proposés ; contrôles d’intégrité du jeu pour les références et les transactions. Jedison peut rendre les formulaires, sans devenir un second modèle métier.
- **Éditeur** : Microdiff pour les changements structurés et leur historique ; diff2html seulement pour une comparaison avancée de fichiers texte.
- **Vestiaire** : Graphology et Cytoscape recouvrent une partie des besoins ; prototyper une seule représentation et mesurer ce qui doit être calculé, dessiné ou conservé en sauvegarde.
- **Listes** : Tabulator peut couvrir les tables ; TanStack Virtual peut servir sur une autre liste indépendante. Ne pas virtualiser deux fois le même écran.
- **Fiabilité** : fast-check pour générer des scénarios de tests et axe-core pour l’audit d’interface, sans les charger dans la partie normale.

## Prochain lot conseillé

Commencer par des tests d’invariants du moteur et un prototype d’import CSV avec aperçu. L’objectif est de fiabiliser les règles déjà ajoutées avant de multiplier les composants visuels. Étudier les exports compressés et les formulaires sur des copies de sauvegardes. Les versions distribuées doivent être embarquées localement, avec leurs notices, pour conserver le fonctionnement sans réseau.

Les références figurent dans donnees_reference/sources_generalistes_2.json. Cette sélection complète DEPOTS_GENERALISTES.md et ne remplace pas les choix de licences déjà acceptés pour le projet.

