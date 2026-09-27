# Coach Suivi — appli iPhone & Android

Application mobile pour qu'un coach suive ses joueurs après chaque match :

- **Effectif** : fiche joueur (numéro, poste, date de naissance, notes), archivage.
- **Matchs** : adversaire, date, domicile/extérieur, compétition, score.
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
- **Blessures** : zone, côté, type, gravité, statut (indisponible / en reprise / guérie), retour prévu, traitement.
- **Vidéos** : vidéothèque de l'équipe — importer depuis la galerie, **filmer** directement, ou coller un lien
  (YouTube, Drive, Hudl, Veo, .mp4). Catégories (match, entraînement, analyse, adversaire, exercice),
  lien vers un match, **joueurs tagués**, notes/consignes, et **temps forts** horodatés (ex. 12:30 « pressing réussi »)
  : un appui fait sauter la vidéo au bon moment. Les vidéos apparaissent aussi dans la fiche joueur et le détail du match.
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
- Couleurs : `src/components/theme.ts`.

## Organisation du code

```
src/
  app/                  écrans (Expo Router : chaque fichier = un écran)
    (tabs)/             onglets Accueil, Joueurs, Matchs, Vidéos, Blessures
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
```

## Pistes pour la suite

- Synchronisation en ligne (ex. Supabase/Firebase) pour plusieurs coachs / staff médical.
- Lien envoyé aux joueurs pour qu'ils remplissent eux-mêmes leur questionnaire.
- Suivi des entraînements (charge hebdomadaire complète), graphiques plus poussés, notifications.
