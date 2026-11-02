# Dépôts GPL, LGPL et AGPL : revue élargie

Revue du 2 novembre 2026. Ces licences sont incluses dans la recherche à la demande de Bastien. Elles ne sont plus écartées par principe. Les fichiers cités ont été examinés, sauf pour soccer_ggplots où seuls le README, la licence et l’arborescence ont été examinés. Aucun code de ces cinq projets n’est copié ni chargé dans ce lot documentaire.

| Priorité | Dépôt | Licence constatée | Apport précis à étudier | État |
|---|---|---|---|---|
| 1 | [openfootmanager/openfootmanager](https://github.com/openfootmanager/openfootmanager) | GPL-3.0 (LICENSE.md) | Projection de renouvellement : retirer l’ancien salaire avant d’ajouter le nouveau ; traiter séparément prêt, achat et arrivée libre. | Examiné, code non intégré |
| 2 | [tstellar/bygfoot](https://github.com/tstellar/bygfoot) | GPL-2.0-or-later pour src/training.c | Stages de préparation avec arbitrage entre entraînement, repos, âge, condition et récupération ; adapter les unités et plafonds avant usage. | Examiné, code non intégré |
| 3 | [minj/foxtrick](https://github.com/minj/foxtrick) | GPL-3.0 (COPYING) | Séparer graphiquement niveau observé, estimation et potentiel connu chez les jeunes ; conserver les inconnus. | Examiné, code non intégré |
| 4 | [ihofmann/open-websoccer](https://github.com/ihofmann/open-websoccer) | LGPL-3.0-or-later pour SponsorsDataService.class.php | Comparer sponsors par revenu fixe et bonus conditionnels, avec critères d’éligibilité liés au classement. | Examiné, code non intégré |
| 5 | [Ryo-N7/soccer_ggplots](https://github.com/Ryo-N7/soccer_ggplots) | AGPL-3.0 (LICENSE) | Diagrammes d’âge et de temps de jeu pour repérer dépendance aux cadres, sous-utilisation et absence de succession. | Examiné, code non intégré |

## Lots concrets proposés

1. **Contrats et salaires** : afficher avant prolongation la masse salariale actuelle, le retrait de l'ancien engagement, l'ajout du nouveau, les engagements déjà réservés et la projection après signature. Vérifier qu'un renouvellement à salaire identique ne double jamais la masse salariale, et distinguer acquisition définitive et part salariale d'un prêt.
2. **Stages** : proposer une durée, une part de travail et une part de récupération, un coût par participant et les effets attendus sous forme de fourchettes. Un blessé suit un programme médical distinct. Vérifier l'absence de double progression avec l'entraînement hebdomadaire et le maintien des plafonds saisonniers.
3. **Jeunes et incertitude** : différencier les trois états dans une même ligne de compétence : observation, estimation et inconnu. N'afficher un plafond potentiel que s'il existe dans la connaissance du club. Vérifier que l'ouverture répétée de la fiche ne découvre aucune information et ne tire aucun nouveau hasard.
4. **Sponsors** : comparer la part garantie, la prime par résultat, les conditions d'éligibilité et la durée. Budgéter un scénario prudent sur le garanti et un scénario central avec hypothèses de résultats. Vérifier qu'une prime n'est versée qu'une fois lorsque son événement arrive.
5. **Âge et minutes** : placer chaque joueur du club sur un diagramme âge / part des minutes, avec poste et fin de contrat. Faire ressortir un cadre vieillissant sans successeur et un espoir sous-utilisé. Utiliser les minutes de la sauvegarde, pas des historiques réels mélangés à la saison simulée.

Ces lots sont des propositions d'adaptation à valider techniquement ; ils ne sont pas annoncés comme livrés par cette revue.

## Traitement des licences

Une licence copyleft autorise des réutilisations sous ses conditions. Elle n'est donc pas un motif de rejet automatique. Avant de reprendre un fichier, relever sa licence et ses en-têtes propres, les modifications, les dépendances, le mode d'assemblage et la façon dont le résultat sera distribué ou accessible. Le périmètre des obligations ne se déduit pas uniquement du fait que deux fichiers se trouvent dans le même dépôt.

- GPL : examiner notamment les conditions de distribution de la version modifiée et du travail combiné.
- LGPL : examiner les conditions applicables à la bibliothèque modifiée et à son assemblage avec l'application ; l'étiquette LGPL ne suffit pas à conclure qu'une copie interne est sans effet.
- AGPL : examiner aussi les dispositions concernant l'accès au code source pour les interactions par réseau avec une version modifiée.
- Code, données, portraits, logos et marques : vérifier séparément les droits correspondants. La licence du logiciel ne fournit pas automatiquement une autorisation sur les visuels ou les bases tiers.

Cette revue n'ajoute pas une licence globale au jeu. Elle ne transforme pas non plus une simple référence en reprise de code. Les textes des licences des projets restent les références à consulter avant chaque adaptation.

## Traçabilité

Le fichier donnees_reference/sources_copyleft.json contient les références examinées, les chemins et les empreintes des fichiers. Chaque statut est explicitement examined_not_copied. Les dépôts permissifs déjà adaptés (MIT/ISC) restent documentés dans SOURCES_GITHUB.md et leurs notices sont conservées.

