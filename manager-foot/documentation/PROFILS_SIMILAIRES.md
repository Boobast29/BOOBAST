# Recherche de remplaçants dans la cellule

Accès : Cellule de recrutement → Profils similaires, ou bouton « Chercher un remplaçant de ce profil » dans la fiche d’un joueur du club.

## Décision de gestion

Choisir un joueur de référence, privilégier le style de compétences ou la proximité des notes, limiter l’âge et l’ancienneté des observations, puis comparer le coût sur 1 à 5 ans. Filtrer les candidats compatibles avec l’indemnité et la masse salariale disponibles, engagements en cours déduits. Ouvrir la fiche, ajouter une cible ou demander une nouvelle observation. Aucune signature automatique.

La recherche porte sur les joueurs actifs, externes au club, au même poste, avec des estimations détaillées récentes. Elle ne scanne pas toutes les identités du pack en dehors de la simulation. Vingt résultats au maximum sont affichés, après classement des profils éligibles.

## Connaissance et incertitude

Les nouveaux rapports enregistrent 41 estimations /20 et une marge d’erreur. Cette observation est datée et conservée avec le recruteur ; elle n’est jamais recalculée à l’ouverture. Un changement ultérieur des véritables capacités du joueur ne change donc pas le classement avant une nouvelle observation. Les anciens rapports sans détail ne sont pas reconstruits à partir de la vérité cachée. Une dimension utile manquante exclut le candidat plutôt que de transformer l’inconnu en zéro.

Le joueur de référence du club utilise son profil actuel. Pour les candidats, la recherche lit uniquement le dernier rapport : compétences estimées, indemnité estimée, salaire estimé, date et auteur. Elle ne lit ni le potentiel réel ni les capacités actuelles cachées pour calculer la proximité. Une ancienne sauvegarde reste utilisable ; il faut demander de nouveaux rapports pour remplir la recherche.

## Méthode

Adaptation du calcul hybride de ScoutEngine (Oscar López Andreu, MIT) et de cosine de mljs/distance (MIT). Originaux et licences conservés sous third_party ; références exactes dans SOURCES_GITHUB.md. Aucun modèle entraîné n’est chargé.

Les critères utiles reçoivent les poids du poste. Le style correspond au cosinus des vecteurs centrés sur leur moyenne pondérée, remis sur 0–1. La proximité des notes est 1 moins la distance euclidienne pondérée, normalisée sur l’amplitude /20. Le mode mixte utilise 55 % de style et 45 % de proximité des notes. Les profils plats sont traités explicitement, sans division par zéro. Les scores reposent sur une échelle fixe et ne changent pas lorsque le seul filtre de budget change.

Cet indice exprime une proximité interne, pas un pourcentage de réussite ni une preuve de performance professionnelle. La marge affichée vient du rapport ; ce n’est pas un intervalle de confiance statistique du score.

Le coût de planification = indemnité + salaire mensuel × 12 × durée. Les commissions, primes, charges et recettes de revente restent inconnues à cette étape et sont exclues. La compatibilité budgétaire ne garantit ni l’accord du vendeur, ni celui du joueur, ni la visite médicale, ni l’inscription réglementaire.

## Vérification

Le script tools/test-profils-similaires.js vérifie les cas de vecteurs, le classement, le coût, l’absence de lecture des capacités cachées, l’absence de mutation/RNG, les profils incomplets, les rapports périmés, les budgets, la sauvegarde, les nouveaux rapports et les actions d’interface. Le rapport se trouve dans tests/profils_similaires_report.json.
