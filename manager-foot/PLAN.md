# Manager Foot — plan de réalisation (cahier « V13 → directeur sportif »)

Référence : le cahier en 17 sections (cellule de recrutement, carrière de directeur sportif, marché, plan d'effectif…).
État détaillé : `ETAT_PROJET.md`. Matrice : `FONCTIONNALITES.md`.

## Choix technique (conservé)
- Interface et moteur HTML/CSS/JavaScript sans dépendance ; serveur local Python (bibliothèque standard) + SQLite.
- Chaque lot est un module chargé après les précédents, qui **remplace** les fonctions existantes au lieu d'ajouter
  un système concurrent : `gestion.js` → `directeur.js` → `realisme.js` → `budget.js` → `cellule.js` → `fondations.js` → `carriere.js`.
- Déterminisme : générateur de partie à graine sauvegardée ; les écrans (marchés de candidats, agents, finances)
  utilisent un générateur annexe et **ne modifient pas le futur** (testé).

## Lots

| Lot | Contenu | État |
|---|---|---|
| 1 — Fondations | audit, version de schéma 14 + copie avant migration, invariants, simulation longue (`tests/longue.html`) | **fait** |
| 2 — Cellule de recrutement | personnel, organisation, budgets, missions, rapports, réunions, tableau de bord, IA adaptée | **fait** (voir limites) |
| 3 — Carrière de directeur sportif | profil, contrat, réputation 6 dimensions, postes vacants, entretiens, offres, fuites, mobilité, licenciement, chômage | **fait** (voir limites) |
| 4 — Marché et planification | IA (formation/prêt/achat/attente, enveloppe réservée), réservations, coût total, primes, demandes comparables, vente active, plan d'effectif | **fait** (voir limites) |
| 5 — Vie du club | engagements négociables du coach, réunion de projet, succession du capitaine, intégration, prêts détaillés, identité du club | **fait** (voir limites) |
| 6 — Économie et finition | scénarios financiers, investissements détaillés, supporters/sponsors, visite médicale approfondie, règlements versionnés, éditeur réversible, délégation générale, bilan hebdomadaire, « Mes décisions » | à faire |

## Prochaines tâches, dans l'ordre
1. **« Mes décisions »** : contexte au moment du choix, échéance, bilans à 6 et 12 mois, pertinence jugée séparément du résultat.
2. Bilan hebdomadaire regroupé, échéances et conséquences du silence pour les décisions non bloquantes.
3. ~~Règlements versionnés par compétition~~ (fait en v17, `js/reglements.js`) ; reste : éditeur réversible.
4. ~~Barrages et play-offs jouables~~ (fait en v18).
5. Import local de transfermarkt-datasets (CC0) — voir RECHERCHE.md.
