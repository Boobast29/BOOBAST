# Matrice des fonctionnalités — v14 (2 novembre 2026)

Légende : **Prévu** · **Implémenté** (code présent) · **Interface** (accessible à l'écran) · **Testé** (contrôle réellement exécuté) · Limites.

## v14 — lots 1 à 3 (et début du lot 4)

| Fonctionnalité | Impl. | Interface | Testé | Limites |
|---|---|---|---|---|
| Version de schéma 14, copie `premig-vN` avant migration, journal `G.migrations` | oui | message au chargement | oui (sauvegarde v12 → 14, copie intacte conservée) | |
| Démarrage : attente du chargement de tous les scripts (course corrigée) | oui | — | oui (erreur disparue) | |
| Consulter un écran ne change pas le futur (marchés, agents, finances via générateur annexe) | oui | — | oui : 22 écrans + 7 onglets cellule + 5 onglets finances + fiches | |
| Simulation automatique sans interface + invariants + mesures (`tests/longue.html`) | oui | page de test | voir ETAT_PROJET.md | 40-50 s par saison |
| Cellule : responsable, recruteurs, analyste ; compétences, zones, langues, biais, charge, moral, contrats | oui | Cellule › Équipe | oui | relations professionnelles : stockées, peu exploitées |
| Pouvoirs : recruter, prolonger (peut refuser), licencier (indemnité), nommer responsable, affecter, budget, fermer/renforcer mission | oui | Cellule | oui (licenciement, affectation) | |
| Départs : offres extérieures, contre-proposition, rapports conservés, connaissance terrain perdue | oui | mail | oui (rapports conservés) | |
| Missions : poste, âge, zone, disponibilité, horizon, niveau, indemnité, salaire, statut, budget, échéance, couverture, motifs d'échec | oui | Cellule › Missions | oui : 1 recruteur = 6 obs., 2 = 17 obs. ; surcharge = 4 obs. pour 5 missions | compétition et « prêt possible » approximés |
| Rapports datés : auteur, contexte, fourchettes, confiance, points forts/réserves, inconnues, coût estimé, ancienneté | oui | Cellule › Rapports | oui | |
| Connaissance du club = agrégat des rapports (jamais régénérée à l'ouverture), vieillissement des rapports | oui | partout (notes ~) | oui | |
| Observation individuelle, second avis, divergences entre recruteurs | oui | fiche joueur, réunion | oui | |
| Réunion de recrutement : besoins, 3-5 options, coûts, incertitude, avis du coach, recommandation + alternative | oui | bouton, mail avant mercato, fin de mission | oui (ouverture) | |
| Comparaison de candidats (avec ton titulaire) | oui | Cellule › Comparer | oui | |
| Évaluation des recruteurs (pertinence + calibration vérifiable) | oui | Cellule › Évaluation | ouvert | calibration seulement sur joueurs arrivés au club |
| Délégation : je décide / le staff propose / le staff exécute | oui | Cellule › Tableau de bord | oui (simulation) | limites de montants : budget de mission seulement |
| IA : perception imparfaite selon ses moyens, enveloppe de saison réservée, plafond salarial | oui | — | oui : 0 club au-delà de son enveloppe | prêts IA non modélisés |
| Carrière DS : profil, contrat simulé, 6 dimensions de réputation contextualisées | oui | Ma carrière | oui | |
| Sondages, entretiens (pas de bonne réponse universelle), second entretien, autre candidat préféré, offre retirée | oui | mail, Ma carrière | oui | |
| Négociation (salaire, durée, autonomie, budget cellule) + fiche comparative | oui | modal | oui (refus des exigences) | |
| Fuites avec cause identifiable, réaction du président (retenir / succession) | oui | décision bloquante | oui (cause : média national, confiance 60 → 52) | |
| Changement de club : indemnité, historique, dossiers confidentiels laissés au club, ancien club continue | oui | — | oui | emprunts de l'ancien club non remboursés par l'IA |
| Licenciement, indemnité, chômage, candidatures, rebond | oui | Ma carrière | oui | |
| Plan d'effectif 3 saisons, alertes succession/dépendance, scénarios sans effet | oui | Plan d'effectif | oui (partie inchangée) | projection simple documentée |
| Réservation des sommes engagées dans les négociations (indemnités, salaires conclus) | oui | offre, négociations | oui : 20 M€ − 17 M€ engagés → 3e offre refusée | |
| Coût total : garanti / attendu / exposition maximale, échéancier | oui | conditions personnelles | oui (affiché, mis à jour en direct) | buts/matchs attendus : estimation par poste |
| Primes de but et de match réellement payées, une fois par événement | oui | journal comptable | oui : 2 buts + 6 matchs = 70 000 € payés une fois, rapprochement 0 € | auparavant jamais payées |
| Exigences selon les alternatives du joueur ; statut non compensable par l'argent | oui | négociation | oui | |
| Demandes de joueurs comparables après un gros salaire (selon connaissance et personnalité) | oui | mail | oui : 2 demandes sur 14 joueurs possibles | silence 4 semaines = déception |
| Promesse de revalorisation suivie (jugée à la fin du mercato d'été) | oui | mail | non testé sur une saison complète | |
| Vente active : sonder, intermédiaire (5 %), proposer aux clubs, prêt avec participation au salaire, baisse de prix | oui | fiche joueur, Négociations | oui : sondage 8 clubs, offre via intermédiaire, prêt 60/40 | |
| Mise en liste seule : plus d'acheteur automatique (besoin réel requis) | oui | — | oui : 0 offre en 5 semaines sans besoin | |
| Clubs IA : formation, prêt, achat ou attente selon besoin et enveloppe | oui | — | oui (formation 4, achat 6 sur une semaine de mercato) | prêts IA rares |

| Fonctionnalité | Impl. | Interface | Testé | Limites |
|---|---|---|---|---|
| Import SQLite du pack (436 020 fiches, reprise, sans doublon) | oui | lanceur | oui (tests_donnees) | 10 min au premier import |
| Recherche sans accents, filtres, pagination | oui | Base mondiale | oui (1–50 ms texte, ≤ 0,6 s filtres) | |
| Fiches 8 onglets + historiques V10 | oui | Base / fiche joueur | oui (80 ms) | historiques partiels (sources) |
| Doublons possibles signalés (3 835 fiches) | oui | recherche, fiche | oui | pas d'outil de fusion |
| Portraits / logos : pack → cache → téléchargement borné | oui | partout | oui (refus sans boucle, 27 photos téléchargées) | photos absentes = initiales |
| Monde réel 5 pays, 19 groupes, 384 inscriptions | oui | accueil | oui (5 scénarios) | règles non validées |
| Effectifs : notés + profils réels estimés (badge E) + fictifs (F) | oui | effectif | oui (L3 France : 12/18 clubs avec vrais noms) | 6 clubs L3 FR sans aucune fiche |
| **Parties multiples** + 3 sauvegardes de secours + restauration | oui | accueil « Mes parties » | oui (2 parties, rechargement) | |
| Générateur aléatoire à graine sauvegardée | oui | — | oui (même futur après rechargement) | |
| **Navigation par sections**, retour, badges | oui | barre latérale | oui (21 vues ouvertes sans erreur) | |
| **Boîte mail** : catégories, lecture, actions, décisions | oui | Boîte mail | oui | |
| **Décisions bloquantes** (offres, entretiens, prolongations, sponsor, demandes du coach) | oui | bouton orange | oui (avancer impossible sans répondre) | |
| **Salaires mensuels**, contrats datés (30 juin), primes | oui | partout | oui | moteur interne en semaines (conversion) |
| **Transferts en étapes** : club → agent → visite médicale → signature | oui | Négociations | oui (transfert complet) | une seule offre IA concurrente non simulée |
| Vente : le joueur peut refuser le club acheteur | oui | offres | partiel | |
| Prolongations négociées (patience de l'agent) ; pré-contrats Bosman | oui | fiche, mail | partiel | |
| **Staff nominatif** : candidats, négociation, licenciement | oui | Staff | ouvert sans erreur | |
| **Réunions** : équipe, groupes, individuelles, capitanat | oui | Réunions | oui | |
| Dynamique de groupe (meneurs, cadres, recrues, mécontents, intégration) | oui | Réunions / vestiaire | oui | |
| **Calendrier mensuel** | oui | Calendrier | ouvert sans erreur | |
| **Statistiques** : classements, équipes, effectif /90, carrière | oui | Statistiques | ouvert sans erreur | |
| **Mode directeur sportif** (matchs dirigés par le coach IA) | oui | choix du rôle | oui (30 semaines) | |
| Entraîneur : 7 compétences, style, adéquation, respect, demandes | oui | Entraîneur | oui | effets modérés et documentés |
| Mercato des entraîneurs : entretien, négociation, adjoint, budget | oui | Entraîneur | partiel | |
| Conséquences différées (licenciement, presse, cadre vendu, recrue non voulue) | oui | mail | oui (cadre vendu observé) | |
| Formation V9 : U17 / U19 / Réserve, une promotion par saison, ids regen_*, plans, minutes, parcours | oui | Formation | oui (pas de double promotion, journal sauvegardé, +4,3 de niveau en moyenne par saison) | poules de jeunes simplifiées (minutes simulées) |
| Agents (agences fictives) : exigences, patience, propositions spontanées | oui | fiche joueur, mail | oui | pas de lien avec des agents réels |
| Direction : 5 objectifs pondérés, bilans tous les 10 journées, demandes | oui | Direction | oui | |
| Clubs rivaux : approches, clauses libératoires payées | oui | mail | partiel | |
| Journal comptable mensuel + rapprochement de trésorerie | oui | Finances › Journal | oui (écart 0 €) | modif. manuelle dans l'éditeur = écart signalé |
| Budget de saison : prévu / réalisé / projection / écart | oui | Finances › Budget | oui | valeurs de simulation |
| Engagements futurs (salaires garantis par saison, échéances, bonus) | oui | Finances › Engagements | ouvert sans erreur | |
| Structure salariale + comparaison ligue + ratio salaires/recettes | oui | Finances › Masse salariale | ouvert sans erreur | |
| Rapport financier mensuel, alerte de déficit (vente, emprunt, économies) | oui | mail | oui (rapports reçus) | |
| Salaire de l'entraîneur principal payé (mode DS) | oui | — | oui | corrigé en v13 |
| Saison complète en mode DS jusqu'à la saison suivante | — | — | oui (Rennes, 2e, 72 pts) | 10 saisons non testées |
| Éditeur réversible avec historique | **non** | — | — | |
| Saison complète / 10 saisons en monde réel | — | — | **non testé** | 30 semaines testées |
