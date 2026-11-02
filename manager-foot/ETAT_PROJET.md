# État du projet — v16 (2 novembre 2026)

## v16 — lot 5 (vie du club) : écrit, tests en cours
Nouveau fichier `js/vieclub.js` : demandes du coach négociables (accepter, alternative, différer, refuser avec motif), relation
en 4 axes (accord sportif, confiance, promesses, autorité), réunion de projet d'avant-saison (3 priorités max), influence progressive,
succession du capitaine, parrainage et cours de langue des recrues, suivi des promesses, réunions à effet décroissant, prêts détaillés
(rôle, concurrence, encadrement, part du salaire, rappel en hiver), bilan mensuel des prêts, identité durable du club.
Correction : le bonus automatique de progression des joueurs prêtés (+15 %) est remplacé par un effet des minutes réellement jouées.
**Non encore vérifié dans le navigateur** au moment de la publication : à tester avant de le considérer comme terminé.

## v15 — lot 4 (marché et planification)
Nouveau fichier `js/marche.js`. Réservation des sommes engagées, coût total des contrats (garanti / attendu / maximum, échéancier),
primes de but et de match enfin payées (une fois par événement), exigences selon les alternatives du joueur, statut non compensable
par l'argent, demandes de joueurs comparables, promesses de revalorisation suivies, vente active (sondage, intermédiaire, clubs,
prêt avec participation au salaire, baisse de prix), fin de l'acheteur automatique pour un joueur simplement listé, clubs IA qui
choisissent entre formation, prêt, achat et attente.
Vérifications : scénarios ciblés (voir FONCTIONNALITES.md), écrans neutres pour le futur, simulation 2 graines × 2 saisons sans erreur.
Limite : la promesse de revalorisation n'a pas été suivie sur une saison complète en test.

## v14 — lots 1, 2, 3 (+ plan d'effectif du lot 4)
Nouveaux fichiers : `js/cellule.js` (cellule de recrutement + IA adaptée), `js/fondations.js` (schéma, migrations, simulation
automatique, invariants), `js/carriere.js` (carrière du directeur sportif), `js/plan.js` (plan d'effectif), `tests/longue.html` + `tests/longue.js`.

### Vérifications exécutées (navigateur intégré, PC i5-10210U / 7,7 Go, monde fictif 40 clubs + 109 étrangers, ~3 500 joueurs)
- Simulation automatique **5 graines × 3 saisons** (réduite de 10 à 3 saisons à ta demande) : **0 erreur d'invariant, 0 plantage**,
  ~37 s par saison, 560 s au total. Fin de test (moyenne des 5 graines) : 3 825 joueurs, effectif moyen 24,1, âge 25,0, niveau 63,5,
  salaire moyen 119 900 €/mois, 12 transferts IA par saison, 210 joueurs sans club, 0 club en difficulté, sauvegarde ≈ 4,2 Mo,
  cellule de 2 personnes et 13 à 17 rapports par graine. Promotion de jeunes après licenciement : corrigée puis vérifiée à part.
  Invariants contrôlés chaque saison : identifiants uniques, identités réelles uniques, clubs existants, contrats valides, attributs 1-20,
  âges, prêts cohérents, effectifs 14-45, trésorerie rapprochée à l'euro, promotion de jeunes unique, missions/recruteurs cohérents,
  classements (points = 3V+N, nombre de matchs).
- Scénarios ciblés : réaffecter un recruteur (6 → 17 observations), surcharge (4 observations pour 5 missions), licencier le responsable
  (rapports conservés), refuser une offre, entretien + négociation refusée, changement de club (dossiers laissés à l'ancien club, ancien
  club qui continue), licenciement puis rebond, sauvegarde/rechargement pendant une négociation (résultat identique), prime et commission
  payées une seule fois, clubs IA dans leur enveloppe (0 dépassement), consulter tous les écrans sans changer le futur, migration
  d'une sauvegarde v12 avec copie préalable, fuite avec cause identifiable.

### Anomalies trouvées par les tests et corrigées
- Démarrage : l'accueil pouvait s'afficher avant le chargement des modules (erreur intermittente) → attente du chargement.
- Plusieurs écrans consommaient l'aléatoire de la partie (finances, agents, création du staff à l'ouverture) → générateur annexe.
- La cellule se vidait (moral au repos trop pénalisant, pas de remplacement) → moral corrigé, remplacement par délégation.
- Joueurs sans club accumulés sans fin (50 → 420 en 3 saisons) → départ du circuit après 2 saisons sans contrat ou à 33 ans.
- Enveloppe des clubs IA recalculée chaque semaine → fixée au début de la saison, sommes engagées déduites.
- Pas de promotion de jeunes la saison suivant un licenciement → la promotion appartient au club.

### Limites connues
- 10 saisons d'affilée non exécutées dans cette session (3 saisons × 5 graines) ; l'outil le permet : `tests/longue.html?saisons=10`.
- Dans la simulation automatique, le directeur « passif » est souvent licencié en 2e saison : la simulation remet la confiance à niveau
  au lieu de suivre le chômage (chemin chômage/rebond testé séparément).
- Lots 4 (hors plan d'effectif), 5 et 6 restent à faire : voir PLAN.md.

## v13 — réalisme et budget
- `js/realisme.js` : centre de formation V9 (catégories, promotion annuelle unique, plans, parcours), agents, objectifs de la direction, clubs rivaux.
- `js/budget.js` : journal comptable, rapprochement, budget de saison, engagements, masse salariale, rapports mensuels, alerte de déficit et emprunts.
- Corrections : progression des jeunes plafonnée (+8/saison ; la progression générique ne s'applique plus à l'académie), promotion de la saison suivante bien créée, salaire du coach payé, demandes d'entretien limitées aux joueurs importants.

# État v12

## v12 — gestion de club
- Nouveaux fichiers : `js/gestion.js` (parties multiples, navigation, mail, décisions, transferts en étapes, contrats, staff, réunions, groupes, calendrier, statistiques) et `js/directeur.js` (mode directeur sportif, entraîneur IA, mercato des coachs, conséquences).
- Rôle par défaut : **directeur sportif** (choix sur l'accueil). Le mode entraîneur reste disponible.
- Effectifs : les clubs sans joueurs notés reçoivent les vraies personnes rattachées au club dans la base (niveau estimé, badge E).
- Matrice détaillée : `FONCTIONNALITES.md`.

# État v11

## Lancer (Windows)
1. Placer `Football_Monde` à côté du dossier du jeu (ou `python outils/importer_monde.py --donnees CHEMIN`).
2. Double-clic sur `Lancer_Manager_Foot.bat` : import au premier lancement (~10 min), puis http://127.0.0.1:8765/.
3. Sans serveur, `index.html` reste jouable en mode fictif.

## Ce qui fonctionne (testé)
- Import SQLite : 436 020 fiches, 0 doublon d'identifiant, contrôle par rapport au manifeste, reprise par fichier, réimport sans doublon (test).
- 71 silhouettes par défaut (fausses « photos ») détectées et écartées.
- 3 835 fiches signalées « doublon possible » (même nom + même naissance), jamais fusionnées.
- Recherche sans accents : 1 à 50 ms ; filtres larges 0,1 à 0,6 s (i5-10210U, 7,7 Go RAM, base 810 Mo).
- Fiches à 8 onglets, historiques V10 chargés à la demande (≈ 80 ms), valeurs nulles affichées « Inconnu ».
- Images : pack → cache → téléchargement borné (3 simultanés, 8 s, 2 essais, signature vérifiée, pas de boucle sur un refus — test) ; repli à initiales / blason générique.
- Monde réel : 5 pays, 19 groupes, 384 inscriptions ; scénario construit en 1,4 à 2,8 s.
- Carrière Paris SG (graine 42) : 12 semaines simulées en 6,8 s dans le navigateur, points = 3V+N vérifiés.
- Générateur aléatoire à graine, état sauvegardé avec la partie.

## Limites connues
- Ligue 3, Primera Federación et Serie C : **aucun effectif noté** dans le pack → clubs entièrement fictifs (marqués F).
- Montées/descentes désactivées en monde réel tant que l'utilisateur ne les valide pas ; non disponibles pour les niveaux à groupes.
- Contrats, salaires, budgets, stades : valeurs de simulation.
- Non testés : saison complète en monde réel, 10 saisons, rechargement identique du futur, mode hors ligne réel.
- Outils Node (`tools/*.js`) non exécutables ici (Node absent).
- Non fait : formation V9 en JS, joueurs libres dans le mercato, expiration datée des contrats, éditeur réversible, rotation des sauvegardes. Voir PLAN.md.

## Commandes
- `python -I outils/tests_donnees.py` — 9 tests, tous réussis.
- `python -I outils/serveur.py [--hors-ligne]`
