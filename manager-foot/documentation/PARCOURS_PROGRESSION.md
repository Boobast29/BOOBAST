# Onze parcours de progression individuels

Accès dans la fiche Profil d’un joueur professionnel du club : « Parcours de progression individuel ». Onze objectifs sont disponibles selon le poste : ailier explosif, finisseur, attaquant pivot, organisateur, gros volume de jeu, défenseur relanceur, défenseur solide, latéral complet, gardien sur sa ligne, gardien relanceur et leader de jeu.

## Règles

Quatre suivis actifs au maximum. Le joueur doit appartenir au club, avoir moins de 31 ans, ne pas être en académie ni en prêt entrant. Chaque parcours conserve le niveau de départ de quatre compétences et vise jusqu’à +1/20 par compétence, avec plafond à 20. Les valeurs de départ et les progrès sont sauvegardés. Les jalons sont 34 %, 67 % et 100 %.

La famille de compétence la moins avancée reçoit le focus individuel existant, qui est réévalué lors de la mise à jour hebdomadaire. Aucun attribut n’est augmenté directement par le module : les probabilités, limites et mécanismes du développement existant restent responsables des gains et baisses. Pas de bonus multiplicatif, pas de récompense de niveau et pas de potentiel révélé automatiquement. Un objectif ne garantit ni un gain ni une date d’achèvement.

Un focus modifié manuellement suspend le pilotage. Un départ du club le suspend également. Une suspension libère une place. Arrêter le parcours restitue le focus précédent lorsque le parcours le pilotait encore ; une modification manuelle est conservée. Démarrer un nouveau suivi remet ses objectifs de départ à jour et remplace l’ancien suivi.

L’achèvement est annoncé une seule fois, puis le focus précédent est restauré. Le bilan reste visible jusqu’à son archivage. Les compétences détaillées suivent leurs familles d’attributs : quatre cibles ne sont donc pas nécessairement quatre mécanismes indépendants.

## Source adaptée

Juannx2376/pitchside-manager, packages/core/src/growthPlans.ts, commit 0bfa7f56eabe446ce1c95d0a3c6864407244e0d4. Licence MIT et source originales dans third_party/pitchside-manager. Adaptation des postes et attributs au moteur et aux 41 compétences de Manager Foot. Objectif réduit de +4 sur l’échelle du projet à +1/20 ici. Aucun environnement React, TypeScript ou Node nécessaire pour jouer.

## Validation

Rapport dans tests/parcours_report.json ; script tools/test-parcours.js. Les contrôles portent sur la capacité, le poste, l’âge, les objectifs et jalons, l’absence de gains gratuits ou de hasard à l’ouverture, le focus manuel, la restauration du focus, l’achèvement unique, la sauvegarde et les actions de profil sur ordinateur et mobile. Les tests ne constituent pas une validation multi-saisons du rythme de progression.
