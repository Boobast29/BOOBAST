# Manager Foot — document de reprise

Ce document résume tout le projet pour pouvoir le reprendre dans une nouvelle conversation.

## 1. Le projet en bref

- **Quoi** : jeu de gestion de club de football, original (inspiré du genre « football manager », sans copier aucun jeu existant), en français.
- **Où** : dossier `manager-foot/` du dépôt `boobast29/boobast`, branche `claude/tender-hawking-cnluv6`.
- **Techno** : HTML + CSS + JavaScript « vanilla », aucune dépendance, aucun serveur. On double-clique sur `index.html`.
- **Sauvegarde** : IndexedDB du navigateur (repli sur localStorage). Export/import en fichier JSON possible.
- **Données** : 100 % fictives (clubs, joueurs, compétitions). Pas de vrais logos, photos ou noms (droits d'image et marques). L'utilisateur met ses propres données via l'**éditeur** (photos et logos depuis le PC, en masse via le nom des fichiers, ou JSON).
- **Taille** : environ 6 300 lignes de JavaScript.

## 2. Historique des versions

| Version | Contenu principal |
|---|---|
| v1 | Base : championnat 20 clubs, effectif, tactique, match texte, mercato, finances |
| v2 | 2 divisions, coupe nationale, vue 2D, consignes, président, éditeur, IndexedDB |
| v3 | Coupe d'Europe, staff, infrastructures, recrutement avec brouillard, prêts, journal, son |
| v4 | Économie par championnat, 20 types de blessures, infirmerie, météo |
| v5 | **Moteur de match action par action** (`match.js`), xG, stats réelles, analyse d'après-match |
| v6 | Placement libre, rôles et missions, statuts, vestiaire, mercato avancé |
| v7 | Développement individuel, académie, missions de recrutement, carrière, analyse |
| v8 | 3 coupes d'Europe au format 36 clubs, supercoupes, 109 clubs étrangers, sélections, Mondial/Euro, Ballon d'or |

## 3. Architecture des fichiers (`manager-foot/`)

Ordre de chargement dans `index.html` (important : les fichiers se partagent des variables globales).

| Fichier | Rôle |
|---|---|
| `js/data.js` | Constantes (rôles, formations, consignes, nations, noms), clubs fictifs, génération des joueurs, notes, valeur, salaire |
| `js/engine.js` | Cœur du jeu : compositions, `makeSide`, `applyMatch`, calendrier, coupe nationale, semaine (`weeklyUpdate`, `completeWeek`), président, récompenses, fin de saison, `newGame`, `migrateGame` |
| `js/match.js` | **Classe `Match`** : moteur action par action (positions, duels, passes, dribbles, centres, tirs, xG, fautes, cartons, blessures, changements, prolongations, tirs au but) |
| `js/tactics.js` | Placement libre (`slotPos`, `slotRole`, `roleAt`), rôles détaillés (`ROLE_STYLES`), missions, consignes extra, familiarité tactique, tactiques enregistrées |
| `js/squad.js` | Statuts, confiance, hiérarchie, clans, ambiance, automatismes (`bonds`), conflits |
| `js/transfers.js` | Clauses, paiements échelonnés, bonus, % à la revente, échanges, prêts entrants, surenchères, historique |
| `js/career.js` | Polyvalence par poste, développement individuel, parrainage, académie, missions de recrutement, réputation, succès, postes vacants, demandes au président, discours et conférences |
| `js/europe.js` | 109 clubs étrangers, 3 coupes d'Europe (phase de ligue + élimination aller-retour), supercoupes, simulation rapide de Poisson pour les matchs entre étrangers |
| `js/intl.js` | Sélections, trêves internationales, Mondial (2030, 2034…), Euro (2028, 2032…), Ballon d'or |
| `js/economy.js` | Économie par championnat, droits TV, billetterie, sponsors, budgets du président, contrôle de gestion |
| `js/world.js` | Blessures détaillées et météo |
| `js/storage.js` | Stockage IndexedDB |
| `js/ui.js` | Outils d'interface (visages SVG, écussons, modales, toasts) et analyse de match (carte des tirs, xG) |
| `js/match2d.js` | Vue 2D sur canvas (relecture des actions du moteur, pluie et neige) |
| `js/sound.js` | Ambiance sonore générée en Web Audio |
| `js/app.js` | Écrans : accueil, effectif, fiche joueur, tactique, entraînement, staff, infirmerie, vestiaire, formation, analyse, calendrier, compétitions, international, mercato, finances, club, options |
| `js/matchui.js` | Déroulé des matchs : avant-match, direct, causerie, tactique en direct, après-match, fin de saison, licenciement, vacances |
| `js/editor.js` | Éditeur de clubs, joueurs, compétitions, économie, logos et photos |
| `style.css` | Tout le style (thème sombre) |
| `tools/` | Scripts de test (voir section 6) |

## 4. Modèle de données (objet global `G` = la partie)

- `G.clubs[]` : `{ id, name, short, colors, rep, div (0 = étranger), foreign, country, budget, capacity, stadium, style, coh, atm, trophies[], recent[] }`
- `G.players[]` : `{ id, name, nat, age, pos, attrs{fin,pas,dri,tec,tac,vit,phy,men,gar}, pot, club, wage, value, contract, morale, fit, injury (jours), inj, frag, pers, status, trust, posFam, train, mentor, academy, loan, clause, stats{…}, form[], hist[], caps, intlGoals… }`
  - `G.pmap` est l'index par id, reconstruit par `reindex(G)` et non sauvegardé.
- `G.comps` : `L1`, `L2` (championnats), `CUP`, `C1`/`C2`/`C3` (Europe), `SUP`/`ESUP` (supercoupes).
- `G.schedule[]` : la saison semaine par semaine.
  - `{ t: 'L', r }` = journée de championnat (semaine complète).
  - `t: 'C' | 'E' | 'S'` = coupe, Europe ou supercoupe (milieu de semaine, récupération partielle).
- `G.tactics` : `{ formation, mentality, lineup[11], bench[9], inst{press,tempo,width,line,pass,cpress,trap,waste}, takers, pos{}, styles{}, duties{}, mark[] }`
- Autres : `G.fin` (finances inc/exp), `G.board` (confiance, budget transferts, plafond salarial), `G.staff`, `G.fac`, `G.mgr` (réputation), `G.bonds`, `G.tacFam`, `G.missions`, `G.transfers`, `G.intlHistory`, `G.ballon`, `G.inbox`…
- **Compatibilité** : `migrateGame(G)` met à jour les vieilles sauvegardes. Toute nouvelle donnée doit y être initialisée.

## 5. Calibrage du moteur (à préserver)

Sur une saison simulée de Ligue Élite (`tools/sim-calibration.js`), les valeurs cibles par match sont :

| Mesure | Valeur cible |
|---|---|
| Buts | ~2,6 |
| Tirs | ~25 |
| Passes réussies | ~77 % |
| Fautes | ~21 |
| Cartons | ~3 |
| Corners | ~8 |
| Victoires à domicile | ~44 % |
| Nuls | ~23 % |

- Le champion finit autour de 90 points, le dernier autour de 20.
- Aucune consigne tactique ne doit dominer : moins de ±4 points d'écart sur une saison.

Les principaux réglages se trouvent dans `match.js` :
- poids de choix d'action dans `action()` ;
- probabilités de réussite dans `pass()` et `a_dribble()` ;
- formule xG dans `shoot()` ;
- base des notes dans `addPR`.

## 6. Comment tester

Toutes les commandes se lancent depuis `manager-foot/`.

```bash
node --check js/*.js                    # syntaxe (un fichier à la fois : for f in js/*.js; do node --check $f; done)
node tools/sim-calibration.js           # stats moyennes du moteur (~10 s)
node tools/sim-saisons.js               # 2 saisons complètes : Europe, supercoupes, tournoi, Ballon d'or (~1 min)
node tools/ui-smoke.js /tmp/captures    # test navigateur (Playwright) + captures ; doit finir par "ERRORS: none"
```

## 7. Points connus / idées pour la suite

- **Points à surveiller** :
  - le meilleur buteur d'un club dominant peut dépasser 50 buts : réduire le poids `BU` dans `action()` ou la formule xG ;
  - le plafond salarial de départ est serré : les prêts entrants sont souvent refusés.
- **Performances** : environ 15-18 ms par match avec le moteur complet. Une saison fait 63 semaines, soit environ 5 s dans le navigateur. Les matchs entre deux clubs étrangers passent par `quickSimFixture` pour rester rapides.
- **Idées non faites** :
  - entraîneur d'une sélection nationale ;
  - matchs amicaux de pré-saison ;
  - coefficient UEFA par pays ;
  - championnats étrangers jouables ;
  - éditeur de tactique adverse ;
  - commentaires audio ;
  - mode multijoueur local.

## 8. Message à coller pour démarrer une nouvelle conversation

> Je travaille sur « Manager Foot », un jeu de gestion de football en HTML/JS (sans dépendance) dans le dossier `manager-foot/` du dépôt `boobast29/boobast`, branche `claude/tender-hawking-cnluv6`. Lis d'abord `manager-foot/REPRISE.md`, qui décrit l'architecture, le modèle de données, le calibrage du moteur et les tests. Garde les données fictives (noms renommables dans l'éditeur), l'interface en français et le calibrage du moteur. Avant chaque commit, lance `node tools/sim-calibration.js` et `node tools/ui-smoke.js` (qui doit afficher « ERRORS: none »). Ce que je veux maintenant : …
