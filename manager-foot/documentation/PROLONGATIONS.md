# Préparation des prolongations et cohérence de la masse salariale

Ajout dans Finances : « Préparer les prolongations ». La liste des joueurs appartenant au club est triée par contrat restant puis âge. Elle indique le salaire intégral et la part actuellement payée, y compris pour les joueurs prêtés ailleurs.

La négociation existante affiche désormais, avant envoi :

- masse salariale actuelle ;
- contribution de l'ancien salaire retirée ;
- contribution du nouveau salaire ajoutée ;
- masse salariale projetée et salaires réservés dans les négociations au stade médical ;
- marge sous le plafond, variation annualisée et trésorerie après prime ;
- base de planification du salaire intégral sur la durée choisie, plus la prime ;
- médiane salariale des autres joueurs professionnels au même poste, et ratio de la proposition à cette médiane.

Une offre au moins 30 % supérieure à cette médiane affiche un signal de hiérarchie salariale. Ce signal est informatif ; il ne crée pas un nouveau système parallèle de mécontentement. Les mécanismes déjà présents de demandes de revalorisation restent actifs.

## Correction comptable

Les finances hebdomadaires débitaient déjà la part résiduelle payée par le propriétaire d'un joueur prêté ailleurs. L'ancienne fonction wageBill utilisée par les contrôles de budget ne comptait que les joueurs actuellement au club. Elle compte maintenant les mêmes contributions que la paie : salaire intégral des joueurs du club, part des prêts entrants et part résiduelle des prêts sortants. Ces montants ne sont pas débités une seconde fois : seule la fonction de calcul du total change.

Pour une prolongation, la projection remplace la contribution actuelle par la nouvelle, en conservant les parts de prêts actuelles. Une prolongation au même salaire ne double donc pas la masse salariale. Un club emprunteur ne peut pas prolonger un contrat appartenant à l'autre club. Le parent peut préparer la prolongation de son joueur prêté.

Les salaires déjà réservés au stade médical sont inclus dans le contrôle du plafond avant envoi. Un refus budgétaire ne consomme pas la patience de l'agent. Les salaires négatifs, primes négatives, valeurs non finies et durées autres qu'un entier de 1 à 5 ans sont refusés. La signature et le débit de la prime restent gérés par la négociation existante, une seule fois.

## Limites de la projection

La base pluriannuelle est annualisée sur la durée choisie ; elle ne constitue pas un échéancier journalier jusqu'au 30 juin. Elle utilise le salaire intégral pour permettre la comparaison. Les parts des prêts peuvent changer à leur retour. Primes conditionnelles, commissions, charges et revenus futurs sont exclus. La compatibilité budgétaire ne garantit pas l'accord de l'agent ou du joueur. Le plafond existant reste appliqué strictement.

## Provenance et vérification

Implémentation originale pour Manager Foot ; aucun fichier GPL/LGPL/AGPL n'est copié dans ce module. La revue des contrats d'Openfoot Manager a servi à identifier les cas à examiner : remplacement de salaire, achat, prêt et propriétaire. Le calcul s'appuie sur les unités et fonctions du moteur existant.

Treize vérifications navigateur sont consignées dans tests/prolongations_report.json. Elles couvrent les parts de prêts, le renouvellement à salaire identique, les réservations, l'identité du propriétaire, les entrées invalides, la projection sans mutation/RNG, la signature réelle et son débit unique, l'accès depuis Finances et l'affichage à 390 pixels. Script : tools/test-prolongations.js ; Playwright requis pour les tests seulement.
