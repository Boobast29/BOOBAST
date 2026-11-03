# Monde étendu FM26

Depuis l’accueil : **Monde : clubs et championnats** → consulter un pays → **Préparer la carrière · tous les pays** → choisir un club.

Le pack comprend 355 clubs, 18 compétitions, 18 589 joueurs affectés sans ambiguïté, dont 536 avec attributs détaillés documentés, et 12 324 fiches de staff. Il reprend le catalogue FMB déjà versionné et l’enrichit avec les fiches FMInside récupérées. Tous les pays et les 18 championnats/groupes sont chargés dans une même carrière. Le club choisi détermine le pays utilisant le moteur complet ; les autres championnats et coupes avancent en simulation rapide. Leurs classements et historiques sont conservés dans la sauvegarde. Les promotions sont simplifiées (trois places au maximum, réparties entre groupes), sans barrages, et ne changent jamais le pays d’un club. Les matchs rapides ne produisent pas les statistiques individuelles détaillées d’un match complet. Le menu en partie **Tous les pays** affiche les classements étrangers.

Les noms et affectations viennent des instantanés Football Manager, sans vérification de la situation actuelle. Une partie des effectifs source est incomplète (notamment National : 17 clubs référencés ; trois liens de réserves italiennes renvoient au club parent de D1 et sont exclus des divisions inférieures faute d’identifiant distinct). Les attributs détaillés documentés sont conservés ; pour les autres joueurs, les qualités sont estimées à partir du niveau global source, ou d’une valeur de simulation si ce niveau est inconnu. Chaque joueur porte `dataQuality` (`documented_attributes`, `estimated_attributes`, `generated_filler`). Les budgets, installations, personnalités et données absentes utilisent les règles de simulation du moteur. La nationalité inconnue est `UNK`. Les jeunes/réserves sont rattachés au club parent, sans compétition de jeunes séparée.

Le staff est conservé dans `club.staffReference` comme référence documentaire ; les fonctions du staff de la carrière ne sont pas automatiquement remplacées. Les logos restent des liens externes. Les salaires connus FMInside restent hebdomadaires dans le moteur et sont affichés au mois ; les salaires en livres du pack FMB ne sont pas transformés en euros arbitrairement. Les dates de contrat source sont conservées comme métadonnées ; les durées jouables suivent encore le moteur.

Le bouton **Joueurs FMInside → Intégrer aux nouvelles carrières** fusionne les profils par UID FM, puis à défaut par nom exact et club reconnu. Il ignore les homonymes ambigus et n’ajoute un nouveau joueur que dans un club reconnu. Il ne déplace pas un joueur déjà identifié par UID vers un autre club. Le monde courant des nouvelles carrières est remplacé lors de la préparation du monde multi-pays ; les sauvegardes de parties existantes sont distinctes.

Reconstruction depuis la racine `manager-foot` :

```sh
python outils/importer_fminside.py --pages 30 --sortie packs/fminside-fm26.json
python outils/construire_base_mondiale.py
node tests/integration_fminside_node.js
```

`--pages 0` continue la découverte tant que le site renvoie de nouvelles fiches ; ce n’est pas une garantie d’exhaustivité. Les fiches déjà collectées sont réutilisées. Les erreurs et la couverture partielle figurent dans le JSON. Les archives nationales sont compressées en gzip pour limiter le téléchargement.

Dernier lot : 600 profils FMInside FM26 avec 36 attributs chacun, dont une partie concerne des clubs hors des 18 compétitions ou ne correspond pas aux affectations sources retenues. Le nombre de joueurs détaillés dans les bases nationales combinées est de 536, toutes sources confondues. Les tentatives suivantes ont rencontré des délais de connexion.

Dans le monde multi-pays, les joueurs de nationalité inconnue ne sont pas arbitrairement comptés comme non-UE pour bloquer les transferts. Leur statut réglementaire réel reste inconnu.

Le complément FMInside est chargé depuis `packs/fminside-fm26.json.gz` et appliqué par UID aux bases nationales au chargement. Cela permet de publier de nouveaux attributs sans retransmettre toutes les bases de pays.

Correctif fourni : FMScout FM27 v261031, deux fichiers LNC analysés sans exécuter le programme batch. Correspondances par UID exact : 314 clubs et 18 compétitions. Les anciens noms de clubs et la version du correctif sont conservés dans les métadonnées ; ce pack ne fournit aucun attribut joueur.
