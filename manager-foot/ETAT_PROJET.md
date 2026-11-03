# État du projet — v37 (3 novembre 2026)

## v37 — palmarès réel, adaptation des recrues, noms de 70 pays
- **Palmarès réel** (`js/palmares_reel.js`, `outils/palmares_reel.py`) : classements recalculés depuis openfootball/football.json (CC0)
  pour 12 pays, jusqu'à 4 divisions, de 2010-11 à 2026-27 (en cours). Ils s'affichent sous les règlements de chaque pays :
  champion, dauphin, buts par match, part des victoires à domicile et clubs les plus titrés.
  Vérification : Ligue 1 2023-24 PSG 76 pts, Premier League 2023-24 Man City 91, Serie A 2023-24 Inter 94.
- **Adaptation des recrues** : de temps en temps, une nouvelle raconte l'adaptation d'un joueur qui n'est pas encore intégré
  (mal du pays, langue, famille, parrain…). Les textes français viennent d'open-football (Apache-2.0) et le choix suit le niveau d'intégration ;
  il est fait par empreinte, sans tirage aléatoire, donc l'avenir de la partie ne change pas.
- **Noms générés** : réservoirs de prénoms et de noms d'open-football pour 70 pays (Arménie, Estonie, Kenya…), en plus des noms existants.
- Non intégrés : openfootmanager (GPL-3.0), HattrickOrganizer (LGPL-3.0), football-manager-ODD (code consultable, sans licence libre) :
  simples idées. Les 85 000 joueurs d'open-football ne sont pas repris non plus : leurs attributs reprennent le format de Football Manager
  et leur provenance n'est pas claire.
Vérifications : simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v36 — menace attendue (xT), cotes 1N2, déplacements
- **xT** (`js/xthreat.js`) : portage JavaScript de `socceraction/xthreat.py` (ML-KULeuven, MIT). La grille 16 × 12 (`js/xt_grille.js`)
  est ajustée par `outils/xt_generer.js` sur 1 066 matchs du moteur (1 million de déplacements, 21 600 tirs). Chaque passe,
  centre ou dribble réussi rapporte xT(arrivée) − xT(départ) au joueur. On le voit dans l'analyse du match (classement et carte),
  la fiche du joueur (xT et xT/90) et les statistiques (catégorie « Menace créée »).
- **Cotes 1N2** dans l'avant-match (`js/avant_match.js`) : la force des deux onze donne l'espérance de points (logistique ajustée sur
  le moteur). La probabilité de nul et la marge (2,6 %) viennent de vraies cotes Pinnacle sur 86 000 matchs de 22 pays
  (jokecamp/FootballData, MIT ; `outils/cotes_reelles.py`). Contrôle sur 87 matchs : victoires à domicile 44 % prévues pour 41 % observées,
  nuls 27 % prévus pour 23 % observés.
- **Déplacement** : distance entre les deux stades (136 stades d'Angleterre, d'Écosse, de France, d'Allemagne et d'Espagne, jokecamp/FootballData,
  `outils/stades_gps.py`). Elle ne s'affiche qu'en mode vrais clubs.
- Non intégrés : hudl/open-data (données StatsBomb : redistribution et usage commercial interdits), hugomathien/football-data-collection et
  abdullahtarek/football_analysis (sans licence, simples idées), soccerdata (Apache-2.0, extracteur web à lancer sur ton PC, pas de données incluses).
Vérifications : simulation longue (2 graines × 2 saisons) sans erreur ; audit des 27 écrans sans erreur.

## v35 — audit complet et équilibre des buteurs
- Audit automatique de tous les écrans (27) à 1366 px et 390 px : aucune erreur, aucun débordement horizontal, aucun écran vide ;
  affichage de 58 à 265 ms (`tests/audit_ecrans.js`).
- Équilibre : la finition d'élite est adoucie au-delà de 14/20 dans le moteur (pente × 0,55, penalties exclus). Meilleur buteur d'une
  saison simulée : 41 → 34 buts en championnat (D1), 43 → 36 (D2) ; buts par match conservés (2,31-2,66), nuls 25-31 %.
  Test : `tests/buteurs.js`.
Vérifications : simulation longue sans erreur ; effet du jeu de tête toujours visible.

## v34 — le moteur de match joue avec les 37 attributs
Nouveau `js/moteur37.js` : `Match.prototype.ea` renvoie une combinaison d'attributs détaillés selon l'action en cours
(tir : finition, frappe lointaine au-delà de 22 m, tête, penalty, coup franc, face-à-face ; passes courte/longue/vers l'avant/en profondeur ;
centre ; dribble et duel ; jeu aérien ; hors-jeu ; gardien : réflexes, plongeon, placement, sorties). Moyennes pondérées sur la même
échelle 1-20 : calibrage conservé. Désactivable (`window.MOTEUR37 = false`).
Vérifications : calibrage 120 matchs × 3 divisions sans / avec (2,28-2,63 → 2,43-2,64 buts, 16-29 % de nuls) ; effet ciblé : buteur
+7 en tête et détente → 177 têtes au lieu de 153, réussite 12 % au lieu de 9 %, 22 buts de la tête au lieu de 14 (114 matchs) ;
simulation longue et 6 scénarios de barrages sans erreur. Tests : `tests/moteur37_calibrage.js`, `tests/moteur37_effet.js`.

## v33 — 37 attributs par joueur, note de poste, percentiles, 34 statistiques
Nouveau `js/attributs.js` ; `outils/scenario.py` et `js/monde.js` transmettent les sous-notes réelles (sur 99) du pack.
- 37 attributs sur 20 en 4 familles : technique (12), mental (11), physique (8), gardien (6). Modèle propre au jeu (liste, regroupement et
  pondérations originaux, pas ceux d'un autre jeu). Sources : sous-notes réelles du pack quand elles existent (ramenées sur 20, plus la
  progression en jeu), sinon dérivation des 9 qualités du moteur avec un profil stable propre au joueur.
- Note de poste = moyenne pondérée de 10-11 attributs clés du poste (sur 20 et sur 100) ; 3 meilleurs postes ; percentile de chaque attribut
  parmi les joueurs du même poste (infobulle) ; valeurs en fourchette tant que le joueur n'est pas connu (recrutement).
- Onglet Statistiques : 34 statistiques de saison (par match, par 90 min, xG, conversion, passes, défense, discipline…).
- Le moteur de match garde ses 9 attributs : rien ne change dans les résultats.
Vérifications (Chromium) : 37 attributs, profil identique au rechargement, corrélation 0,975 entre la note de poste et l'ancienne note
(écart moyen 2 points), sous-note réelle 95/99 → 19/20, percentile, 34 statistiques, simulation longue sans erreur.

## v32 — 30 dépôts GitHub de plus
`js/lot30.js`, `js/donnees_ouvertes2.js` (+ `outils/donnees_ouvertes2.py`), 24 dossiers ajoutés dans `vendor/` (détail : vendor/LISEZMOI.md).
- Vrais drapeaux, noms et régions des nations ; écran **Aide** (documentation) ; durées en toutes lettres ; export **CSV** ; **défi partageable**
  (lien + QR code : même graine, même club, même règlement, testé dans un second onglet) ; feu d'artifice au titre ; cartes de club en relief ;
  texte lisible sur les couleurs du club ; **plein écran** et écran allumé pendant le match ; listes longues avec recherche ; animation du score
  sur un but ; avatars générés ; police d'affichage des scores ; **interface en anglais** (partielle, Options) ; raccourcis « g puis … » et « ? » ;
  barre de progression des vacances ; listes animées ; **palmarès réels** (Coupe du monde, Euro, Ligue des champions) ; **profil physique**
  estimé (SkillCorner) ; trophées illustrés.
Vérifications (Chromium) : 20 bibliothèques globales présentes, 25 drapeaux sur l'effectif, noms (Croatie, Corée du Sud…), « 3 semaines et 2 jours »,
CSV téléchargé, Aide rendue, QR code, défi rejoué (même graine et club), palmarès, raccourci g f → Finances, feu d'artifice, navigation en anglais,
couleur d'encre calculée, simulation longue 2 graines × 2 saisons sans erreur.

## v31 — événements aléatoires, conférences de presse d'avant-match, sélectionneur national
Nouveau `js/vie_du_jeu.js` (chargé après `js/traits.js`).
- Un sujet en attente à la fois (`G.evt`), visible dans « À faire » ; fenêtre à choix ; sans réponse, choix par défaut la semaine suivante ;
  en simulation automatique, choix par défaut immédiat. Tirage stable (empreinte graine + semaine), historique `G.evtHist`.
- Effets : argent (journal comptable), confiance du président, supporters, moral (équipe ou joueur), condition, places du stade,
  niveau de prix des billets, prolongation d'un jeune.
- Conférence d'avant-match (environ un match sur deux quand le contexte s'y prête) ; événement aléatoire environ une semaine sur dix.
- Sélectionneur : offre en fin de saison (top 2 + objectif atteint), +2 de force pour la sélection, bilan des tournois, titre = président
  et supporters en hausse.
Vérifications (Chromium) : 8 sujets en 30 semaines, choix par défaut appliqué sans réponse, réponse par la fenêtre (supporters 60 → 66,
prix des billets 2 → 1), offre de sélection acceptée (+2), simulation longue (11 sujets sur 2 saisons) et 6 scénarios de barrages sans erreur.

## v30 — traits cachés, records et Panthéon
Nouveau `js/traits.js`.
- 0 à 2 traits par joueur, stables (tirés de l'identifiant, sans toucher l'aléatoire de la partie), incompatibilités respectées.
- Révélation : 1er trait après 6 matchs avec toi, 2e après 15 ; rapport de recrutement complet = traits connus. Message à chaque découverte.
- Effets : Fragile ×1,5 / Robuste ×0,7 sur la durée des blessures ; Bosseur +1 attribut en fin de saison (≤ 31 ans), Dilettante −1 une saison
  sur deux ; Leader titulaire = moral du vestiaire en hausse chaque semaine ; Fidèle = moral stabilisé ; Grands matchs / Nerveux = ±0,4 de note
  en coupe, en Europe, en barrages et en supercoupe.
- Fiche joueur : badges des traits connus (infobulle d'explication) + nombre de traits à découvrir.
- Chronique : records du club (plus large victoire, plus lourde défaite, plus de buts, record d'achat et de vente, meilleure saison)
  et Panthéon (60 matchs ou 25 buts avec le club).
Vérifications : répartition (1 748 joueurs sans trait sur 4 200, 8 traits ~ 330-365 chacun), traits identiques après recalcul,
blessure de 20 jours → 30 (Fragile) / 14 (Robuste) / 20, 12 traits révélés sur 19 après une saison, records et Panthéon affichés,
simulation longue sans erreur. Test : `tests/traits.js`.

## v29 — refonte visuelle : icônes, police, boutons, composants
`vendor/lucide/`, `vendor/inter/`, `vendor/open-props/` (licences incluses) + `js/icones.js` (sprite), `js/theme.js`, `theme.css`.
Vérifications (Chromium, 1366 px et 390 px) : police Inter chargée, 33 icônes posées, aucun écran de navigation sans icône, rendu des
traits corrigé (fill none sur chaque icône), bouton principal sans flèche en double, simulation longue sans erreur.

## v28 — accessibilité, infobulles, tendances statistiques
`vendor/micromodal/`, `vendor/floating-ui/`, `vendor/simple-statistics/` (licences incluses) + `js/accessibilite.js`.
- Fenêtres (Micromodal) : boîte avec identifiant unique à chaque ouverture (Micromodal mémorise par identifiant), role=dialog,
  aria-modal, aria-labelledby, focus piégé, Échap ; les fenêtres bloquantes (sans bouton de fermeture) gardent leur comportement.
- Infobulles (floating-ui) : les attributs title deviennent des infobulles positionnées (souris et clavier) ; aide sur les 9 attributs.
- Tendances (simple-statistics) : régression de la forme (moyenne glissante sur 5 matchs), projection au rythme actuel et selon la
  tendance, buts pour/contre et écart-type, efficacité buts/xG, 3 joueurs en progression et 3 en baisse (pente des notes).
Vérifications (Chromium) : rôle de dialogue et focus dans la fenêtre après 40 Tab, Échap ferme, ouvertures successives sans erreur,
infobulle d'attribut affichée, tendances calculées après 10 matchs, simulation longue sans erreur.

## v27 — tri des tableaux, chiffres animés, bilan PDF
`vendor/tablesort/`, `vendor/countup/`, `vendor/jspdf/` (MIT, licences incluses) + `js/outils_ui.js`.
- Tri d'un clic sur tous les tableaux à en-têtes (observateur sur l'écran et les fenêtres), tri numérique français (M€, k€, notes, âges).
- Budget de l'en-tête animé (désactivé si « réduire les animations »).
- Bilan de carrière PDF (A4, bandeau aux couleurs du club).
Vérifications (Chromium) : tri croissant/décroissant des valeurs du mercato correct, PDF généré et relu, simulation longue sans erreur.

## v26 — visite guidée, export en image, application installable
`vendor/driver/`, `vendor/html-to-image/` (licences MIT) + `js/visite.js` ; `manifest.webmanifest`, `sw.js`, `icone.svg`.
- Visite guidée (driver.js) : en-tête, bouton principal, « À faire », navigation (menu ou barre mobile), palette ; proposée une fois,
  relançable depuis la palette et les Options ; thème aux couleurs du jeu.
- « 📷 Image » sur la Chronique et les classements (PNG, fond du jeu, double résolution).
- Application installable (manifeste + icône) et hors ligne (service worker « réseau d'abord » : à jour quand le serveur répond,
  copie locale sinon ; /api/ et /img/ jamais mis en cache par le service worker).
Vérifications (Chromium) : visite de 6 étapes lancée seule et menée jusqu'au bout (1366 px et 390 px), PNG du classement téléchargé,
service worker enregistré, simulation longue 2 graines × 2 saisons sans erreur.

## v25 — bibliothèques open source hors football
`vendor/` (canvas-confetti, uPlot, Fuse.js, fflate, ZzFX, avec licences) + `js/extras.js`.
- Confettis + fanfare sur les nouvelles « trophée » de la partie affichée (pas pendant les simulations) et au bilan de saison avec trophée.
- Suivi par journée (`G.suivi` : trésorerie, position) → graphiques uPlot dans Finances et Classements.
- Palette Ctrl+K : résultats « approchés » Fuse.js en plus de la recherche exacte.
- Options : « Exporter compressé (.mfz) » ; accueil : l'import accepte `.mfz` (gzip) et `.json`.
- Sons ZzFX : signature d'un transfert, but de ton équipe en direct.
- Fuse.js et ZzFX sont des modules ES (`vendor/modules.mjs`) : disponibles avec le serveur local, absents en `file://` sans erreur.
Vérifications (Chromium) : 5 bibliothèques chargées, recherche avec lettres inversées trouvée, gzip 3 244 Ko → 448 Ko et aller-retour
identique, graphiques affichés (graduations entières), simulation longue 2 graines × 2 saisons sans erreur.

## v24 — sponsors des tribunes (code MIT copié de retroFootballManager)
- `vendor/retroFootballManager/` : copie intacte de `sponsors.js` et `stadium.js` + LICENSE MIT + commit d'origine.
- `js/tribunes.js` : 4 tribunes (nord, sud, est, ouest), 2 offres par tribune libre à chaque saison (générées sans toucher l'aléatoire
  de la partie), prime de signature de 25 % du montant annuel, paiement à chaque journée de championnat, fin de contrat automatique
  puis nouvelles offres ; montants indexés sur le sponsor maillot de référence (rapports de l'original : 150/400 et 120/400).
- Finances : plan du stade avec les 4 tribunes autour de la pelouse, offres et bouton « Signer ».
Vérifications : prime = 25 % (arrondi), 73 journées restantes après 3 journées sur un contrat de 2 saisons, affichage ordinateur et mobile,
simulation longue 2 graines × 2 saisons sans erreur.

## v23 — centre « À faire » et chronique de carrière
Nouveau `js/hub.js`.
- Tableau de bord : encadré « Continuer va : … » (jouer tel match, simuler la semaine, décider d'abord, clore la saison) + liste
  « À faire » triée par urgence et colorée : décisions obligatoires, négociations, offres reçues, fin de mercato, effectif non conforme,
  déficit au-delà du seuil de sanction, entretiens, cadres en fin de contrat, titulaires blessés, messages non lus — un clic ouvre l'écran.
- Bureau → Chronique : chaque saison racontée (classement, objectif, montée/descente, barrages, coupe, sacre européen, meilleur buteur,
  plus gros achat et plus grosse vente, sanction, licenciement), frise colorée ; saisons antérieures reconstruites depuis l'historique.
Vérifications (Chromium, ordinateur et mobile) : liste « À faire » correcte après une saison simulée et un déficit forcé (8 types d'alertes),
chronique de fin de saison, simulation longue 2 graines × 2 saisons sans erreur.

## v22 — interface plus claire et plus jolie
Nouveau `js/interface.js` + section « Interface v22 » de `style.css`.
- Menu latéral : sections repliables (mémorisées), section active toujours ouverte, bouton « Aller à… ».
- Palette « Aller à… » (Ctrl+K / ⌘K, ou le bouton) : écrans, actions (continuer, sauvegarder, règlement, accueil), joueurs, clubs ;
  recherche sans accents, flèches + Entrée, Échap.
- Mobile (≤ 900 px) : barre d'onglets en bas (Accueil, Effectif, Mercato, Classements, Menu) avec pastilles, tiroir « Menu » avec toutes
  les sections en tuiles, en-tête compact, pas de défilement horizontal.
- Notifications : en bas à droite (pleine largeur au-dessus de la barre sur mobile), 3 au plus, doublons regroupés (×2), fermeture au clic,
  durée selon la longueur, couleur selon le type.
- Fil d'Ariane (section › écran) en haut de chaque écran ; accueil réécrit (titre qui ne chevauche plus, étapes, raccourci) ;
  case « Libres / en vente » du mercato alignée.
Vérifications (Chromium, 1366 px et 390 px) : palette « fin » → Finances, recherche de joueur, tiroir → Finances sans débordement,
notifications regroupées ; simulation longue 2 graines × 2 saisons et 6 scénarios de post-saison sans erreur.

## v21 — mécaniques réelles du mercato, statistiques et transferts réels
- `js/mercato_reel.js` (branché sur `logTransfer`, par lequel passent tous les transferts) : mécanisme de solidarité FIFA (5 %),
  indemnité de formation, limites de prêts FIFA (6/6, 3 avec un même club, exemption des jeunes formés au club), autorisation de
  travail anglaise (GBE, 15 points, commission d'exceptions stable), valeur marchande pondérée par le poste, « formé au club »
  marqué à la promotion des jeunes (et pour les jeunes déjà au club), historique de carrière avec identifiant du club.
- Fiche joueur : statistiques réelles des 3 dernières saisons, transferts réels, clubs formateurs, points GBE ; pied fort et agent réels.
- `outils/importer_transfermarkt.py` : + `appearances` agrégé par saison (table tm_saisons) ; `enrichissements.infos_joueur` :
  + transferts et saisons réels.
Vérifications (Chromium) : solidarité 300 k€ pour un jeune formé 3 saisons revendu 20 M€ entre deux autres clubs (le vendeur garde sa
part de formateur), indemnité de formation 180 k€, 7e prêt entrant refusé, GBE refusé à 6 points / star à 22 points ; mini-base :
saisons réelles agrégées et transfert Barcelona → PSG affichés ; simulation longue 2 graines × 2 saisons sans erreur.
Limites : solidarité et indemnité de formation calculées sur l'historique connu du jeu (pas sur le vrai parcours junior) ;
limites de prêts appliquées aux écrans du joueur seulement (pas à l'IA) ; barème GBE simplifié ; art. 17 post-Diarra non modélisé.

## v20 — sélections nationales réelles, noms crédibles, maillots réels
- `js/donnees_ouvertes.js` (généré par `outils/donnees_internationales.py`, source CC0) + `js/ouvert.js` :
  force des sélections = Elo réel calculé sur 49 940 matchs (niveau 55-86) ; écran International : bilan historique réel et meilleurs
  buteurs ; joueurs générés (centre de formation, monde fictif) nommés avec des prénoms/noms de buteurs du pays, jamais le nom complet
  d'un vrai buteur (14 842 noms exclus, re-tirage).
- `outils/importer_maillots.py` (open-jersey-db, ODbL) : couleurs domicile/extérieur, équipementier et sponsor → couleurs du club et fiche club.
  Ajouté à `Enrichir_Base.bat`.
Vérifications : Elo cohérent (Espagne, Argentine, Angleterre, France en tête) ; noms générés vérifiés (ITA, GER, ESP, BRA, NED) ; Álvaro
Negredo et Kylian Mbappé reconnus comme vrais et exclus ; maillots : PSG et Brest reliés (alias), couleurs allemandes converties ;
écran International dans Chromium sans erreur ; simulation longue 2 graines × 2 saisons sans erreur.
Limites : maillots peu renseignés pour la France dans la source ; filtre des noms limité aux buteurs internationaux.

## v19 — vrais entraîneurs, stades, photos et logos libres, valeurs et contrats réels
Nouveaux outils (bibliothèque standard Python) et `Enrichir_Base.bat` ; module de jeu `js/reel.js` ; détails dans RECHERCHE.md.
- `outils/importer_reep.py` : registre reep (CC0) → liens joueurs/clubs ↔ Wikidata (identifiant EA, Transfermarkt, nom + naissance), tailles complétées.
- `outils/importer_transfermarkt.py` : transfermarkt-datasets (CC0) → entraîneur, stade, capacité, valeur de l'effectif ; valeur marchande,
  fin de contrat, pied, agent des joueurs ; transferts. Club ↔ club Transfermarkt par vote des joueurs de l'effectif (≥ 3 et ≥ 60 %).
- `outils/enrichir_wikidata.py` : entraîneurs en poste (tous niveaux, avec photo), logos et photos libres (Commons), stades, couleurs,
  fondation, effectifs actuels des clubs sans joueurs notés. Requêtes groupées, pauses, identification du programme.
- `outils/importer_clubelo.py` : Elo du jour → réputation des clubs sans joueurs notés.
- `outils/enrichissements.py` : lecture tolérante (sans import, rien ne change) ; `scenario.py` et le gestionnaire d'images l'utilisent
  (route `/img/wd/<QID>` pour les personnes Wikidata ; logo Commons en repli).
- Jeu (`js/reel.js`) : vrai stade et capacité, fondation, valeur de l'effectif et **entraîneur réel** sur la fiche club ; ton entraîneur
  (mode directeur sportif) prend l'identité de l'entraîneur réel (compétences de jeu estimées) ; fiche joueur : valeur, fin de contrat
  (→ durée du contrat en jeu), pied, agent ; joueurs d'effectif venus de Wikidata marqués comme estimés.
Vérifications : `outils/tests_enrichissements.py` (vrai registre reep + réponses Transfermarkt/Wikidata simulées au format réel) :
liens Mbappé (EA) et Dembélé (Transfermarkt), PSG ↔ Q483020, entraîneur Luis Enrique fusionné Transfermarkt + Wikidata (âge, photo),
Parc des Princes 47 929 places, effectif complété sans doublon, URLs Commons servies, Elo → réputation (Brest 62).
Navigateur : fiche club et fiche joueur affichent les données réelles, message de bienvenue avec le vrai entraîneur ; simulation longue
2 graines × 2 saisons sans erreur.
Limites : **non exécuté contre les vrais services** (Wikidata, Commons, stockage transfermarkt-datasets et ClubElo bloqués dans cette
session) : à lancer sur ton PC avec `Enrichir_Base.bat` ; liens de clubs par nom (des homonymes peuvent rester non reliés) ;
staff technique toujours généré ; photos Transfermarkt volontairement non utilisées (droits).

## v18 — post-saison jouable, coupes nationales, mercato et contrôle financier par pays
Tout dans `js/reglements.js`.
- **Barrages, play-offs, playouts et matchs d'appui jouables** : si ton club est concerné, ses matchs s'ajoutent au calendrier
  après la dernière journée (semaines « P », aller/retour, terrain neutre pour les finales) et se jouent avec le vrai moteur.
  Le tour suivant n'apparaît qu'en cas de qualification (ex. échelle de Ligue 2 : 5e contre 4e, puis contre le 3e, puis barrage).
  Les autres duels restent simulés ; tous les résultats sont mémorisés (`G.post`), la fin de saison reprend exactement les mêmes.
  Règle « le mieux classé passe à égalité » respectée (Segunda, Serie B, Serie C, Primera Federación).
- **Coupes nationales** : Coupe de France, FA Cup, DFB-Pokal, Copa del Rey, Coppa Italia ; règle du club recevant propre à chaque
  coupe (le petit reçoit / tirage / tête de série) ; finale sur terrain neutre.
- **Mercato** : limite de joueurs non-UE appliquée à la signature et au prêt (France 4, Espagne 3), avec message explicite.
- **Contrôle financier de fin de saison** (club du joueur) : seuil = déficit de 30 % / 60 % de la masse salariale annuelle.
  France (DNCG) et Allemagne (licence) : recrutement bloqué puis rétrogradation administrative (un club du niveau inférieur est repêché) ;
  Angleterre : embargo puis −9 (Premier League) / −12 points (EFL) ; Italie : blocage puis −4 points ; Espagne : recrues non inscrites.
  Alerte aux deux tiers de la saison ; pénalité affichée dans le classement et l'écran Règlement.
- Bilan de fin de saison : liste des barrages et play-offs.
Vérifications (Chromium) : `tests/reglements_post.js` (6 scénarios : Ligue 2 5e, Ligue 1 16e, Championship 3e, Serie B 17e,
2. Bundesliga 3e, Segunda 6e : semaines ajoutées, journal identique aux matchs joués, 0 erreur d'invariant) ;
`tests/reglements_sanctions.js` (5 pays : nom de coupe, club recevant, sanction, −12 / −4 points au classement sans incohérence,
rétrogradation administrative ; refus du 5e non-UE en France) ; simulation longue 3 graines × 2 saisons sans erreur.
Limites : demi-finales aller-retour des coupes espagnole et italienne jouées en match unique ; sanctions financières pour le club
du joueur seulement ; play-offs de Serie C toujours simplifiés.

## v17 — règlements des championnats + calibrage par données ouvertes
Nouveau fichier `js/reglements.js` (chargé en dernier) ; recherche détaillée dans `RECHERCHE.md`.
- **Règlements 2026/27, 5 pays, 3 niveaux et plus** : France (Ligue 1, Ligue 2, Ligue 3), Angleterre (Premier League → League Two),
  Allemagne (Bundesliga, 2. Bundesliga, 3. Liga), Espagne (LaLiga, Segunda, Primera Federación en 2 groupes), Italie (Serie A, Serie B,
  Serie C en 3 groupes). Chaque règle porte un statut : officiel / simplifié / à vérifier.
- Départage propre à chaque pays (confrontations directes d'abord en Espagne et en Italie, différence de buts ailleurs), tirage stable
  (ne change pas le futur), match d'appui en Serie A (titre, maintien).
- Fin de saison : montées et descentes directes, play-offs (échelle Ligue 2, demi-finales + finale à Wembley, tableau Serie B avec
  « 14 points d'avance », tableaux croisés Primera Federación, Serie C simplifiée), barrages aller-retour (Ligue 1/Ligue 2, Ligue 2/Ligue 3,
  Relegation allemande), playouts (Serie B, Serie C, annulés au-delà de l'écart réglementaire), équipes réserves bloquées
  (Allemagne, Espagne, Italie), répartition dans le groupe le moins rempli, équilibre montées = descentes.
- Monde réel : les montées/descentes sont désormais appliquées automatiquement, y compris pour les niveaux à groupes (désactivable).
- Monde fictif : **3e division** (« National Pro 3 », 18 clubs, ajoutée après les clubs étrangers : divisions 1 et 2 inchangées ;
  bouton « Base d'origine » pour l'obtenir si une base modifiée est enregistrée) et choix du règlement sur l'accueil.
- Écran **Compétitions → Règlement** : fiches par pays, sources, conformité de l'effectif (non-UE, liste de 25, formés localement,
  joueurs allemands), journal des barrages ; zones colorées dans les classements (montée, play-offs, barrage/playout, relégation).
  Alerte d'effectif non conforme à la fermeture des mercatos.
- **Calibrage par division** : buts à domicile / à l'extérieur des vrais championnats (openfootball, CC0) appliqués aux matchs de
  championnat (`matchCalib`). Avant : D2 1,72 but/match et 41 % de nuls ; après : 2,3 à 2,7 buts, 24 à 27 % de nuls.
Vérifications : simulation longue 3 graines × 2 saisons (monde fictif, 3 divisions) sans erreur d'invariant ni plantage ;
monde synthétique 5 pays × 3 graines (`tests/reglements_groupes.js`) : tailles de championnats conservées, groupes équilibrés,
niveaux cohérents, aucune réserve promue trop haut ; écran Règlement et classements vérifiés dans Chromium (bureau et mobile 390 px).
Limites : monde réel non testé ici (base Football_Monde absente de la session) ; relégations hors du dernier niveau simulé non
appliquées ; play-offs de Serie C simplifiés (2e-5e au lieu de 28 clubs) ; fair-play non suivi (remplacé par le tirage) ;
conformité « formé localement » approchée par la nationalité ; barrages simulés en rapide (pas jouables en direct).

## v16 — lot 5 (vie du club)
Nouveau fichier `js/vieclub.js` : demandes du coach négociables (accepter, alternative, différer, refuser avec motif), relation
en 4 axes (accord sportif, confiance, promesses, autorité), réunion de projet d'avant-saison (3 priorités max), influence progressive,
succession du capitaine, parrainage et cours de langue des recrues, suivi des promesses, réunions à effet décroissant, prêts détaillés
(rôle, concurrence, encadrement, part du salaire, rappel en hiver), bilan mensuel des prêts, identité durable du club.
Correction : le bonus automatique de progression des joueurs prêtés (+15 %) est remplacé par un effet des minutes réellement jouées.
Vérifications : réunion de projet (décision bloquante, poids des objectifs), 5 options face au coach (refus « budget » non crédible si le budget existe : confiance 53 → 47), report puis nouvelle demande, effet de réunion divisé par 2 à la répétition, vice-capitaine qui reprend le brassard, prêt détaillé (rôle, 50 % du salaire, rappel), intégration 30 → 37 % en une semaine (parrain + cours), simulation 2 graines × 1 saison sans erreur.
Limites : relations professionnelles du DS et appartenances multiples encore peu exploitées ; bilan du projet visible dans les messages seulement.

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
