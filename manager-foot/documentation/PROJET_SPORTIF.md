# Renforcement du projet sportif

Cette évolution complète la cellule, les rapports, la carrière et le plan d'effectif existants.

- Projet sportif : nouvel écran dans Outils, accès cellule, carrière et plan d'effectif, commande de trois observations et journal des qualités modifiées.
- Suivis : jusqu'à cinq observations via l'API interne, trois via l'écran. Chaque observation consomme le budget ; les suivantes attendent trois semaines. Un manque de budget reporte le travail. Aucun analyste ne peut être envoyé observer un joueur.
- Progression ordinaire : le facteur de temps de jeu s'applique à tous les professionnels (0,4 à 1,15), et non seulement aux joueurs prêtés. Une blessure active annule la chance de progression ordinaire. L'académie conserve son système spécifique. Le déclin avec l'âge reste actif.
- Journal : variations des qualités du moteur, saison et semaine, contexte d'âge, blessure et entraînement, minutes depuis le précédent bilan. Le premier bilan indique que le suivi des minutes était absent. Les compétences détaillées continuent de dériver des qualités du moteur ; les données source restent intactes. Maximum 120 entrées par joueur du club, sans courrier supplémentaire.
- IA : les postes prioritaires dépendent aussi de la profondeur de l'effectif. Un remplaçant peut être recruté sans dépasser le niveau du meilleur titulaire. Huit semaines de salaires sont réservées en trésorerie avant un achat ; l'enveloppe saisonnière et le plafond salarial existants restent applicables. Les libres ont une indemnité nulle dans le filtrage des candidats.

Vérification : `node manager-foot/tests/projet_sportif.cjs` et `node --check` des scripts modifiés. Scénarios exécutant les vraies fonctions : profondeur des postes, joueur utilisé contre remplaçant, blessure, trois observations, épuisement du budget et sérialisation du journal. Contrôle visuel et simulation complète de dix saisons non effectués. Le jeu ne prétend pas encore disposer d'une progression indépendante pour chacun des 37 attributs, d'un apprentissage actif des langues ou d'une intégration complète des 436 020 identités dans les carrières.
