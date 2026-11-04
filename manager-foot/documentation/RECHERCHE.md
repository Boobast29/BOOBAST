# Recherche de sources ouvertes (novembre 2026)

But : trouver sur GitHub des données et du code réutilisables pour rendre Manager Foot plus réaliste
(données football, transferts, règlements, moteurs de jeux de gestion).

## Ce qui est utilisé dans le jeu

| Source | Licence | Usage dans le jeu |
|---|---|---|
| [openfootball/football.json](https://github.com/openfootball/football.json) | CC0 (domaine public) | Buts par match à domicile et à l'extérieur pour 13 divisions (Angleterre 1-4, Allemagne 1-3, Espagne 1-2, France 1-2, Italie 1-2), saisons 2014/15 → 2025/26 : **calibrage du moteur de match par division** (`CALIB_REEL` dans `js/reglements.js`). |
| [ewenme/transfers](https://github.com/ewenme/transfers) | aucune licence | **Statistiques agrégées seulement** (médianes d'indemnités par championnat, âge et poste, 2015 → 2022). Aucune donnée brute recopiée. Pas encore branché dans l'économie (voir « À faire »). |
| Pages officielles et presse (FFF, LFP, DFB, RFEF, Lega Pro, Serie A…) | — | Règlements 2026/27 : formats, montées, descentes, barrages, play-offs, playouts, départages (`REGLES` dans `js/reglements.js`, sources listées dans l'écran « Règlement »). |

Script de calcul : `outils/calibrage_donnees_ouvertes.py CHEMIN_football.json CHEMIN_transfers/data` (bibliothèque standard Python).

### Chiffres obtenus (buts par match)

| Division | Matchs | Dom. | Ext. | Victoire dom. | Nul |
|---|---|---|---|---|---|
| Premier League | 4 610 | 1,54 | 1,26 | 44 % | 24 % |
| Championship | 5 640 | 1,41 | 1,13 | 43 % | 27 % |
| League One | 3 516 | 1,42 | 1,19 | 43 % | 25 % |
| League Two | 3 476 | 1,36 | 1,14 | 42 % | 27 % |
| Bundesliga | 3 708 | 1,70 | 1,35 | 45 % | 25 % |
| 2. Bundesliga | 3 465 | 1,55 | 1,28 | 43 % | 28 % |
| 3. Liga | 2 660 | 1,45 | 1,18 | 42 % | 28 % |
| LaLiga | 4 619 | 1,50 | 1,13 | 46 % | 26 % |
| Segunda | 3 818 | 1,33 | 0,97 | 45 % | 30 % |
| Ligue 1 | 4 281 | 1,50 | 1,19 | 44 % | 25 % |
| Ligue 2 | 2 982 | 1,34 | 1,07 | 43 % | 29 % |
| Serie A | 4 600 | 1,48 | 1,24 | 42 % | 26 % |
| Serie B | 3 712 | 1,39 | 1,04 | 43 % | 33 % |

Moteur avant / après calibrage (monde fictif, 200 matchs par division) :
- avant : D1 2,62 buts · D2 1,72 buts et 41 % de nuls · D3 1,59 buts et 37 % de nuls (divisions inférieures trop fermées) ;
- après (règlement France) : D1 2,42 · D2 2,29 · D3 2,68 buts, 24 à 27 % de nuls, 42 à 46 % de victoires à domicile.

## Repéré mais non utilisé

| Source | Licence | Pourquoi |
|---|---|---|
| [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) | CC0 | Meilleure base de transferts et de valeurs ouverte. Les fichiers sont hébergés hors de GitHub (stockage R2 et Kaggle), bloqués par le réseau de cette session. **À importer** depuis ton PC (même principe que `Importer_Base.bat`). |
| [hudl/open-data](https://github.com/hudl/open-data) (StatsBomb) | licence non commerciale | Données événement par événement (passes, tirs, pressions) : utile pour calibrer finement le moteur (tirs, xG, passes). Usage personnel seulement. |
| [openfootmanager/openfootmanager](https://github.com/openfootmanager/openfootmanager) | GPL-3.0 | Jeu de gestion open source. Le code GPL ne peut pas être recopié sans passer le jeu en GPL : **idées seulement**. |
| [ZOXEXIVO/open-football](https://github.com/ZOXEXIVO/open-football) | Apache-2.0 | Moteur de simulation en Rust (agents par joueur) : idées pour le moteur de match. |
| [ihofmann/open-websoccer](https://github.com/ihofmann/open-websoccer) | LGPL-3.0 | Jeu en ligne PHP : idées (sponsors, stades, primes). |
| [salimt/football-datasets](https://github.com/salimt/football-datasets) | aucune licence | 93 000 joueurs (Transfermarkt) : non réutilisable sans licence. |

## Recherche n° 2 — vrais joueurs, photos, logos, clubs, entraîneurs (v19)

| Source | Licence | Usage dans le jeu |
|---|---|---|
| [withqwerty/reep](https://github.com/withqwerty/reep) | CC0 | **Registre d'identités** : 444 707 personnes (401 061 joueurs, 43 646 entraîneurs) et 45 337 clubs, avec identifiants Wikidata, Transfermarkt, SoFIFA/EA, FBref… `outils/importer_reep.py` relie tes joueurs (identifiant EA, puis Transfermarkt, puis nom + date de naissance) et tes clubs (nom + pays) à Wikidata, et complète les tailles inconnues. |
| [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) | CC0 | `outils/importer_transfermarkt.py` : **entraîneur actuel, stade et capacité, valeur de l'effectif** (premières divisions) ; **valeur marchande, fin de contrat, pied fort, agent, sélections** des joueurs ; historique des transferts. |
| Wikidata (via les identifiants reep) | CC0 (données) | `outils/enrichir_wikidata.py` : **entraîneur en poste de chaque club, tous niveaux** (nom, âge, nationalité, photo), **logo** et **stade/capacité/couleurs/fondation**, **photos** des joueurs sans portrait, **effectifs actuels** des clubs sans joueurs notés (Ligue 3, Primera Federación, Serie C…). |
| Wikimedia Commons | licence propre à chaque fichier (souvent CC BY-SA) | Photos et logos **libres** téléchargés à la demande par le jeu (cache local, signature vérifiée). Les logos protégés absents de Commons ne sont pas récupérés. |
| [ClubElo](http://clubelo.com) (API publique) | usage libre de l'API | `outils/importer_clubelo.py` : force Elo du jour → réputation réaliste des clubs sans joueurs notés. |

Tout se lance avec **`Enrichir_Base.bat`** (internet nécessaire, après `Importer_Base.bat`) : reep → transfermarkt-datasets → ClubElo → Wikidata.
Ordre de priorité dans le jeu : Transfermarkt (mis à jour chaque semaine) > Wikidata > reep.

### Repéré, non intégré
| Source | Licence | Pourquoi |
|---|---|---|
| [Leo4815162342/football-logos](https://github.com/Leo4815162342/football-logos) (5 900 logos PNG/SVG) | aucune licence | Les logos de clubs sont des marques déposées et le dépôt ne donne aucun droit : non intégré. Le pack Football_Monde et Wikimedia Commons restent les sources. |
| Photos Transfermarkt (`image_url` de transfermarkt-datasets) | droits des photographes | Non utilisées : seules les photos libres de Commons sont ajoutées. |
| [GallagherAiden/footballSimulationEngine](https://github.com/GallagherAiden/footballSimulationEngine) | MIT | Moteur de match JavaScript (positions des joueurs à chaque itération) : réutilisable, à étudier pour enrichir la vue 2D. |
| [probberechts/soccerdata](https://github.com/probberechts/soccerdata) | non précisée | Collecteur Python (FBref, Sofascore, ClubElo…) : alternative pour des statistiques de saison, conditions d'utilisation des sites à respecter. |
| [inker/draw](https://github.com/inker/draw) | aucune licence | Simulateur de tirage de la Ligue des champions (protection par pays) : idée pour le tirage européen. |
| [jalapic/engsoccerdata](https://github.com/jalapic/engsoccerdata) | aucune licence | Résultats historiques 1871-2022 : redondant avec openfootball (CC0). |
| Staff technique (adjoints, préparateurs) | — | Aucune source ouverte fiable trouvée : le staff reste généré. |

## Recherche n° 3 — sélections, maillots, données de match (v20)

| Source | Licence | Usage dans le jeu |
|---|---|---|
| [martj42/international_results](https://github.com/martj42/international_results) | CC0 | 49 940 matchs internationaux (1872 → 2026), 47 914 buts, 700 séances de tirs au but. `outils/donnees_internationales.py` génère `js/donnees_ouvertes.js` : **Elo réel de 81 sélections** (méthode eloratings.net) → force des sélections du jeu ; **bilan historique et meilleurs buteurs** (écran International) ; **réservoirs de prénoms et noms** de buteurs par pays pour les joueurs générés, avec exclusion des noms complets de vrais buteurs. |
| [dmnk-rdr/open-jersey-db](https://github.com/dmnk-rdr/open-jersey-db) | ODbL 1.0 | `outils/importer_maillots.py` : maillots 2025/26 (couleurs, équipementier, sponsor principal) → couleurs du club et fiche club, attribution affichée. Couverture inégale : bien renseigné pour l'Allemagne, encore vide (couleurs, équipementier) pour beaucoup de clubs français. |

Elo calculé (novembre 2026) : Espagne 2367, Argentine 2253, Angleterre 2228, France 2187, Portugal 2143, Brésil 2088, Colombie 2074, Suisse 2058, Pays-Bas 2049, Belgique 2029, Maroc 2025, Italie 1988.

### Repéré, non intégré
| Source | Licence | Pourquoi / piste |
|---|---|---|
| [SkillCorner/opendata](https://github.com/SkillCorner/opendata) | MIT | 10 matchs en données de suivi : distances parcourues, sprints. Piste : ajouter « distance parcourue » et la fatigue réaliste dans le moteur de match. |
| [metrica-sports/sample-data](https://github.com/metrica-sports/sample-data) | aucune licence | Suivi + événements de 3 matchs : idées seulement. |
| [openfootball/clubs](https://github.com/openfootball/clubs) | CC0 | Clubs et stades (capacité, année d'ouverture) ; données anciennes, redondantes avec reep / Transfermarkt / Wikidata. |
| [jcrochet-netizen/ranking-uefa-pays](https://github.com/jcrochet-netizen/ranking-uefa-pays) | aucune licence | Coefficients UEFA par pays : piste pour répartir les places européennes selon le vrai classement. |
| Salaires (Capology), finances des clubs, blessures, arbitres | — | Aucune source ouverte et réutilisable trouvée sur GitHub (dépôts de scraping sans licence uniquement). |
| Noms de vrais joueurs non buteurs | — | Le filtre des noms générés ne connaît que les buteurs internationaux : une combinaison peut encore, rarement, correspondre à un autre vrai joueur. |

## Recherche n° 4 — mécaniques du mercato, données joueurs (v21)

Sur GitHub, presque tous les dépôts « transferts / valeurs / statistiques » sont des scrapers ou des modèles sans licence :
la base réutilisable reste **transfermarkt-datasets (CC0)**, désormais importée aussi pour les **statistiques par saison**
(`appearances` agrégé : matchs, minutes, buts, passes, cartons) et l'**historique réel des transferts** de chaque joueur.
Les règles du mercato viennent des textes officiels (règlement FIFA RSTP, règles anglaises du permis de travail) et de leur analyse :

| Règle | Source | Dans le jeu |
|---|---|---|
| Mécanisme de solidarité : 5 % de l'indemnité aux clubs formateurs (0,25 %/an de 12 à 15 ans, 0,5 %/an de 16 à 23 ans) | RSTP annexe 5 ([LawInSport](https://lawinsport.com/topics/sports/item/a-guide-to-training-compensation-and-solidarity-payments-in-football), [11KBW](https://www.11kbw.com/knowledge-events/article/a-legal-guide-to-solidarity-payments-in-football-under-the-fifa-regulations/)) | prélevé sur le vendeur à chaque transfert payant, reversé aux clubs formateurs (centre de formation + saisons avant 24 ans) ; message quand ton club touche sa part |
| Indemnité de formation | RSTP art. 20 / annexe 4 | départ libre d'un joueur de 23 ans ou moins : forfait annuel selon la catégorie du club acheteur (90 / 60 / 30 / 10 k€), simplifié |
| Prêts : 6 entrants / 6 sortants par saison, 3 au plus avec un même club, jeunes formés au club exemptés | RSTP art. 10 ([notes explicatives FIFA](https://digitalhub.fifa.com/m/785652de48694c8c/original/Explanatory-Notes-on-the-New-Loan-Provisions-in-the-Regulations-on-the-Status-and-Transfer-of-Players.pdf)) | blocage des prêts au-delà, avec message ; appliqué à tous les prêts (en réalité : prêts internationaux) |
| Autorisation de travail anglaise (GBE), 15 points, commission d'exceptions | FA ([Mills & Reeve](https://mills-reeve.com/stand-alone-pages/faqs-on-the-fa-s-governing-body-endorsement-requirements/mens-gbe-criteria), [Premier League](https://premierleague.com/news/597662)) | barème simplifié (sélections × rang Elo de la sélection, niveau du club vendeur, temps de jeu, niveau) ; points affichés sur la fiche ; refus avec message |
| Rupture de contrat (art. 17) revue après l'arrêt Diarra (cadre provisoire du 1er janvier 2025) | [Withers](https://www.withersworldwide.com/en-gb/insight/read/the-new-fifa-regulations-on-the-status-and-transfer-of-players-what-changes-in-the-post-diarra-er), [Inside World Football](https://www.insideworldfootball.com/2025/01/02/fifa-makes-temporary-transfer-rule-change-fifpro-objects/) | non modélisé (piste : rupture unilatérale d'un joueur) |
| Plafond des commissions d'agents (FFAR) | suspendu depuis fin 2023 ([Lewis Silkin](https://lewissilkin.com/en/insights/the-new-football-agent-regulations-where-are-we-now), [Crowe](https://www.crowe.com/uk/insights/football-players-agent-fees-update)) | pas de plafond (cohérent) ; l'agent réel de transfermarkt-datasets remplace l'agence générée |
| Fenêtres 2026 : Premier League 15 juin – 1er sept., LaLiga / Bundesliga / Ligue 1 1er juillet – 31 août / 1er sept., Serie A 29 juin – 1er sept. | [ESPN](https://africa.espn.com/football/story/_/id/48833505/when-does-summer-transfer-window-close-premier-league-serie-laliga-bundesliga-ligue-1), [Sky Sports](https://www.skysports.com/football/news/12040/13546220/summer-transfer-window-2026-dates-when-is-deadline-day-for-premier-league-and-efl-clubs-to-sign-players) | inchangé (fenêtre du jeu ≈ 6 journées, cohérente avec une fermeture au 1er septembre) |
| Valeur selon le poste | ewenme/transfers (agrégats 2015-2022) : gardiens ≈ moitié des milieux, attaquants au-dessus | coefficient de poste dans la valeur marchande (GB 0,6 → BU 1,15) |

## Recherche n° 5 — interface et idées de jeu (v22)

| Source | Licence | Idée reprise (sans copier de code) |
|---|---|---|
| [MartinSG98/league-manager-ui](https://github.com/MartinSG98/league-manager-ui) | aucune | couleurs à sens unique (or = ce sur quoi tu peux agir, couleur du club = ton identité, vert/orange = alertes) ; bouton « Continuer » qui mène d'abord à ce qui bloque |
| [FredericusRadicalus/retroFootballManager](https://github.com/FredericusRadicalus/retroFootballManager) | MIT | sponsors par tribune, prix des billets qui jouent sur l'affluence, événements aléatoires légers |
| [openfootmanager/openfootmanager](https://github.com/openfootmanager/openfootmanager) | GPL-3.0 | devenir sélectionneur national ; parler à la presse |
| [plucury/ohmyhattrick](https://github.com/plucury/ohmyhattrick) | GPL-3.0 | interface moderne d'un jeu de gestion : peu d'écrans, accès rapide |
| [ihofmann/open-websoccer](https://github.com/ihofmann/open-websoccer) | LGPL-3.0 | jeu de gestion en ligne : stades, sponsors, matchs de jeunes |

Fait en v22 : menu repliable, palette « Aller à… » (Ctrl+K), barre d'onglets et tiroir sur mobile, notifications discrètes, fil d'Ariane,
accueil réécrit. Idées de jeu notées dans PLAN.md.

## Recherche n° 6 — moteurs, presse, expérience de jeu (v23)

| Source | Licence | Idée / usage |
|---|---|---|
| [Lewandowskista/pitch-to-glory](https://github.com/Lewandowskista/pitch-to-glory) | aucune | **repris en idée (v23)** : liste « à faire » triée par urgence et bouton « Continuer » qui dit ce qu'il va faire ; **chronique de carrière** saison par saison ; traits cachés révélés avec le temps (piste) |
| [zocram4cc/GameplayFootball](https://github.com/zocram4cc/GameplayFootball) (League-Soccer) | Apache-2.0 | moteur 3D, IA tactique (pressing par zones, contre-attaques), traits de joueurs, penalties : idées pour le moteur de match |
| [noddy703/tacticmesh](https://github.com/noddy703/tacticmesh) | MIT | simulateur de match dans le navigateur, paquets d'équipes JSON : idée d'import/export de « paquets » de base |
| [DWYCA-org/FMNarrative](https://github.com/DWYCA-org/FMNarrative) | MIT | conférences de presse contextuelles (questions selon la situation, ton) : piste pour enrichir la presse |
| [manuelarte/footballpitchsvggenerator](https://github.com/manuelarte/footballpitchsvggenerator) | aucune | terrain SVG aux vraies dimensions : la vue 2D du jeu l'est déjà |
| Prédiction de blessures (dépôts Apache-2.0 de modèles d'apprentissage) | Apache-2.0 | données non fournies ou synthétiques : non réutilisables pour calibrer |

## Code copié depuis GitHub (v24)

Règle actualisée : examiner les conditions de chaque licence, y compris GPL/LGPL/AGPL ; conserver les avis et satisfaire les obligations applicables à la reprise envisagée. Voir DEPOTS_COPYLEFT.md.
Les dépôts **sans licence** (pitch-to-glory, league-manager-ui, football-logos…) restent « tous droits réservés » : idées seulement.
Les dépôts **GPL** ne sont plus exclus par principe. Leur code n’est pas copié dans ce lot ; avant une adaptation, vérifier le périmètre du travail combiné et les obligations applicables à sa distribution. Voir DEPOTS_COPYLEFT.md.

| Dépôt | Licence | Copié | Où |
|---|---|---|---|
| [FredericusRadicalus/retroFootballManager](https://github.com/FredericusRadicalus/retroFootballManager) | MIT | `sponsors.js`, `stadium.js` copiés tels quels (commit dans `VERSION`) ; logique des sponsors de tribunes adaptée | `vendor/retroFootballManager/` (copie + LICENSE), `js/tribunes.js` (adaptation, attribution en en-tête) |
| [GallagherAiden/footballSimulationEngine](https://github.com/GallagherAiden/footballSimulationEngine) | MIT | non copié | moteur de match complet (≈ 9 500 lignes) qui remplacerait le nôtre, déjà calibré sur les vraies statistiques |
| [noddy703/tacticmesh](https://github.com/noddy703/tacticmesh) | MIT | non copié | application complète de simulation (moteur + interface + stockage), pas un module réutilisable tel quel |

## Bibliothèques hors football intégrées (v25)

Copiées depuis le registre npm (versions officielles), licences d'origine dans chaque dossier de `vendor/` (détail : `vendor/LISEZMOI.md`).

| Projet | Licence | Ce que ça apporte |
|---|---|---|
| [catdad/canvas-confetti](https://github.com/catdad/canvas-confetti) 1.9.4 | ISC | confettis aux couleurs du club sur trophées, montées, qualifications (désactivés si « réduire les animations ») |
| [leeoniya/uPlot](https://github.com/leeoniya/uPlot) 1.6.32 | MIT | graphiques : trésorerie journée par journée (Finances), position journée par journée (Classements) |
| [krisk/Fuse](https://github.com/krisk/Fuse) 7.5.0 | Apache-2.0 | palette Ctrl+K tolérante aux fautes (« Chirstian Touré » → Christian Touré) |
| [101arrowz/fflate](https://github.com/101arrowz/fflate) 0.8.3 | MIT | export compressé `.mfz` (3,2 Mo → 448 Ko), import `.mfz` ou `.json` |
| [KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX) 1.4.0 | MIT | sons synthétisés : fanfare, signature d'un transfert, but de ton équipe |

Repérées, non intégrées (pas utiles pour l'instant) : SortableJS (MIT, glisser-déposer : la tactique a déjà le sien), tinykeys (MIT,
raccourcis : déjà gérés), lz-string (MIT, compression : fflate est plus efficace).

## Bibliothèques hors football, 2e lot (v26)

| Projet | Licence | Dans le jeu |
|---|---|---|
| [nilbuild/driver.js](https://github.com/nilbuild/driver.js) 1.10.2 | MIT | visite guidée en 6 étapes à la première partie (ordinateur et mobile), relançable (Ctrl+K → « Visite guidée », Options) |
| [bubkoo/html-to-image](https://github.com/bubkoo/html-to-image) 1.11.13 | MIT | bouton « 📷 Image » : Chronique et classements enregistrés en PNG à partager |
| [GoogleChrome/workbox](https://github.com/GoogleChrome/workbox) | MIT | principe « réseau d'abord » repris dans un service worker écrit à la main (`sw.js`, sans dépendance) : jeu installable et jouable hors ligne |

Écartés : [shipshapecode/shepherd](https://github.com/shipshapecode/shepherd) (AGPL / licence commerciale) et [usablica/intro.js](https://github.com/usablica/intro.js)
(AGPL / licence commerciale) : licences non libres pour un usage sans publier tout le jeu. Pistes : jsPDF (MIT, bilan de saison en PDF),
qrcode-generator (MIT, partager une partie par QR code), i18next (MIT, traduction).

## Bibliothèques hors football, 3e lot (v27)

| Projet | Licence | Dans le jeu |
|---|---|---|
| [tristen/tablesort](https://github.com/tristen/tablesort) 5.7.1 | MIT | tous les tableaux à en-têtes se trient d'un clic (▲/▼), avec un tri adapté aux montants (« 4,8 M€ » < « 123 M€ », « k€/mois ») |
| [inorganik/countUp.js](https://github.com/inorganik/countUp.js) 2.10.1 | MIT | le budget de l'en-tête défile jusqu'à sa nouvelle valeur après une recette ou une dépense importante |
| [parallax/jsPDF](https://github.com/parallax/jsPDF) 4.2.1 | MIT | « 📄 PDF » sur la Chronique (et Ctrl+K) : bilan de carrière — chronique, classement, finances, meilleurs joueurs |

Repérées : simple-statistics (ISC, statistiques), Micromodal (MIT, fenêtres accessibles), floating-ui (MIT, infobulles) — pistes.

## Bibliothèques hors football, 4e lot (v28)

| Projet | Licence | Dans le jeu |
|---|---|---|
| [ghosh/Micromodal](https://github.com/ghosh/Micromodal) 0.7.0 | MIT | toutes les fenêtres deviennent de vrais dialogues : rôle annoncé, focus piégé (Tab), Échap, retour du focus |
| [floating-ui/floating-ui](https://github.com/floating-ui/floating-ui) 1.8.0 | MIT | infobulles positionnées à la place des bulles natives ; explication de chaque attribut des joueurs au survol |
| [simple-statistics/simple-statistics](https://github.com/simple-statistics/simple-statistics) 8.0.0 | ISC | Analyse → « Tendances de la saison » : forme (régression), projection de fin de saison, régularité, efficacité, joueurs en progression / en baisse |

## Esthétique (v29)

| Projet | Licence | Dans le jeu |
|---|---|---|
| [lucide-icons/lucide](https://github.com/lucide-icons/lucide) (lucide-static 1.66.0) | ISC | 41 icônes au trait remplacent les émojis du menu, de la barre mobile, du tiroir, du fil d'Ariane et du bouton principal (sprite SVG intégré : `js/icones.js`) |
| [rsms/inter](https://github.com/rsms/inter) (@fontsource/inter 5.3.0) | OFL-1.1 | police de l'interface (400 à 800), chiffres tabulaires dans les tableaux |
| [argyleink/open-props](https://github.com/argyleink/open-props) 1.7.23 | MIT | courbes d'animation et ombres utilisées par `theme.css` |

`theme.css` (chargé après style.css) : boutons en relief avec survol, appui et anneau de focus clavier ; bouton principal qui pulse
quand une décision bloque ; cartes avec ombre et reflet ; onglets en segments ; champs avec focus coloré ; en-têtes de tableaux
en petites capitales ; barres de défilement discrètes ; cartes de club animées sur l'accueil ; animations coupées si
« réduire les animations ».

## Fonctionnalités inspirées (v30)

Peu de dépôts réutilisables trouvés cette fois (recherches « traits », « records », « achievements » : projets sans licence ou hors sujet).
Mise en œuvre originale d'idées déjà repérées :
- **Traits cachés** (pitch-to-glory : traits révélés avec le temps ; League-Soccer/GameplayFootball : traits de joueurs) — 8 traits
  (Fragile, Robuste, Bosseur, Dilettante, Leader, Joueur de grands matchs, Nerveux, Fidèle) avec effets réels.
- **Records et Panthéon** (pitch-to-glory : records et Hall of Fame).

## Vie du jeu (v31)

Idées reprises (code et textes originaux, en français) :
| Source | Licence | Idée |
|---|---|---|
| [FredericusRadicalus/retroFootballManager](https://github.com/FredericusRadicalus/retroFootballManager) | MIT | événements aléatoires légers → 10 événements à choix (bienfaiteur, photo embarrassante, pelouse, visite à l'hôpital, match amical, colère des supporters, grand club qui rôde, tournage, rénovation cofinancée, campagne publicitaire) |
| [DWYCA-org/FMNarrative](https://github.com/DWYCA-org/FMNarrative) | MIT | conférences de presse selon le contexte → avant-match : grand match, série de défaites, leader, rumeur de départ, crise de blessés, lutte pour le maintien |
| [openfootmanager/openfootmanager](https://github.com/openfootmanager/openfootmanager) | GPL-3.0 (idée seulement) | sélectionneur national → offre après une saison dans le top 2 avec objectif atteint, cumul avec le club |

## Lot de 30 dépôts GitHub (v32)

Bibliothèques (dans `vendor/`, licences conservées) — [lipis/flag-icons](https://github.com/lipis/flag-icons) (MIT), [michaelwittig/node-i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries) (MIT), [markedjs/marked](https://github.com/markedjs/marked) (MIT), [cure53/DOMPurify](https://github.com/cure53/DOMPurify) (Apache-2.0 ou MPL-2.0), [iamkun/dayjs](https://github.com/iamkun/dayjs) (MIT), [EvanHahn/HumanizeDuration.js](https://github.com/EvanHahn/HumanizeDuration.js) (Unlicense), [mholt/PapaParse](https://github.com/mholt/PapaParse) (MIT), [eligrey/FileSaver.js](https://github.com/eligrey/FileSaver.js) (MIT), [kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT), [pieroxy/lz-string](https://github.com/pieroxy/lz-string) (MIT), [crashmax-dev/fireworks-js](https://github.com/crashmax-dev/fireworks-js) (MIT), [micku7zu/vanilla-tilt.js](https://github.com/micku7zu/vanilla-tilt.js) (MIT), [gka/chroma.js](https://github.com/gka/chroma.js) (BSD-3-Clause et Apache-2.0), [sindresorhus/screenfull](https://github.com/sindresorhus/screenfull) (MIT), [richtr/NoSleep.js](https://github.com/richtr/NoSleep.js) (MIT), [Choices-js/Choices](https://github.com/Choices-js/Choices) (MIT), [juliangarnier/anime](https://github.com/juliangarnier/anime) (MIT), [laurentpayot/minidenticons](https://github.com/laurentpayot/minidenticons) (MIT), [dharmatype/Bebas-Neue](https://github.com/dharmatype/Bebas-Neue) (OFL-1.1), [i18next/i18next](https://github.com/i18next/i18next) (MIT), [jamiebuilds/tinykeys](https://github.com/jamiebuilds/tinykeys) (MIT), [rstacruz/nprogress](https://github.com/rstacruz/nprogress) (MIT), [formkit/auto-animate](https://github.com/formkit/auto-animate) (MIT), [game-icons/icons](https://github.com/game-icons/icons) (CC BY 3.0 (attribution)).

Données (faits dérivés dans `js/donnees_ouvertes2.js`, générés par `outils/donnees_ouvertes2.py`) :
[datasets/country-codes](https://github.com/datasets/country-codes) (ODC-PDDL, codes FIFA → ISO), [mledoze/countries](https://github.com/mledoze/countries)
(ODbL, régions et noms français), [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) (CC0, 22 vainqueurs),
[openfootball/euro.json](https://github.com/openfootball/euro.json) (CC0), [openfootball/champions-league](https://github.com/openfootball/champions-league)
(CC0, 15 finales), [SkillCorner/opendata](https://github.com/SkillCorner/opendata) (MIT, agrégats physiques A-League 2024/25 → distances par poste).
Écartés : typed.js (GPL-3.0), progressbar.js (dépendances).

## Lot v36 — six dépôts proposés
| Dépôt | Licence | Usage |
|---|---|---|
| ML-KULeuven/socceraction | MIT | xT porté en JS (`js/xthreat.js`) ; VAEP : piste future |
| jokecamp/FootballData | MIT (données de sources diverses) | cotes Pinnacle → forme du nul et marge ; GPS de 136 stades |
| probberechts/soccerdata | Apache-2.0 | extracteur FBref/ClubElo/Sofascore… à lancer chez soi ; pas d'accès réseau ici |
| hudl/open-data (StatsBomb) | accord d'utilisation propriétaire | non intégré : redistribution et usage commercial interdits |
| hugomathien/football-data-collection | aucune | idées seulement (base européenne Kaggle) |
| abdullahtarek/football_analysis | aucune | idées seulement (vitesse, distance, possession par vidéo) |

## Lot v37 — cinq dépôts proposés
| Dépôt | Licence | Usage |
|---|---|---|
| openfootball/football.json | CC0 | palmarès réel recalculé 2010-2027 (12 pays) |
| ZOXEXIVO/open-football | Apache-2.0 | textes FR d'adaptation, réservoirs de noms (70 pays) ; joueurs non repris (provenance) |
| openfootmanager/openfootmanager | GPL-3.0 | idées seulement |
| ho-dev/HattrickOrganizer | LGPL-3.0 | idées seulement (prédiction de match par notes de secteurs) |
| Kasnm1/football-manager-ODD | code consultable, pas de licence libre | idées seulement |

## À faire (pistes issues de la recherche)
1. ~~Importer transfermarkt-datasets~~ (fait en v19 : `outils/importer_transfermarkt.py`).
2. Brancher les médianes d'indemnités (par championnat, âge, poste) dans l'IA du mercato.
3. Calibrer tirs, passes et xG du moteur avec StatsBomb open-data (usage personnel).
4. Vérifier les points « à vérifier » de l'écran Règlement (ordre des critères de départage en France, seuils financiers 2026/27).

