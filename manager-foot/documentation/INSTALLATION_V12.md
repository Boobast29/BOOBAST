# Installation unique et compatibilité V12

## Parcours normal

Une commande PowerShell depuis le README installe le code et, si nécessaire,
Python portable 3.14.10 depuis python.org (empreinte SHA-256 vérifiée).
Un seul raccourci « BOOBAST Manager Foot » est créé. Le ZIP V12 est détecté dans
Téléchargements, y compris les noms avec `(1)` / `(2)` et un emplacement Windows
personnalisé. Si le pack privé n'est pas local, sa page s'ouvre pour le téléchargement
authentifié ; aucune URL temporaire ni aucun identifiant de session n'est publié.
Une URL HTTPS directe peut aussi être mémorisée avec `--pack-url`.

## Erreurs reproduites et corrections

- Le lecteur des profils prenait tous les fichiers du dossier, y compris un
  temporaire `.profils_011.json.8NEQx2` tronqué. Le test réel s'arrêtait après
  les 88 lots de joueurs. Il ne lit désormais que les fichiers JSON de profils
  attendus, en écartant les fichiers cachés et temporaires.
- Les 306 fichiers JSON du ZIP V12 transmis ont été lus et sont valides.
  Le temporaire observé dans le dossier extrait n'est pas un lot métier valide.
- L'assistant spécial imposait la taille et l'empreinte d'une seule ancienne
  révision du ZIP ; le lanceur courant avait une validation différente. Une
  validation commune contrôle maintenant la structure et tous les lots requis,
  les chemins, les historiques et les profils. Une empreinte facultative fournie
  explicitement reste contraignante.
- Un téléchargement fini trop tôt pouvait passer pour complet. Le lanceur
  contrôle les longueurs, reprend avec Range/If-Range, gère un serveur qui repart
  de zéro et ne remplace le ZIP précédent qu'après validation.
- L'import pouvait toucher la base utilisable avant la fin de tous les contrôles.
  Il travaille maintenant dans `donnees_jeu/installations/`, reprend ses étapes
  réussies, contrôle le nombre d'identifiants et les images, puis remplace la base.
  La version précédente est sauvegardée ; les ajouts graphiques personnels sont conservés.
- Le double lancement était ambigu : une sonde locale identifie ce serveur et
  un verrou évite deux installations simultanées. Les mises à jour de la base
  se font avant démarrage ; le bouton du jeu explique le raccourci unique.
- Le README conseillait encore l'ouverture directe d'index.html. Le parcours V12
  utilise maintenant toujours le serveur local, sur la même origine navigateur.
- Les anciens lanceurs et la documentation technique sont rangés dans des dossiers
  dédiés. La migration locale archive les anciens fichiers fournis par le projet,
  sans supprimer des fichiers personnels inconnus.

## Contrôle sur le ZIP fourni

ZIP d'origine : 432 068 140 octets, SHA-256
`1e8d791af8928f60f8482358ec80a503cdc216d28716b117819ef87100a8fe59`.

Import complet contrôlé : 436 020 identifiants, aucun doublon d'identifiant,
17 884 portraits locaux, 706 logos. Historiques importés : performances,
transferts, valeurs, sélections, absences et années civiles.
Les identités historiques n'impliquent pas que tous les joueurs soient encore actifs.

Le complément local relie 2 181 fiches au catalogue FMInside/FMBlog par nom et
date de naissance exacts. 25 correspondances ambiguës sont laissées séparées.
Le catalogue documentaire compte 3 631 fiches ; celles sans naissance exploitable
ne sont pas rapprochées de force. Aucune identité V12 ajoutée et aucune note EA
écrasée. Les notes FM apparaissent séparément dans les onglets Attributs et Sources.

La V12 12.1 reprend les fichiers métier inchangés, range les anciennes notices,
retire les fichiers temporaires et ajoute le complément, ses liaisons et son audit.
Les CRC des fichiers recopiés et tous les JSON du ZIP final sont contrôlés.

## Les deux dépôts proposés

- [FMMLoader-26](https://github.com/jal-co/FMMLoader-26) : gestionnaire de mods
  pour le Football Manager officiel. Il n'est pas une dépendance de ce jeu web.
  Les principes de détection des dossiers et de restauration ont guidé l'installation ;
  aucun code de ce dépôt n'est incorporé.
- [fmsave](https://github.com/rhiever/fmsave) : lecteur de sauvegardes FM en lecture
  seule. L'importeur `outils/importer_sauvegarde_fm.py` est déjà présent et reste
  facultatif (Python 3.12+ et installation de fmsave dans un environnement Python
  adapté). Le moteur portable minimal du jeu n'installe pas ces dépendances facultatives.
  Une sauvegarde FM personnelle est nécessaire ; ces dépôts ne fournissent pas une
  base joueurs publique complète ni les photos de tous les joueurs.

## Vérifications reproductibles

```console
python tests/test_installation_unique.py
python tests/test_packs_publics.py
python tests/verifier_installation_reelle.py --donnees CHEMIN/donnees_jeu
python outils/lanceur.py --diagnostic
```

Les tests couvrent les ZIP incomplets, les chemins interdits, la reprise HTTP,
la conservation du cache, le verrou, le remplacement contrôlé de SQLite et le
profil temporaire tronqué. Le test réel contrôle le serveur, les catalogues du
monde étendu, une fiche enrichie, un portrait local et un scénario France.
Le bootstrap Windows est fourni ; son exécution sur Windows n'a pas été réalisée
sur cet environnement Linux. L'import et le serveur ont été exécutés sur le vrai ZIP.
