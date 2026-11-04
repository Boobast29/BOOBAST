# Compétences détaillées et langues

Complément à la v24 de Claude et aux changements d’interface de la proposition nº 10. Les modules existants cellule de recrutement et carrière de directeur sportif sont conservés.

## Compétences et moyennes

41 critères /20, dont 36 hors gardien et 5 propres aux gardiens. La fiche contient les moyennes de neuf familles, la moyenne pondérée par poste, les poids, les trois points forts et trois axes de travail parmi les critères utiles au poste. Les informations non observées restent masquées.

Les 34 dimensions détaillées EA sont désormais transportées dans les scénarios, au lieu de perdre leur finesse après conversion dans neuf familles. Chaque note source /99 est conservée puis convertie /20. Les sept qualités mentales supplémentaires sont simulées ; un détail absent est estimé depuis son attribut de famille et explicitement marqué « Simulation ». Ce ne sont pas 41 mesures réelles indépendantes pour tous les joueurs.

Le niveau durable utilise la moyenne des familles existantes, corrigée de 50 % de l’écart à la moyenne détaillée pondérée. La correction est bornée à ±5 /99 pour limiter les ruptures de calibration. Les dimensions utiles et leurs poids changent selon le poste ; le jeu aérien distingue notamment les défenseurs centraux et les avant-centres. Le moteur d’actions utilise les moyennes détaillées des familles avec une correction bornée à ±1 /20.

La forme récente utilise la médiane de huit matchs au maximum, joués sur les huit dernières semaines de la saison. Son effet sur l’efficacité est borné à ±3 %, puis réduit selon la taille de l’échantillon n/(n+5). La condition et le moral restent traités une seule fois par le moteur existant. L’âge ne donne pas un bonus arbitraire au niveau : il intervient dans le développement existant.

Les détails suivent les variations des familles avec une base de référence conservée en sauvegarde. Le suivi observé conserve au plus 36 points, un par période de quatre semaines. Les notes source ne sont jamais réécrites. Une ancienne sauvegarde peut charger, joueur par joueur dans son propre effectif, les détails de sa fiche source depuis la fiche de profil.

## Langues

Niveaux 0–3 : débutant, élémentaire, autonome, courant. Une personne réelle sans donnée linguistique reste inconnue : aucune langue déduite de sa nationalité et aucun malus pour absence de données. Les profils fictifs utilisent des hypothèses linguistiques explicitement de simulation.

Un cours coûte 350 € par semaine, avec un débit unique par joueur/semaine, et fait gagner 0,08 niveau, +0,02 à 22 ans ou moins, +0,02 avec un parrain partageant une langue autonome. Il s’arrête automatiquement à 3/3, même si l’intégration sociale était déjà complète. Le niveau appris est de simulation et sauvegardé. Les cours sont pilotables depuis le profil et l’écran d’intégration existant.

La communication dans la langue du club agit de −3 % à 0 % sur l’efficacité, jamais sur le talent permanent. Un parrain partageant une langue autonome compense 0,5 niveau. Le parrainage accélère davantage l’intégration quand une langue est réellement partagée dans le modèle. Deux langues inconnues ne créent plus un bonus d’automatismes ou de groupe. Les relations déjà construites restent conservées.

## Vérification

Tests navigateur : pondérations des dix postes, effet d’un critère aérien à neuf attributs identiques, source manquante, progression, forme séparée du talent, lecture sans mutation ni RNG, facturation hebdomadaire, apprentissage, arrêt, historique, sauvegarde et brouillard. Test réel : scénario français avec 3 464 joueurs réels, dont 3 245 disposant d’au moins 30 détails source ; exemple Illia Zabarnyi, 34 dimensions. L’exemple est un instantané du pack, pas une vérification de son club actuel. Voir les rapports JSON dans tests.

La calibration compare les mêmes paramètres initiaux et la même graine sur un championnat synthétique pour chaque modèle ; avec récupération hebdomadaire : 380 matchs par modèle, 2,50 buts/match avant et 2,47 après sur cette graine. Ce contrôle ne remplace pas une validation multi-saisons et multi-graines. Les caches de calcul sont en mémoire et se reconstruisent au rechargement.

## Liste des 41 critères

- Centres
- Finition
- Précision de la tête
- Passes courtes
- Reprises de volée
- Dribble
- Effet de balle
- Précision des coups francs
- Passes longues
- Contrôle de balle
- Accélération
- Vitesse de sprint
- Agilité
- Réactivité
- Équilibre
- Puissance de frappe
- Détente
- Endurance
- Force
- Tirs lointains
- Agressivité
- Interceptions
- Placement offensif
- Vision
- Penalties
- Sang-froid
- Placement défensif
- Tacles debout
- Tacles glissés
- Plongeons du gardien
- Prises de balle
- Jeu au pied du gardien
- Placement du gardien
- Réflexes du gardien
- Décisions
- Anticipation
- Concentration
- Jeu collectif
- Détermination
- Leadership
- Discipline
