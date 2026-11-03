# État du projet — v82 (3 novembre 2026)

## Rapport après chaque match (js/rapport_match.js)
- Message « Rapport de match » après chaque match de ton club : score, buteurs et passeurs (domicile à gauche, extérieur à droite), possession, tirs, tirs cadrés, xG, corners, fautes, notes de tes joueurs (minutes, buts, passes décisives, couleur selon la note ; clic → fiche), homme du match. Toujours envoyé, hors limite de messages.

# État du projet — v81 (3 novembre 2026)

## Recherche de joueurs avancée (js/recherche_avancee.js, Mercato › Recherche)
- Filtres : nom, postes (plusieurs à la fois), âge min et max, nationalité, pays du club (ou sans club), championnat, pied, fin de contrat, valeur max, salaire max, libres ou en vente, observés ou non, jusqu'à 3 attributs avec un minimum (ex. Tacle ≥ 12).
- Colonnes : chaque attribut filtré + une colonne d'attribut libre ; tri par clic sur n'importe quel en-tête (âge, valeur, salaire, contrat, club, attribut…).
- Joueur non observé : attribut estimé (milieu de la fourchette affichée sur sa fiche) ou « ? » selon les préférences — la recherche ne révèle jamais la vraie valeur.
- Rendu : ~140 ms sur tous les joueurs du monde fictif ; 200 résultats affichés.

# État du projet — v80 (3 novembre 2026)

## Fiche joueur compacte et personnalisable (js/fiche_joueur.js)
- Onglet Profil façon Football Manager : attributs détaillés à gauche (technique, mental, physique côte à côte), informations à droite ; texte plus petit, fenêtre plus large. Hauteur : 2 379 px → 963 px.
- « Personnaliser » (en-tête de la fiche) : afficher ou masquer chaque bloc (informations, traits, profil physique, évolution et avis du staff, données réelles, parcours, analyse du profil, 9 qualités de base) ; mémorisé pour toutes les fiches.

# État du projet — v79 (3 novembre 2026)

## Préférences de partie (js/preferences_partie.js) — au début de chaque nouvelle partie, puis dans Options
- Championnats simulés : décocher ceux qu'on ne veut pas (championnats réels ajoutés ; clubs et joueurs retirés pour toute la partie, semaines plus rapides).
- Joueurs non observés : fourchette par attribut ou « ? » partout. La fourchette n'est plus centrée sur la vraie valeur (avant : v ± 2, qui la révélait) ; largeur selon le recruteur.
- Note globale masquée (comme Football Manager) : badges de note et colonnes « Note » cachés partout, jugement sur les attributs.
- Messages : normal (6 par semaine) ou peu (3) ; au-delà, dans le résumé de la semaine (questions, blessures, direction et résultats toujours envoyés).

## Corrections monde étendu
- Effectif : onglets Équipe première / Réserve / Tous (+ lien U19) ; avant, 92 joueurs mélangés.
- Nationalité absente de la source : « — » au lieu de « UNK ».
- Menu : le bouton « Tous les pays » écrasait le menu de gauche.

# État du projet — v78 (3 novembre 2026)

## Les 40 meilleurs championnats du monde et plus (monde étendu)
- Classement de niveau type Opta (réputation du meilleur club par championnat) : on garde tout ce qui est au-dessus d'une D1 moyenne d'Europe de l'Est. Les D2 et D3 des 5 grands pays (déjà dans le monde étendu : Championship, League One, 2. Bundesliga, 3. Liga, Serie B et C, Ligue 2, National, LaLiga 2, Primera Federación) passent ainsi devant les petites D1 (Estonie, Lituanie…).
- Total : 51 championnats — 18 compétitions FM26 (5 pays, D1 à D3) + 23 européens (Portugal, Pays-Bas, Belgique, Turquie, Russie, Écosse, Autriche, Grèce, Tchéquie, Croatie, Suisse, Danemark, Ukraine, Norvège, Serbie, Pologne, Suède, Roumanie, Hongrie, Chypre, Bulgarie, Azerbaïdjan, Slovaquie) + 10 hors d'Europe (Brésil, Argentine, Mexique, MLS, Japon, Colombie, Chine, Égypte, Maroc, Australie). 892 clubs, ~28 500 joueurs.
- Sources : openfootball football.json (Amériques, Asie, Afrique ajoutées à `outils/palmares_reel.py` et `outils/ligues_europe_clubs.py`) + europe (CC0) ; palmarès réels et calibrage aussi pour ces pays.
- Vitesse : `weeklyFinances` calculait la masse salariale en reparcourant tous les joueurs pour chaque club (892 × 28 000) → un seul passage. Semaine simulée : 2,6 s → 1,6 s (monde étendu sans ces ligues : 1,2 s) ; gain valable dans tous les modes.
- Saison complète testée (champions : Slavia Prague, FC Copenhague, Hajduk Split, Ludogorets…).

# État du projet — v77 (3 novembre 2026)

## Fin de formation des U19 et responsable du centre de formation (js/centre_formation.js)
- Nouveau membre du staff : « Responsable du centre de formation » (créé aussi dans les anciennes parties ; marché, entente et carrière comme les autres).
- Six semaines avant la fin de saison : question « Fin de formation : N U19 à décider », avec son avis pour chaque U19 de 18 ans et plus (contrat pro, contrat réserve ou ne pas garder) et la raison (potentiel estimé, plus ou moins juste selon son niveau, comparé au niveau de l'équipe première).
- Toi : suivre ses recommandations, décider joueur par joueur (Formation › U19, colonne « Fin de formation »), ou ne garder personne.
- Fin de saison : contrat pro (équipe première, 3 ans) ou réserve (2 ans), salaires ajustés ; sans décision → non conservé (libre). Bilan dans la messagerie. Testé : 1 pro, 1 réserve, 3 non conservés.

# État du projet — v76 (3 novembre 2026)

## Accueil refait (js/accueil.js)
- Bug corrigé : la carte d'une sauvegarde portait la classe `.slot`, aussi celle des postes du terrain de la tactique (position absolue, 84 px) → à la reprise d'une partie, carte écrasée et sortie de sa colonne.
- Nouvelle organisation : « Continuer » (dernière partie en grand, un bouton) · « Nouvelle partie » en trois cartes (Monde étendu recommandé, Monde réel importé, Monde fictif) · Mes parties · monde fictif détaillé · Outils. Le monde étendu est enfin accessible depuis l'accueil.

## Tout installer en une commande (outils/tout_installer.py, Tout_Installer.bat, tout_installer.sh)
- Enchaîne : pack Football_Monde (s'il est trouvé : dossier du jeu, Téléchargements, Bureau), reep, Transfermarkt, ClubElo, maillots, Wikidata (photos, logos, entraîneurs), openfootball (palmarès, championnats européens ; ZIP GitHub ou git clone), visages (pack NewGAN trouvé ou Stable Diffusion local). Une étape en échec n'arrête pas les autres ; bilan et journal (`donnees_jeu/journal_installation.txt`) ; lance le jeu à la fin.
- Dans le jeu : Accueil → Outils → « Tout installer / mettre à jour » (serveur local : `POST/GET /api/installation`, suivi des étapes en direct).
- Essai ici : openfootball OK (git clone), Transfermarkt et ClubElo bloqués par le réseau de cet environnement (signalés dans le bilan).

# État du projet — v75 (3 novembre 2026)

## Championnats européens ajoutés au monde étendu (js/ligues_completes.js, js/ligues_europe_clubs.js)
- `outils/ligues_europe_clubs.py` : clubs réels de 50 premières divisions (openfootball football.json + europe, CC0, dernière saison connue, ordre du classement).
- Monde étendu (5 pays FM26, sans club étranger avant) : + 27 championnats de niveau suffisant (Portugal, Pays-Bas, Belgique, Turquie, Russie, Écosse, Autriche, Grèce, Tchéquie, Croatie, Suisse, Danemark, Ukraine, Norvège, Serbie, Pologne, Suède, Roumanie, Hongrie, Chypre, Bulgarie, Azerbaïdjan, Slovaquie, Slovénie, Biélorussie, Géorgie, Bosnie) = 384 vrais clubs. Effectifs générés par le jeu (18 à 20 joueurs, niveau selon le championnat et le rang), recrutables. Simulés chaque semaine avec le calibrage réel de chaque pays ; saison complète testée (champions : Qarabağ, Ludogorets, Dinamo Zagreb…).
- `js/ligues_etrangeres.js` : les 4 autres pays du monde étendu ne sont plus simulés deux fois (ils ont leur propre simulation).
- Vitesse : niveau et valeur des joueurs mémorisés pendant le recrutement de l'IA. Monde étendu : ~2,1 s par semaine simulée avec ces ligues (1,1 s sans).
- Limites : joueurs de ces championnats générés (les sources libres ne donnent pas les effectifs) ; petits championnats (Gibraltar, Saint-Marin, Andorre…) non ajoutés pour la vitesse.

# État du projet — v74 (3 novembre 2026)

## Équipe première, réserve, U19 (js/equipes_club.js)
- Monde étendu FM26 : l'équipe réelle de chaque joueur vient des données (« First team » → équipe première, « Development team » → réserve, « Under-19 » → U19) ; avant, 70 à 90 joueurs dans un seul effectif. Exemple : Lorient 91 joueurs → 24 en équipe première, 28 en réserve, 39 en U19.
- Autres mondes : club de plus de 34 joueurs réparti à la création (28 meilleurs en équipe première, moins de 20 ans en U19, reste en réserve).
- Plafond de 32 joueurs : équipe première seulement (affichage « + N en réserve et U19 ») ; recrutement de nouveau possible.
- Compositions : réserve et U19 alignées seulement en cas de pénurie, pour tous les clubs (avant : ton club seulement).
- Formation : onglet Réserve pour tous les réservistes (plus seulement les 19-22 ans) ; un U19 de 20 ans passe en réserve au lieu d'être libéré.
- Clubs de l'IA : réserve et U19 progressent chaque semaine ; en fin de saison, montée des meilleurs jeunes si l'équipe première a moins de 24 joueurs, U19 de 20 ans en réserve.
- Fiche : étiquette « Réserve » / « U19 ».

# État du projet — v73 (3 novembre 2026)

## Correction Windows : PermissionError au premier lancement (outils/catalogue_fmb.py)
- `with sqlite3.connect(...)` valide mais ne ferme pas la connexion : sous Windows, `catalogue.tmp` restait ouvert et `os.replace` vers `catalogue.sqlite` échouait (WinError 32), le serveur s'arrêtait.
- Connexions fermées explicitement ; 5 essais espacés si un antivirus bloque le fichier ; sinon lecture directe de l'index tout neuf (message).

# État du projet — v72 (3 novembre 2026)

## Lancement plus fiable (Lancer_Manager_Foot.bat, outils/serveur.py)
- Avant : le navigateur s'ouvrait avant que le serveur soit prêt (chargement de la base) → « 127.0.0.1 n'autorise pas la connexion ».
- Maintenant : `serveur.py --ouvrir` ouvre le navigateur une fois le serveur à l'écoute ; port déjà pris → message clair (et ouverture du jeu déjà lancé) ; le lanceur vérifie que le zip est extrait et que Python est installé, et garde la fenêtre ouverte avec un message si le serveur s'arrête.

# État du projet — v71 (3 novembre 2026)

## Fusion de la branche Manager-foot
- Ajouts de la branche : monde étendu (5 pays FM26, 355 clubs, 18 compétitions, 18 589 joueurs : `packs/monde-*.json.gz`), catalogue FMInside, carrière multinationale, noms réels FMScout. Conflit `index.html` résolu en gardant les deux listes de scripts ; `tests/longue.html` et `sw.js` complétés.
- Correction : `outils/serveur.py` refusait tout le dossier `packs/` (403), alors que le monde étendu y lit ses fichiers. Seuls les packs du jeu sont désormais servis (`monde-*.json[.gz]`, `fminside-fm26.json.gz`, `noms-reels-fmscout.json`) ; le reste de `packs/` reste interdit.
- Vérifié : tests de la branche (fusion FMInside, carrière multi-pays) OK, jeu lancé par `serveur.py` sans erreur.

# État du projet — v70 (3 novembre 2026)

## Visages du pack NewGAN (outils/visages_newgan.py, Visages_NewGAN.bat)
- Lib-LOCALE/NewGAN-Manager-26 examiné : application Tauri/Svelte saine (aucun code suspect), en pause (FM26 n'exporte plus les identifiants), licence GPL-3 → aucune ligne reprise, idée seulement.
- Outil maison : attribue un portrait du pack NewGAN (visages générés par IA, à télécharger soi-même) à chaque joueur sans image. Dossier choisi d'après la nationalité, avec la diversité réelle des pays (France, Angleterre, Belgique, Pays-Bas, Brésil… : une part de visages d'un autre groupe, stable par joueur) — mieux que NewGAN, qui donne un visage d'Europe centrale à tous les Français. Chaque portrait utilisé une fois, nationalités non reconnues signalées, vraie photo prioritaire, « Visage généré par IA » sur la fiche, `--essai`, `--pays`, `--retirer`.
- Test : `outils/tests_visages_newgan.py` (faux pack) : 8/8.

# État du projet — v69 (3 novembre 2026)

## openfootball/europe (CC0)
- `outils/openfootball_europe.py` (format Football.TXT) → `js/palmares_europe.js` (21 Ko) : palmarès réel recalculé pour 35 pays de plus (Norvège, Suède, Danemark, Pologne, Suisse, Croatie, Serbie, Ukraine, Roumanie, Hongrie…) et les divisions 2 (Pays-Bas, Portugal, Suisse, Tchéquie…), fusionné dans PALMARES_REEL sans remplacer football.json.
- Championnats étrangers simulés : calibrés par pays sur les résultats réels (buts par match, avantage du terrain, 6 dernières saisons) ; classement : derniers champions réels et chiffres du calibrage.
- Revu sans intégration : academic-initiative/skillsbuild (exercices IBM Bob, sans licence ; données internationales déjà intégrées depuis martj42, CC0).

# État du projet — v68 (3 novembre 2026)

## Fiche joueur et retraites annoncées (js/fiche_evolution.js)
- Fiche (profil) : courbe du niveau saison par saison + aujourd'hui, avis du staff (progresse bien / doucement, au sommet, stagne, en recul, décline avec l'âge, plafond atteint).
- Apprentissage d'un poste (profil et onglet Développement) : jauge de familiarité, note au poste aujourd'hui → une fois maîtrisé.
- Retraites annoncées à la mi-saison (mercato d'hiver) : les joueurs concernés arrêtent en fin de saison ; tes joueurs te préviennent (« pense à préparer sa succession »), mention sur la fiche. Retraite sans annonce : plus rare (×0,45). Test : 170 annonces dans le monde, toutes effectives.

# État du projet — v67 (3 novembre 2026)

## Confort de jeu (js/confort.js)
- Notifications : deux au plus à l'écran, sans doublon en rafale, en bas à gauche (elles ne couvrent plus les boutons de réponse de la messagerie ni les fiches).
- Messagerie : nouvelles de faible importance (traits découverts, rumeurs, crises et tensions d'autres clubs, buteurs des autres clubs, succès) regroupées en un « Résumé de la semaine » (liste à puces). Mesure sur 18 semaines : 76 → ~55 messages.
- Erreur 404 `/api/etat` au chargement : n'existe que sans le serveur du jeu (lancement par `Lancer_Manager_Foot.bat` : pas d'erreur). Rien à corriger.

# État du projet — v66 (3 novembre 2026)

## Notes aux postes réalistes (js/attributs.js)
- Avant : un gardien pouvait afficher 66 en milieu, un attaquant 60 en défense (qualités de champ générées à un niveau moyen, aucune pénalité dans la note détaillée ; moteur : 0,78 pour tout poste non voisin).
- Gardien ↔ joueur de champ : note divisée par deux, plafonnée à 35/100. Entre joueurs de champ : pénalité selon la distance entre les postes (latéral → défense centrale ≈ −10 %, milieu → défense centrale ≈ −20 %, attaquant → défense centrale ≈ −40 %). Même logique dans le moteur (familiarité).
- Exceptions : postes secondaires réels des données source (`posRaw` : « ST, CB »…) comptés comme maîtrisés ; joueurs polyvalents (≈ 5 %, stables, pénalité divisée par deux, signalés « polyvalent ») ; postes appris à l'entraînement.
- Exemple : gardien 82 au poste, 25 à 33 ailleurs ; attaquant 72 au poste, 40 en défense centrale (44 s'il est polyvalent, 61 si la défense centrale est un de ses postes réels).
- Vérifié : hasard intact, 2 saisons sans erreur, audit des écrans propre, réalisme ligue 1 conservé (champion 90 pts, 25 % de nuls).

# État du projet — v65 (3 novembre 2026)

## Visages des joueurs sans photo
- `js/visages_generes.js` : plus de pastille à initiales ; chaque joueur réel sans photo reçoit un visage dessiné stable (identité, sans hasard du jeu), cohérent avec sa nationalité (teinte par région) et son âge (calvitie, cheveux gris), signalé « Visage généré (pas de photo) » sur la fiche.
- `outils/generer_visages_ia.py` + `Generer_Visages_IA.bat` : vrais portraits générés par IA pour les joueurs sans aucune image, avec Stable Diffusion sur ton PC (AUTOMATIC1111 / Forge, option --api) ou DeepInfra (payant, FLUX schnell, clé). Personnes fictives : la consigne ne contient jamais le nom du joueur (âge, nationalité, tenue seulement). Enregistrés comme images ajoutées + table `images_ia` ; fiche : « Visage généré par IA ». Une vraie photo reste prioritaire. `--essai`, `--pays`, `--max`, `--retirer`.
- Test : `outils/tests_visages_ia.py` (générateur simulé, API AUTOMATIC1111) : 7/7. Non exécuté contre un vrai générateur dans cet environnement.

# État du projet — v64 (3 novembre 2026)

## Fins de carrière, retraites du staff, reconversions (js/retraites.js)
- Joueurs : en plus des retraites du moteur (34 ans et plus), fin de carrière plus tôt pour un joueur de 31 ans et plus sans temps de jeu, au niveau trop bas pour son club ou gravement blessé ; annonce pour tes joueurs.
- Reconversion des retraités (mental, leader, professionnel, sélections, expérience) : entraîneur principal, adjoint, entraîneur technique, formateur, kiné ou recruteur. Certains rejoignent le staff de leur ancien club (nouvelle), les autres un vivier : on les retrouve libres, sans indemnité, sur les marchés du staff et des entraîneurs (« Ancien joueur de… »). Un de tes joueurs qui raccroche peut demander à rester au club (question : l'engager ou non).
- Staff : retraite entre 64 et 70 ans (intérim jusqu'au recrutement), entraîneur principal entre 66 et 72 ans en mode directeur sportif ; plus de candidats de 66 ans et plus sur les marchés.
- Monde : +122 à +156 joueurs en deux saisons au lieu de +269.

# État du projet — v63 (3 novembre 2026)

## Effectifs actuels Transfermarkt (transfermarkt-datasets, CC0)
- `outils/importer_transfermarkt.py` : + `player_valuations` → table `tm_valeurs` (historique de la valeur marchande).
- `outils/enrichissements.py` : `mouvements_tm` (joueur noté dont le club actuel Transfermarkt diffère : transfert récent vers un club du monde, ou départ hors du monde), `effectif_tm` (joueurs de l'effectif actuel absents de la base), `poste_tm` (postes Transfermarkt → postes du jeu), historique des valeurs dans `infos_joueur`.
- `outils/scenario.py` : effectifs construits d'après Transfermarkt (arrivées, départs, joueurs manquants jusqu'à 28 par club, avec valeur, contrat, pied, agent, sélections, saisons et transferts réels).
- `js/monde.js` : niveau des joueurs estimés calculé d'après la valeur marchande (≈ 68 pour 1 M€, 77 pour 10 M€, 85 pour 100 M€, ajusté selon l'âge).
- Fiche joueur : courbe de la valeur marchande réelle.
- Test : `outils/tests_transfermarkt_effectifs.py` (format réel des fichiers, valeurs d'exemple) : 7/7.
- Limites : le stockage du jeu de données (R2, Kaggle) et transfermarkt.com sont bloqués depuis cet environnement : import à lancer sur ton PC (`Enrichir_Base.bat`). Collecte du jeu de données en pause depuis juillet 2026 (données antérieures disponibles). Photos Transfermarkt non utilisées (droits des photographes) ; pas d'aspiration directe du site (conditions d'utilisation).

# État du projet — v62 (3 novembre 2026)

## Réalisme des matchs (js/realisme_match.js)
- Mesure avant (ligue 1, une saison) : champion 101 pts, dernier 17, 21 % de nuls, 12 % d'écarts de 4+ buts, corrélation réputation/classement 0,90 — trop prévisible (écart de niveau 82 → 58 entre le meilleur et le moins bon onze).
- Forme du jour par équipe (±, tirée du match, sans rnd), qualités légèrement resserrées, petit contre gros (−14 % / +14 % de conversion des occasions par tranche de 10 points d'écart de niveau), gestion du score (mène de 2+ : gère ; mené après 60' : pousse).
- Après (2 graines) : ligue 1 champion 81-95 pts, dernier 15-23, 25-29 % de nuls, 5 % d'écarts de 4+, corrélation 0,74-0,82, 2,6 buts/match. Réglages : REALISME_MATCH.

## Difficulté (js/difficulte.js, Options)
- Découverte · Normal (d'origine) · Exigeant · Réaliste. Agit sur la patience du président, les recettes du club, les exigences salariales, la précision des estimations de potentiel. Le moteur de match ne triche jamais.

## Corrections
- Réponses aux questions du staff (tension, revalorisation) sans interface affichée (simulation, vacances) : plus d'erreur de rafraîchissement.

# État du projet — v61 (3 novembre 2026)

## Évolution de tout le monde selon l'environnement (js/evolution.js)
- Environnement de progression de chaque club (-1 à +1) : ton club → entraîneur technique, adjoint, entraîneur principal, centre d'entraînement, entente du staff, cohésion ; autres clubs → réputation, qualité d'encadrement propre au club (change toutes les 3 saisons), cohésion.
- Fin de saison, tous les joueurs du monde : jeunes accélérés ou freinés par l'environnement ; potentiel revu (hasard, sérieux, temps de jeu, environnement) jusqu'à 28 ans ; âge de déclin propre à chacun (29-34 ans, retardé par un bon environnement), deuxième souffle pour les plus tardifs.
- Historique du niveau saison par saison (p.evo) ; bilan d'intersaison de ton effectif (progrès / stables / en recul) dans la messagerie.
- Écran Staff : « Environnement de progression » du club.
- Vérifié : hasard des matchs intact, niveau moyen du monde stable sur 2 saisons (60,4 → 60,9).

# État du projet — v60 (3 novembre 2026)

## Carrière du staff (js/carriere_staff.js)
- Potentiel caché (1-5 ★) : affiché comme estimation (± 1 étoile au recrutement et la 1re saison, exact après 2 saisons au club ; l'estimation peut se tromper).
- Sérieux au travail (caché la 1re saison : bourreau de travail, sérieux, correct, irrégulier) et accompagnement (niveau de l'adjoint ou de l'entraîneur principal).
- Progression hebdomadaire avec part de hasard (tirage à part, sans décaler les matchs) × sérieux + accompagnement + entente + centre d'entraînement ; déclin après 60 ans. Barre pleine : +1 niveau, appliqué au moteur.
- Fin de saison : le potentiel du staff peut monter ou baisser (sérieux, entente, hasard).
- Salaire du marché par niveau (sous-payé / au prix / au-dessus) ; après une progression, un membre sous-payé demande une revalorisation (question).
- Marchés staff et entraîneurs : au moins deux libres par poste (sans indemnité), filtre « Libres seulement », potentiel estimé.

## Potentiel incertain des joueurs (js/potentiel.js)
- Potentiel affiché en fourchette estimée par le staff (entraîneur technique + adjoint pour tes joueurs, plus précis avec l'ancienneté ; recruteur pour les autres), avec biais possible.
- Fin de saison, 23 ans et moins : potentiel revu selon hasard, personnalité (sérieux), accompagnement (staff, centre, entente) et temps de jeu ; nouvelles pour les gros écarts.

# État du projet — v59 (3 novembre 2026)

## Entente du staff (js/entente_staff.js)
- Chaque membre (adjoint, entraîneur technique, kiné, recruteur, formateur, + entraîneur principal en mode directeur sportif) a une philosophie (formation, résultats immédiats, données, discipline, jeu offensif) et un caractère (diplomate, exigeant, charismatique, discret, ombrageux), tirés de son nom (stables, sans toucher au hasard du jeu).
- Entente par binôme (0-100) : compatibilité de base, puis chaque semaine retour vers la base, +victoires, −défaites, + ancienneté commune. Relation de chaque membre avec toi.
- Effet réel chaque semaine de championnat : cohésion du staff → récupération (±1,6 pt) et moral (±0,45 pt) des joueurs.
- Conflit (binôme sous 28) → question « Tension dans le staff » dans la messagerie : réunion de conciliation, donner raison à l'un, laisser faire.
- Écran Staff : carte « Entente du staff » (jauge, membres, binômes du plus tendu au plus soudé) ; candidats avec profil et « entente prévue ».

# État du projet — v58 (3 novembre 2026)

## Messagerie refaite (js/messagerie.js, css/messagerie.css)
- Trois colonnes : dossiers (À traiter, Boîte de réception, Non lus · Par thème : Direction, Équipe, Mercato, Presse · Archives : Autres clubs, Réponses données) · liste · lecture. Sous 1180 px les dossiers passent en bandeau, sous 760 px tout s'empile.
- Liste groupée par journée, expéditeur + date, objet entier (plus coupé au « : »), aperçu sur une ligne, point de couleur = thème, recherche (joueur, club, expéditeur).
- Questions : étiquette « Question », bandeau « Calendrier en pause », fiche du joueur concerné, réponses en cartes numérotées (action en gras, conséquence dessous, réponse principale en vert, réponse risquée en rouge). Une fois traitée : « Ta réponse » avec le libellé choisi (plus de clés internes « accept », « auto »…).
- Skills utilisés : interface-design (hiérarchie, couches, tokens), design:ux-copy (libellés, états vides).

# État du projet — v57 (3 novembre 2026)

## v57 — toutes les branches fusionnées (Studio du club, projet sportif, pack FMInside)
- **`codex/studio-club-20-integrations`** : Studio du club (bureau déplaçable, dossiers et projets, planning, liens du vestiaire,
  échéances, recadrage de logo ou de photo), avec 20 bibliothèques locales et leurs licences (`vendor/integration20`).
  4 conflits résolus. `studio-club.css` réécrivait aussi les tableaux, les boutons et le focus : seules ses règles propres
  (`.s20-*`, GridStack, FullCalendar, Cropper) sont chargées (`css/studio_club.css`). Les pluriels du Studio sont accordés.
- **`Manager-foot` / `codex/football-monde-integration-v16`** : documentation du pack FMInside (`packs/fminside-…manifest.json`) ;
  projet sportif (`js/projet_sportif.js`) : profondeur d'effectif des clubs IA, journal de progression, suivi de recrutement.
- Le catalogue FMB est conservé, à ta demande.
Vérifications : 6 onglets du Studio sans erreur ; test du projet sportif ✓ ; simulation longue sans erreur ; audit des écrans sans erreur.

## v56 — note de poste selon le rôle, le devoir et les consignes ; couleurs des notes
- `js/notes_roles.js` : chaque rôle de poste (consignes individuelles de la tactique : Stoppeur, Défenseur relanceur, Renard des surfaces,
  Pivot, Faux 9, Attaquant de pressing…), chaque devoir (Défense, Soutien, Attaque) et chaque consigne d'équipe (pressing, tempo, passes,
  largeur, ligne défensive) déplace le poids des attributs détaillés.
  - Fiche joueur : choix du poste, du rôle et du devoir, avec ou sans « Consignes de mon équipe ». Le réglage de ta tactique est repris
    par défaut si le joueur est titulaire.
  - La note de poste, l'écart avec le poste de base et les attributs clés (surlignés, avec leur poids en %) se recalculent en direct.
    Exemple : un buteur noté 73 en Pivot, 71 en Renard, 69 en Attaquant de pressing.
- **Couleurs des notes** : 7 paliers, du rouge (1-4) au cyan (19-20), en passant par orange, jaune, vert clair, vert et turquoise.
- Affichage et aide à la décision : le moteur de match lit toujours ses propres combinaisons d'attributs (js/moteur37.js).
- FMTools (gilgiltsu, sans licence) : idée notée d'enrichir les personnalités (attributs cachés estimés), non reprise.
Test : `tests/notes_roles.js`. Simulation longue sans erreur ; audit des écrans sans erreur.

## v55 — intégration du travail fait en parallèle (ChatGPT / Codex) et harmonisation
- **Branche principale `Manager-foot`** (déjà fusionnée) : catalogue Football Monde FMB hors ligne (`js/catalogue_fmb.js`,
  `outils/catalogue_fmb.py`, `packs/`), servi par `outils/serveur.py`. 20 528 joueurs, 12 324 membres de staff, 355 clubs,
  18 compétitions, 316 photos. Vérifié : recherche, fiche détaillée avec photo, accès depuis l'accueil et Outils → Catalogue FMB.
- **Branche `codex/club-interface-data-reference`** (partait de la v24), fusionnée avec 4 conflits résolus :
  - modules : 41 compétences et langues (`competences.js`), parcours de progression (`parcours-progression.js`, d'après Pitchside Manager, MIT),
    remplaçants sur profils observés (`profils-similaires.js`, d'après ScoutEngine / ml-distance, MIT), projection de prolongation et correction
    de la masse salariale des prêts (`prolongations.js`), studio de statistiques (`studio.js`), marquages du terrain (`pitch-markings.js`, Roboflow, MIT),
    règlements officiels servis en `/api/reglements-officiels` ;
  - `scenario.py` : sous-notes sur 99 filtrées (1-99, booléens exclus).
- **Harmonisation** (`js/harmonisation.js`) :
  - une seule valeur par attribut : les 41 compétences lisent les 37 attributs détaillés du moteur quand une correspondance existe ;
  - le panneau devient « Analyse du profil » (points forts, axes de travail, langues, évolution) ; sa grille par familles, en double, est masquée ;
  - fiche joueur réparée : le parcours de progression et l'analyse s'insèrent dans la fenêtre, et non plus à côté ;
  - remplaçants : l'outil fondé sur les rapports de supervision sert pour tes joueurs, la recherche simple pour les autres ;
  - prolongation : la table de négociation (v54) affiche la projection de masse salariale (`#renewalProjection`) ;
  - `studio.css` réécrivait toute l'interface v24 (barre du haut, menu, boutons, fenêtres) : seules ses règles `.st-*` sont gardées
    (`css/studio_stats.css`) ;
  - défaut trouvé par le test de Codex : lire un profil initialisait les traits du joueur ; le calcul se fait désormais sur une copie.
- Tests de Codex : parcours ✓ ; compétences ✓ jusqu'au clic sur la grille masquée ; remplaçants bloqués par la visite guidée (absente en v24) ;
  prolongations : test de l'ancienne fenêtre, remplacée par la table de négociation.
Vérifications : simulation longue sans erreur ; audit des 28 écrans sans erreur ; tests de négociation et de catalogue passés.

## v54 — négociations détaillées (transferts, contrats des recrues, prolongations)
- `js/negociation.js` : une **table de négociation** dans les trois fenêtres. Chaque ligne montre la demande, ta proposition,
  l'importance du point pour l'autre partie et sa satisfaction (barre). Une jauge des chances d'accord se met à jour en direct :
  même calcul que la décision, sans tirage aléatoire.
- **Contrat** (recrue et prolongation), points négociables : salaire, prime à la signature, commission d'agent, augmentation annuelle,
  prime de fidélité, durée, statut, clause libératoire, option +1 an pour le club, clause de relégation, primes par but, par passe décisive,
  par match, par clean sheet, prime d'objectif collectif.
  - Les priorités de l'agent viennent de la personnalité du joueur. Un ambitieux tient au temps de jeu et à la clause ; un loyal, à la durée
    et à la fidélité ; un tempérament fort, au salaire et à la prime.
  - Un refus nomme le point qui gêne le plus. « Reprendre toutes ses demandes » remplit le tableau. L'encadré de coût (garanti / attendu / maximum)
    est conservé.
- **Offre au club**, points : indemnité, échéancier, bonus après 25 matchs, bonus après 15 buts, % à la revente, clause de rachat (2 saisons),
  joueur inclus. Une estimation de la réaction du club s'affiche, plus prudente si le joueur n'est pas supervisé.
- **Clauses appliquées dans la partie** : primes par passe décisive et par clean sheet versées après chaque match ; prime d'objectif versée
  si l'objectif du président est atteint ; prime de fidélité versée en fin de contrat ; augmentation annuelle à chaque nouvelle saison ;
  baisse de salaire en cas de relégation ; bonus aux 15 buts versé au club vendeur ; clause de rachat que le club d'origine peut activer ;
  option +1 an à lever depuis la fiche du joueur en dernière année.
Test : `tests/negociation.js`. Simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v53 — import d'un fichier JSON complet (attributs sur 36 points ou toute autre échelle, staff)
- `js/import_json_complet.js`, branché sur « Importer (JSON) » de l'écran d'accueil et de l'éditeur.
  - **Échelle** : champ `echelle` (ou `scale`), sinon détectée par la valeur maximale (20, 36, 99 ou 100). Sur 36 : 32 → 18/20.
  - **Attributs** : noms français ou anglais (Football Manager, FIFA/EA), rangés à plat ou par familles (technique, mental, physique, gardien).
    Ils sont reliés aux 37 attributs détaillés du jeu ; les 9 qualités du moteur en sont recalculées. Les attributs non reconnus sont signalés
    à l'import.
  - **Joueurs** : rangés dans leur club (`clubs[].joueurs`) ou en liste avec un champ `club` ; nom, âge ou date de naissance, nationalité, poste
    (codes français ou anglais), pied, contrat, numéro, photo, potentiel.
  - **Staff** : `staff[]` avec `role` (adjoint, entraîneur technique, kiné, recruteur, formateur…), `club` et `niveau` 1-5 (ou attributs sur l'échelle).
    Il est appliqué quand tu prends ce club.
  - Le format interne et l'ancien format simple restent acceptés.
- La correspondance sera ajustée au fichier réel dès qu'il sera fourni.
Test : `tests/import_json_complet.js` (fichier fictif sur 36 points). Simulation longue sans erreur.

## v52 — système de design formalisé et textes d'interface (skills design-system et ux-copy)
- **Jetons** (`tokens.css`, chargé en premier) : surfaces, traits, texte, couleurs sémantiques, échelle typographique de 9 tailles,
  6 arrondis, espacements en base 4, élévation, durées d'animation. Audit avant / après : 28 tailles de texte et 14 arrondis différents
  ramenés aux jetons (164 tailles, 115 arrondis et 47 couleurs convertis automatiquement). Rendu visuel identique.
  Les anciennes variables (`--bg`, `--panel`…) restent la source des surfaces, donc les thèmes existants fonctionnent toujours.
- **Documentation** : `DESIGN_SYSTEM.md` (jetons, composants bouton / onglets / panneau / tableau / retours, à faire et à éviter).
- **Bouton en chargement** : `aria-busy="true"` affiche une roue et bloque le clic (utilisé pour « Simuler 2 000 fins de saison »).
- **Textes** :
  - 136 pluriels bricolés « (s) » accordés au rendu selon le nombre qui précède (« 3 joueurs », « 1 saison », « 12 matchs »),
    dans les écrans, les fenêtres, les notifications et les infobulles ;
  - boutons génériques remplacés : « OK » devient « Utiliser ce logo », « Valider » devient « Faire le changement » ;
  - les 16 confirmations reprennent le verbe de leur question (« Licencier ? » → bouton « Licencier ») ;
  - pluriel des postes corrigé (« mieux que 99 % des défenseurs centraux »).
Test : `tests/textes_ux.js`. Simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v51 — corrections issues de la critique de design (skill design-critique) et d'axe-core
- **Contenu jamais coupé** : tout tableau sans conteneur défilant est enveloppé (`.defile-x`, atteignable au clavier), avec des ombres sur
  les bords quand il défile. Les noms longs sont abrégés avec une infobulle. Calendrier en largeurs fixes : adversaire abrégé, score toujours
  visible et coloré, textes longs sur deux lignes.
- **Titres de panneaux** en texte seul (émojis de tête retirés, cohérent avec les icônes du menu) ; teinte de la barre de titre adoucie.
- **Notifications** : deux au plus, durée raccourcie (2,2 à 5 s).
- axe-core après animations : aucun défaut de contraste. Il reste un avertissement sur l'infobulle (rôle tooltip correct, rattachée au body).
Vérifications : audit des 27 écrans sans erreur ; simulation longue sans erreur.

## v50 — championnats étrangers simulés ; hasard de la partie protégé
- **Championnats étrangers** (`js/ligues_etrangeres.js`) : chacun des 16 pays étrangers d'au moins 4 clubs a son championnat aller-retour
  (18 journées pour 10 clubs). Les journées sont jouées au rythme de ton championnat. Scores : modèle de Poisson corrigé de Dixon-Coles avec
  la force des effectifs (2,6 buts par match). À la fin de la saison : champion, trophée, palmarès et une nouvelle dans le fil du monde.
  Classements > 🌍 Monde montre pour chaque pays le classement, la journée, le champion précédent et les derniers résultats ; la liste des
  effectifs reste dépliable. Environ 19 Ko dans la sauvegarde.
- **Correctif** : `aiTactics` tire des nombres aléatoires *et* modifie le club (style créé au premier appel, effectif complété). Les cotes et
  les scores probables de l'avant-match (depuis la v36) et les prévisions l'appelaient : ouvrir l'avant-match changeait donc un peu la suite de
  la partie. Ces calculs utilisent maintenant une estimation en lecture seule (`tactiqueSansHasard` : meilleur onze automatique dans la
  formation habituelle du club). Test `tests/hasard_intact.js` : saison identique avec ou sans championnats étrangers, avant-match et prévisions.
- Doublon de `mulberry32` retiré (même algorithme que `js/data.js`).
Tests : `tests/ligues_etrangeres.js`, `tests/hasard_intact.js`. Simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v49 — confirmation des transferts, recherche dans le monde entier, onglet Monde
- **Confirmation finale** (`js/mercato_monde.js`) : après une visite médicale réussie, le transfert passe à l'étape « signature à confirmer ».
  Une décision s'affiche avec le récapitulatif du coût : indemnité, salaires sur la durée du contrat, primes et agent, total.
  Tu choisis « ✍ Confirmer la signature » ou « Renoncer au joueur ».
  Sans réponse en 2 semaines, la négociation est close, comme aux autres étapes. La fermeture du mercato n'annule plus un transfert
  qui attend ta confirmation. En délégation complète à la cellule de recrutement, la signature reste automatique.
- **Recherche de joueurs** : nouveau filtre « Championnat » avec toutes les divisions de ton pays, les 20 pays étrangers du monde du jeu
  (nombre de clubs indiqué) et les joueurs libres.
- **Classements > 🌍 Monde** : toutes les divisions du pays et tous les clubs étrangers, regroupés par pays, avec réputation, valeur de l'effectif
  et meilleur joueur (note estimée si non supervisé). Un clic ouvre la fiche du club. Les clubs étrangers n'ont pas de championnat simulé :
  ils jouent les coupes d'Europe et alimentent le mercato.
Test : `tests/mercato_monde.js`. Simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v48 — ergonomie à la manière des jeux de gestion (barre de section, panneaux, fiche joueur)
- **Barre de section** en haut de chaque écran : nom du groupe, écrans du groupe en sous-onglets soulignés (avec leurs pastilles),
  boutons ‹ › précédent / suivant (Alt+← / Alt+→) et « Aller à… ». Sur téléphone, les sous-onglets défilent. Le bouton ◀ de la barre
  du haut, devenu redondant, est masqué.
- **Panneaux** : barre de titre teintée aux couleurs du club ; onglets internes soulignés (fenêtres et cartes).
- **Tableaux** : lignes zébrées, plus denses, survol aux couleurs du club, ligne de ton club mise en valeur.
- **Fiche joueur** : bandeau aux couleurs du club du joueur, numéro aux couleurs du maillot.
- Audit axe-core : un contraste du calendrier corrigé.
Tests : `tests/navigation.js`. Audit des 27 écrans sans erreur ; simulation longue sans erreur.

## v47 — vrais noms FM (.lnc) dans l'import de sauvegarde
- `outils/importer_sauvegarde_fm.py --noms-fm DOSSIER` lit les fichiers `.lnc` de vrais noms (par exemple le « Real Names Fix »
  de Passion4FM, que tu télécharges toi-même), en UTF-8 ou UTF-16. Ils servent à trois choses : nommer les compétitions dans `--lister`
  (fmsave ne connaît pas leurs noms), donner leur nom aux divisions, et rendre aux clubs leur vrai nom.
  Essai sur le fichier fourni : 1 050 compétitions et 585 clubs reconnus. Rien de ce contenu n'est versionné.
- Les bases `.fmf` (ex. « NextGen Wonderkids Database ») sont chiffrées par Sports Interactive : elles ne se lisent pas directement.
  Il faut les charger dans FM, démarrer une carrière, puis importer la sauvegarde avec l'outil.
Test : `outils/tests_sauvegarde_fm.py` (fichiers .lnc UTF-8 et UTF-16).

## v46 — avatars cohérents avec l'origine
- `js/visages_regions.js` : la teinte de peau des avatars générés suit maintenant la grande région d'origine du joueur
  (sous-régions de la table des pays intégrée). Avant, elle était tirée au hasard. La diversité reste partout (binationaux,
  diasporas). Le choix se fait par empreinte, sans tirage : le hasard de la partie ne change pas.
  Teinte moyenne (0 claire à 5 foncée) : Suède 1,0, France 1,7, Espagne 1,6, Japon 1,3, Maroc 2,6, Brésil 2,8, Sénégal 4,4.
- emilmirzayev/fm-ai-face-generator (MIT) : la génération de visages par IA passe par un service payant (DeepInfra, clé d'API),
  elle n'est donc pas intégrée. Seule l'idée des visages par région est reprise.
Test : `tests/visages_regions.js`. Simulation longue sans erreur ; audit des écrans sans erreur.

## v45 — prévisions : scores probables et fin de saison simulée
- `js/previsions.js` : modèle de Poisson corrigé de Dixon-Coles (`dcTau`, `poissonPmf`, `poissonSample`, repris de
  Hicruben/world-cup-2026-prediction-model, MIT, `vendor/world-cup-2026-prediction-model/LICENSE`).
  - Avant-match : les 3 scores les plus probables et les buts attendus.
  - Compétitions > championnat : « Prévisions de fin de saison », 2 000 saisons simulées (méthode de vickyfriss/football-league-predictions,
    MIT, réécrite). On obtient les points projetés et les chances de titre, de top 4, de montée et de relégation. 0,16 s pour 260 matchs restants.
  - Générateur pseudo-aléatoire séparé (mulberry32) : le hasard de la partie ne bouge pas (test `tests/previsions_hasard.js`).
Tests : `tests/previsions.js`, `tests/previsions_hasard.js`. Simulation longue sans erreur.

## v44 — édition groupée, radar des progressions
- **Édition groupée** (`js/edition_groupee.js`, idée de tozmoz/FMLibreEditor, GPL-3.0, sans code repris) dans l'éditeur.
  - Cibles : le club affiché, une division ou toute la base, avec un filtre de poste et d'âge.
  - Actions : qualité ± N, soins, levée des suspensions, moral, forme, contrat + 1 an.
  - « Aperçu » montre l'avant/après ; « Annuler » rétablit exactement les valeurs (10 éditions gardées).
- **Radar des progressions** (`js/progressions.js`, idée de FMSuperScout, MIT) : Statistiques > « Progressions ». Hausses et baisses
  de note depuis le début de la saison ou sur environ 4 semaines, pour ton effectif et pour les joueurs connus du monde.
  Deux photos compactes, environ 12 Ko.
Tests : `tests/edition_groupee.js`, `tests/progressions.js` (lancés par `tests/run_eval.js`). Simulation longue sans erreur ; audit des écrans sans erreur.

## v43 — recommandations selon les besoins du club, cartes de chaleur
- **Recommandés pour ton club** (`js/recommandation.js`, Mercato > Recherche sans filtre) : chaque secteur du onze reçoit un poids
  inverse de sa note moyenne (fonction réciproque, méthode de tonyz0x0/football-manager, MIT ; ses données FIFA ne sont pas reprises).
  Chaque joueur abordable est ensuite noté selon ce qu'il apporte au titulaire le plus faible de son poste. Le brouillard est respecté
  (note estimée). Exemple en D2 : un DG noté 71 pour remplacer un titulaire à 51, à 11 M€.
- **Cartes de chaleur** (`js/carte_chaleur.js`, idée d'osnsyc/FMMatchLens, MIT, sans code repris) : pendant les matchs de ton club,
  la position de chaque joueur est relevée à chaque action (grille 12 × 8). Analyse du match > « Cartes de chaleur », avec un choix
  du joueur. Stockage compact : 2,6 Ko par match. Vérifié : gardien en colonne 1, avant-centre en colonne 9 sur 12 ; rien n'est relevé
  pour les autres matchs.
- Écartés : cruelspawngenerate/football-manager-27-mod-install-guide (piège à logiciel malveillant : ZIP avec exécutable « non vérifié »),
  Farketmez59/football-club-manager-data-pack (vide).
Tests : `tests/recommandation.js`, `tests/carte_chaleur.js`. Simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v42 — onze optimal
- `js/onze_optimal.js` : pour ton club, la composition automatique résout l'affectation joueurs → postes avec l'algorithme hongrois,
  et maximise la somme des notes effectives. L'ancienne méthode remplissait les postes un par un : un joueur polyvalent pouvait être
  placé là où il était à peine meilleur. Gain mesuré : +15,5 de force en 4-2-3-1 (901,5 contre 886), jamais moins que l'ancienne
  méthode, moins de 1 ms. Les clubs de l'ordinateur gardent l'ancienne méthode (équilibre des simulations inchangé).
  Idée tirée de FM-Player-Analyzer (GPL-3.0, aucun code repris). Test : `tests/onze_optimal.js`.
- Football-Manager-27-Editor (sans licence, modifie la mémoire de FM pendant le jeu) : rien d'utilisable, le jeu a son propre éditeur.
Vérifications : simulation longue sans erreur.

## v41 — sauvegarde Football Manager, packs graphiques mieux reconnus, profils similaires
- **Sauvegarde FM → monde jouable** (`outils/importer_sauvegarde_fm.py`, sur ton PC, avec `pip install fmsave`, rhiever/fmsave, MIT).
  `--lister` affiche les championnats de la sauvegarde ; `--ligues` choisit les divisions. On obtient un fichier JSON à importer
  depuis l'écran d'accueil. Les 52 attributs FM donnent les 9 qualités et les sous-notes détaillées ; le reste est converti aussi :
  poste, pied fort, personnalité, contrat, potentiel (écart PA − CA). Avec `--visages` ou `--logos`, les images des packs sont
  reliées par l'identifiant FM (dossier `fm_images`, non versionné). Test : `outils/tests_sauvegarde_fm.py`.
- **Nations FM** : `outils/nations_fm.json` relie 220 identifiants de nation FM aux codes FIFA, d'après mavarobli/FMSuperScout (MIT,
  `outils/nations_fm.py`).
- **Packs graphiques** (idées de FMMLoader-26, GPL : aucun code repris) : le type se lit dans le `config.xml` (portrait de personne,
  logo d'équipe, maillot d'équipe). Les logos de compétitions et de nations ne sont plus pris pour des logos de club quand le numéro
  coïncide, et le maillot domicile est préféré.
- **Profils similaires** (`js/remplacants.js`, idée de fm-ai-assistent, sans licence : aucun code repris) : depuis la fiche d'un joueur,
  « Trouver des profils similaires » liste les joueurs du même poste les plus proches sur les attributs clés. Le brouillard du recrutement
  est respecté, et un bouton « Suivre » ajoute un joueur à la liste de suivi.
- Écarté : tahaselimsalman243-glitch/sport-connect-hub. Sa page est un script chiffré qui réécrit tout le document, technique des faux
  dépôts qui distribuent des logiciels malveillants. Rien n'a été exécuté.
Vérifications : simulation longue sans erreur ; audit des 27 écrans sans erreur ; tests des outils Python passés.

## v40 — finance des transferts : comptabilité et montages financiers (`js/finance_transferts.js`)
- **Amortissement** : chaque indemnité, commission d'agent comprise, est étalée de façon linéaire sur la durée du contrat
  (5 ans au plus, comme le prévoit l'UEFA). Une prolongation réétale la valeur restante. Exemple testé : achat 20 M€ sur 4 ans,
  donc 5 M€ amortis par saison ; après une saison et une prolongation à 5 ans, les 15 M€ restants sont réétalés.
- **Plus-values et moins-values** : une vente rapporte prix − valeur nette comptable ; un départ libre coûte la valeur restante.
  Un journal garde les dernières ventes.
- **Ratio de coût d'effectif UEFA** (limite 70 %) : (salaires + amortissements + agents) / (recettes + plus-values), affiché dans Finances.
- **Montages** : vente payée en plusieurs fois (+8 %, 40 % tout de suite et le reste sur deux saisons) ; affacturage d'une créance
  (comptant immédiat, décote de 5 % par an restant) ; plan d'achat « 25 % maintenant, 75 % sur 3 ans ».
- Dans Mercato > Offres reçues, chaque offre indique la plus-value ou la moins-value comptable qu'elle produirait.
- Recherche GitHub : rien de réutilisable. ZenGM n'est pas open source (idées seulement) ; ewenme/transfers et BBC-Data-Unit sont sans licence ;
  les données transfermarkt-datasets (CC0) sont hébergées hors de GitHub et déjà importables sur ton PC (`importer_transfermarkt.py`).
  Les mécanismes reprennent donc les règles réelles (IFRS, règlement financier UEFA).
Test : `tests/finance_transferts.js`. Simulation longue sans erreur ; audit des 27 écrans sans erreur.

## v39 — finition visuelle et ergonomie (skill frontend-design + audit axe-core)
- `design.css` (chargé en dernier) et `js/design.js`. Direction « tribune de nuit » : la barre du haut sert de tableau d'affichage,
  avec les chiffres en Bebas Neue, sur une seule ligne. Le nom du club et le prochain adversaire sont coupés proprement ; la recherche
  et les détails disparaissent sur les écrans plus étroits.
- Montants au format français partout (59,1 M€ au lieu de 59.1 M€).
- Notifications compactes en bas à gauche, au-dessus du menu ; en haut sur téléphone, deux au plus. Elles ne cachent plus
  les filtres ni le contenu.
- Changement d'écran : entrée douce de 0,22 s, coupée quand le système demande moins d'animations.
- Accessibilité, mesurée avec axe-core sur 9 écrans : contrastes des titres du menu, des pastilles et des segments corrigés ;
  titre de niveau 1 pour chaque écran (lecteurs d'écran) ; champs et listes sans libellé nommés ; zones défilantes atteignables au clavier ;
  fenêtres annoncées comme dialogues ; zone de notifications annoncée. Il reste seulement les lignes volontairement grisées (joueurs indisponibles).
- Onglets segmentés en texte seul, sans émoji de tête ; « Prochaine étape » remplace « « Continuer » va : » ; boutons plus hauts au doigt.
Vérifications : audit des 27 écrans (ordinateur et mobile) sans erreur ni débordement ; simulation longue sans erreur.

## v38 — import local des packs graphiques Football Manager (visages, logos, maillots)
- `outils/importer_pack_fm.py` (+ `Importer_Pack_FM.bat`) : importe sur ton PC un pack déjà téléchargé (FMEurope, sortitoutsi…).
  Les images de ces packs sont nommées par UID Football Manager, souvent via un `config.xml`. On retrouve le joueur ou le club
  grâce à une liste exportée depuis FM (colonnes UID + Nom, et date de naissance pour départager les homonymes ; format page web ou texte).
  Les images vont dans `donnees_jeu/cache_images` comme ajouts manuels, prioritaires sur les téléchargements. Option `--essai` pour
  vérifier avant d'importer, `--retirer` pour tout enlever.
- Les maillots ont un nouveau type d'image (`/img/maillot/…`), affiché sur la fiche du club en mode vrais clubs.
- Rien de ces packs n'est versionné ni publié : leurs logos et photos appartiennent à leurs ayants droit. fmeurope.net est aussi
  inaccessible depuis l'environnement de développement. Les « vrais noms » de FMEurope corrigent les noms sous licence dans Football Manager ;
  le jeu utilise déjà les vrais noms des clubs et des compétitions en mode réel.
Test : `python outils/tests_pack_fm.py` (mini-base et mini-pack synthétiques).

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
