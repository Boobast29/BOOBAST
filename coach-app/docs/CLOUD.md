# Activer le cloud (Supabase) — comptes, réinstallation, notifications, plusieurs équipes

Sans cloud, QEA Coach fonctionne entièrement sur un appareil (celui du coach). Avec le cloud :

- chaque joueur installe l'appli sur **son** téléphone et rejoint son équipe avec un **code d'équipe** + son **code joueur** ;
- un joueur qui **supprime l'appli** et la réinstalle retrouve tout en saisissant à nouveau ses codes ;
- **notifications** : questionnaire à remplir, ressenti d'entraînement, nouveau questionnaire, point à travailler,
  préparation/compo publiée, **rappel quotidien** tant que ce n'est pas rempli, et au coach : **douleur signalée** ;
- plusieurs **coachs nommés**, chacun avec son compte e-mail/mot de passe personnel, par équipe (code coach adjoint) et toutes les **équipes du club** (Seniors A/B/C, U19…U11…).
- compositions d'une équipe avec sélection possible dans les effectifs des autres équipes du club, regroupés par catégorie ;
  seuls les joueurs retenus et leurs informations publiques sont intégrés à la composition publiée.

Ce qui reste privé : chaque joueur ne reçoit qu'une **vue filtrée** calculée par l'appli du coach (ses questionnaires sans la
note du coach, ses blessures, ses objectifs, les compos et préparations publiées, les vidéos partagées). Le document
complet de l'équipe (débriefs, notes, codes) n'est lisible que par les coachs (règles RLS dans la base).

## 1. Créer le projet (10 minutes, gratuit)

1. Créez un compte sur <https://supabase.com> puis un projet (région : Europe, ex. Paris ou Francfort).
2. **Authentication > Sign In / Providers** : laissez *Email* activé et activez **Allow anonymous sign-ins**
   (les joueurs n'ont pas besoin d'e-mail). Si la confirmation des adresses e-mail est activée, chaque coach devra
   confirmer son adresse avant sa première connexion ; l'écran Cloud permet de renvoyer le lien.
3. **Authentication > URL Configuration** : configurez le *Site URL* vers l'adresse publiée de l'application web
   et ajoutez cette adresse aux URL de redirection autorisées. Pour l'application mobile, la confirmation peut être
   faite depuis le navigateur ; revenez ensuite dans l'appli pour vous connecter.
4. **Database > Extensions** : activez **pg_cron** et **pg_net** (envoi des notifications).
5. **SQL Editor** : collez puis exécutez, dans l'ordre, les fichiers de `supabase/migrations/` :
   - `0001_qea_coach.sql` (tables, droits d'accès, fonctions, file de notifications) ;
   - `0002_cron.sql` (envoi chaque minute + rappel quotidien à 18 h) ;
   - `0003_storage.sql` (photos des joueurs).
6. **Project Settings > API** : copiez l'*URL* et la clé *anon public*.

Pour envoyer les confirmations aux adresses des coachs, configurez un serveur SMTP dans les paramètres d'authentification
Supabase. Le service d'e-mail par défaut de Supabase est limité et n'est pas prévu pour l'envoi général en production.

## 2. Brancher l'appli

Dans `coach-app/`, copiez `.env.example` en `.env` et collez l'URL et la clé, puis relancez `npx expo start`.
Pour une version installée (EAS Build), ajoutez les deux variables dans les *Environment variables* du projet EAS.

## 3. Notifications push

Les notifications passent par le service gratuit Expo Push. Il faut un projet EAS :

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # ajoute extra.eas.projectId dans app.json
```

Puis installez une version de l'appli (`eas build`) : les notifications ne fonctionnent pas dans Expo Go sur Android.
Chaque téléphone enregistre automatiquement son jeton à la première synchronisation.

## 4. Utilisation

**Coach sur son premier téléphone** : crée son code coach local et son équipe, puis ouvre Réglages > *Cloud & notifications*
pour créer son compte personnel (nom, e-mail + mot de passe) et mettre l'équipe en ligne.
**Coach avec un compte déjà créé / nouveau téléphone** : depuis l'écran d'accueil de connexion, choisit *Je suis coach
avec un compte cloud*, se connecte, puis touche *Récupérer* pour télécharger ses équipes. Il n'a pas besoin de créer
une équipe vide au préalable. Le premier coach partage ensuite son **code coach adjoint** ; les autres coachs peuvent
se connecter à leur compte puis rejoindre chaque équipe avec ce code. L'écran affiche aussi le **code joueurs** à partager
sur le groupe de l'équipe.
Pour une composition, choisir l'équipe cible puis ajouter des joueurs depuis les effectifs du club, triés par catégorie.

**Joueur** : écran d'accueil > *J'ai un code d'équipe* > code > son nom > son code joueur (réglé par le coach dans la fiche
du joueur ; 5 essais max puis blocage 15 minutes).

## 5. Vérifier en local

```bash
npm test          # logique des vues joueur et fusion des réponses
npm run test:sql  # schéma + droits d'accès sur un Postgres local (voir supabase/tests/run_local.sh)
```
