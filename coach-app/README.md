# QEA Coach — appli iPhone & Android du Quimper Ergué Armel FC

> **Nouveau** : plusieurs équipes par club (Seniors A/B/C, U19→U11, Féminines, Vétérans), cloud Supabase
> (chaque joueur sur son téléphone, données retrouvées après réinstallation, notifications push),
> météo du groupe. Activation du cloud : [docs/CLOUD.md](docs/CLOUD.md).

Application mobile pour qu'un coach suive ses joueurs après chaque match :

- **Effectif** : fiche joueur (numéro, poste, date de naissance, notes), archivage.
- **Matchs** : adversaire, date, domicile/extérieur, compétition, score.
- **Questionnaire du club (repris du Google Forms QEA)**, questions obligatoires marquées * :
  rubrique « Analyse du match » (sortie de balle, attaque de la surface, défendre sa surface, qualité du pressing,
  transition offensive, transition défensive, performance de l'équipe), état de forme physique, ta performance
  (1 = Très mauvaise → 10 = Exceptionnel) et commentaires divers.
  Le coach voit ensuite les **points forts / axes d'amélioration** de l'équipe, les moyennes par question,
  les commentaires des joueurs et les tendances de chaque joueur. Bouton **Relancer** (message WhatsApp aux retardataires).
- **Curseurs de ressenti** : le joueur répond en glissant un curseur (smiley, sans chiffre) ; le coach voit la note
  chiffrée (moyennes, min/max, par joueur).
- **Ressenti d'entraînement** : après chaque séance, les présents notent la qualité de l'entraînement, leur performance
  perso et l'intensité ressentie (+ commentaire). Le coach voit les moyennes par séance, par joueur et sur l'accueil.
- **Onglet Suivi** (coach) :
  - **points à travailler** par joueur (catégorie, détails, échéance, statut, progression coach vs ressenti du joueur,
    notes de suivi datées) ; le joueur les voit et indique où il en est ;
  - **questionnaires** créés par le coach (bilan mi-saison, ressenti de la semaine, vie de groupe… ou sur mesure),
    pour tous ou certains joueurs, avec échéance, résultats chiffrés et relance des retardataires.
- **Préparation des matchs** : adversaire (système, joueurs clés, forces, faiblesses), consignes offensives/défensives,
  coups de pied arrêtés, objectifs, message au groupe — publiable aux joueurs.
- **Débrief d'après-match** (privé coach) : points positifs, problématiques rencontrées, solutions trouvées,
  à retravailler, note collective.
- **Photo** pour chaque joueur.
- **Bouton « Envoyer »** : un questionnaire (après-match, ressenti de séance, questionnaire du coach) ne part
  vers les joueurs que lorsque le coach appuie sur « Envoyer » (toute l'équipe, la compo, les présents ou une sélection).
  Les joueurs reçoivent une notification ; le coach voit qui a répondu et peut **relancer** ceux qui manquent.
  Tout se retrouve dans l'accueil (« À faire ») et dans Suivi → Questionnaires (à envoyer, en attente, brouillons, historique).
- **Signaux faibles** (accueil coach, fiche joueur) : ressenti ou forme en baisse sur les derniers questionnaires,
  joueur qui ne répond plus aux questionnaires envoyés.
- **Courbes d'évolution** par joueur : forme après match, perf perso (match et entraînement), note du coach.
  Le joueur voit les siennes (sans la note du coach) dans « Ma progression ».
- **Entretien individuel** (fiche joueur → Entretien) : l'appli prépare les points à aborder à partir des réponses
  du joueur (tendances, temps de jeu, écart entre sa note et celle du coach, commentaires, dernier entretien) ;
  le coach note ce qui est dit et décidé, avec une date de suivi rappelée dans « À faire ». Privé.
- **Le mot du coach** (fiche match) : message à toute l'équipe après le match, notifié aux joueurs.
- **Espace joueur** : liste « À remplir » (questionnaires envoyés par le coach, avec barre d'avancement),
  points à travailler, prochain match + préparation + compo, stats, vidéos.
- **Entraînements** (onglet Agenda) : séances avec thème, durée, RPE, **appel** (présent, retard, absent, excusé, blessé),
  RPE individuel ; charge d'entraînement prise en compte dans les alertes ; taux d'assiduité par joueur ;
  alerte après 2 absences non excusées ; export CSV des présences.
- **Questionnaire d'après-match** (un par joueur et par match) :
  - temps de jeu, titulaire/remplaçant ;
  - statistiques (buts, passes décisives, tirs, tirs cadrés, récupérations, arrêts, cartons) ;
  - effort perçu **RPE** (0–10) → charge de match = RPE × minutes ;
  - **bien-être** (fraîcheur, sommeil, courbatures, stress, moral — 1 à 5) ;
  - auto-évaluation du joueur, note et commentaire du coach ;
  - **douleur** (zone + intensité) avec raccourci « Déclarer une blessure ».
  - **questions perso du club**, comme dans un Google Forms (échelle, oui/non, choix unique,
    choix multiples, nombre, texte libre) : Réglages → Gérer les questions. ~20 modèles prêts
    à l'emploi (vécu du match, temps de jeu, consignes, points forts / à travailler, message au coach…) ;
  - bouton « Enregistrer et passer au joueur suivant » pour enchaîner tout l'effectif.
- **Accès coach / joueurs** : au lancement, « Je suis le coach » (code à 4 chiffres, accès complet) ou « Je suis joueur ».
  Un joueur (avec un code perso optionnel, réglé dans sa fiche) ne voit que **son** espace : ses questionnaires à remplir
  (sans la partie évaluation du coach), ses stats, les compos publiées et les vidéos partagées ou où il est tagué.
  Pas d'accès aux autres joueurs, aux notes du coach, aux blessures des autres ni aux réglages.
- **Stats selon le poste** : gardien (arrêts, buts encaissés, sorties aériennes, penaltys arrêtés), défenseur
  (tacles, interceptions, duels, dégagements), milieu (passes clés, dribbles, récupérations…), attaquant (buts, tirs, hors-jeu…).
- **Compo** : terrain interactif avec 7 formations (4-4-2, 4-3-3, 4-2-3-1, 4-1-4-1, 3-5-2, 3-4-3, 5-3-2).
  Touchez un poste pour placer un joueur (suggestions du bon poste d'abord), touchez deux joueurs pour les échanger,
  capitaine, banc (7 remplaçants), non convoqués, **compo auto** (note, forme, blessures), alertes (blessé, douleur,
  joueur hors poste), photos des joueurs sur le terrain, consignes tactiques, publication aux joueurs,
  choix de l'équipe à composer et joueurs sélectionnables dans tous les effectifs du club (listes Seniors, Jeunes… séparées),
  **impression A4** depuis le navigateur et **partage en image** (WhatsApp…) depuis l'appli mobile.
- **Blessures** : zone, côté, type, gravité, statut (indisponible / en reprise / guérie), retour prévu, traitement.
- **Vidéos** : vidéothèque de l'équipe — importer depuis la galerie, **filmer** directement, ou coller un lien
  (YouTube, Drive, Hudl, Veo, .mp4). Catégories (match, entraînement, analyse, adversaire, exercice),
  lien vers un match, **joueurs tagués**, notes/consignes, et **temps forts** horodatés (ex. 12:30 « pressing réussi »)
  : un appui fait sauter la vidéo au bon moment. Les vidéos apparaissent aussi dans la fiche joueur et le détail du match.
- **Équipes du club** : Seniors A/B/C, jeunes, féminines… chaque équipe a ses joueurs, matchs, séances et suivi ;
  choix de l'équipe à la connexion ; changement d'équipe depuis l'en-tête.
- **Cloud (optionnel)** : compte personnel nommé par coach (e-mail + mot de passe), code d'équipe + code joueur pour rejoindre depuis son téléphone,
  données retrouvées après réinstallation, synchronisation hors connexion, coach adjoint, **notifications** (à remplir, compo/préparation publiées,
  rappel à 18 h, douleur signalée au coach). Voir [docs/CLOUD.md](docs/CLOUD.md).
- **Météo du groupe** (forme, qualité des séances, assiduité) en jauges animées sur l'accueil.
- **Tableau de bord** : bilan de la saison (V/N/D, buts, forme sur 5 matchs), raccourcis, joueurs disponibles/blessés, progression des questionnaires du dernier match,
  **alertes** automatiques (douleur, bien-être bas, RPE élevé, pic de charge 7 j / 28 j, blessure), classements.
- **Fiche joueur** : stats cumulées, moyennes, courbe de forme, historique des questionnaires et blessures.
- **Export CSV** (Excel / Numbers / Google Sheets) et **sauvegarde/restauration** JSON.
- Design soigné, mode clair / sombre automatique, retours haptiques.
- Données stockées **sur le téléphone** (hors ligne, rien n'est envoyé sur internet). Les vidéos importées sont copiées dans l'appli ;
  la sauvegarde JSON contient leurs titres, tags et temps forts mais pas les fichiers vidéo eux-mêmes.

Construit avec [Expo](https://expo.dev) (React Native + Expo Router + TypeScript) : un seul code pour iOS et Android.

## Essayer tout de suite sur son téléphone

1. Installer [Node.js](https://nodejs.org) (LTS) sur l'ordinateur.
2. Installer l'appli **Expo Go** sur l'iPhone (App Store) ou Android (Play Store).
3. Dans ce dossier :
   ```bash
   npm install
   npx expo start
   ```
4. Scanner le QR code affiché (appareil photo sur iPhone, appli Expo Go sur Android).

Astuce : dans l'appli, **Réglages → Charger les données de démo** pour voir un exemple rempli.

Version navigateur : `npx expo start --web`.

## Version web (HTTPS) et écran d'accueil du téléphone

L'appli est publiée en HTTPS sur Vercel (ex. `https://qea-coach.vercel.app`). C'est une PWA : elle s'installe comme
une vraie appli, sans store.

- **iPhone (Safari)** : ouvrir le lien → bouton Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir le lien → menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).

Les fichiers concernés sont dans `public/` (manifest, icônes, service worker) et `vercel.json`.
Sur Vercel : dossier racine `coach-app`, commande `npx expo export -p web`, dossier de sortie `dist`,
variables `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Installer « pour de vrai » (sans ordinateur branché)

Avec [EAS Build](https://docs.expo.dev/build/introduction/) (compte Expo gratuit) :

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview   # fichier .apk à installer directement
npx eas-cli@latest build --platform ios --profile production    # nécessite un compte Apple Developer
npx eas-cli@latest submit --platform ios                        # envoi sur TestFlight / App Store
```

## Personnaliser

- **Statistiques suivies** (autre sport : rugby, hand, basket…) : `src/lib/constants.ts` → `STAT_FIELDS`
  (ajouter aussi la clé dans `StatKey` de `src/lib/types.ts`).
- Postes, zones du corps, types de blessures, seuils d'alerte, modèles de questions (`QUESTION_TEMPLATES`) : `src/lib/constants.ts`.
- Couleurs (vert du club) : `src/components/theme.ts`.
- Logo : `assets/club-logo.png` (icônes de l'appli dans `assets/`), ou directement dans l'appli : Réglages → Changer le logo.

## Organisation du code

```
src/
  app/                  écrans (Expo Router : chaque fichier = un écran)
    connexion.tsx       choix coach / joueur + codes
    (tabs)/             onglets Accueil, Joueurs (+ infirmerie), Agenda, Compo, Suivi, Vidéos (joueur : Moi, Compo, Vidéos)
    prepa.tsx           préparation d'un match           ressenti-seance.tsx   ressenti d'entraînement
    objectif/           points à travailler              sondage/              questionnaires du coach
    seance/             entraînements et appel
    reglages.tsx        réglages (icône ⚙️ de l'accueil)
    media/[id].tsx      lecteur vidéo + temps forts   media/edit.tsx   ajout/modif d'un média
    questions/          questions perso du questionnaire
    joueur/[id].tsx     fiche joueur          joueur/edit.tsx   ajout/modif joueur
    match/[id].tsx      détail d'un match     match/edit.tsx    ajout/modif match
    questionnaire.tsx   questionnaire d'après-match
    blessure/edit.tsx   ajout/modif blessure
  components/           composants UI et thème
  lib/                  types, stockage (AsyncStorage), calculs, export CSV, démo
```

## Commandes utiles

```bash
npm run typecheck   # vérification TypeScript
npm run lint        # ESLint
npm test            # logique cloud (vues joueur, fusion des réponses)
npm run test:sql    # schéma Supabase et droits d'accès sur un Postgres local
```

## Pistes pour la suite

- Synchronisation en ligne (ex. Supabase/Firebase) pour plusieurs coachs / staff médical.
- Lien envoyé aux joueurs pour qu'ils remplissent eux-mêmes leur questionnaire.
- Suivi des entraînements (charge hebdomadaire complète), graphiques plus poussés, notifications.

## Sécurité : ce qu'il faut savoir

Les données restent **sur l'appareil**. Les codes sont stockés hachés : c'est une protection d'usage, pratique quand le
coach prête sa tablette ou son téléphone aux joueurs, pas un coffre-fort. En cas d'oubli du code coach, la seule
solution est de tout réinitialiser (puis de restaurer une sauvegarde) : un joueur ne peut donc pas prendre l'accès coach.
Pour que chaque joueur remplisse depuis **son propre téléphone**, il faudra ajouter une synchronisation en ligne
(ex. Supabase) avec de vrais comptes.
