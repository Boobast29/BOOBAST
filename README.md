# BOOBAST — Manager Foot

## Depuis le ZIP GitHub

Décompresse **tout** le ZIP, puis double-clique sur **JOUER.bat** à la racine.
Le lanceur prépare Python si nécessaire, installe ou reprend la V12 et ouvre le jeu.
Laisse le ZIP V12 dans **Téléchargements**, sans le décompresser.
Réutilise **JOUER.bat** pour les prochaines ouvertures.

## Installer et jouer sous Windows

Colle cette seule commande dans **PowerShell** :

```powershell
irm https://raw.githubusercontent.com/Boobast29/BOOBAST/Manager-foot/Installer.ps1 | iex
```

Le programme télécharge le code, prépare Python portable si nécessaire et crée
**BOOBAST Manager Foot** sur le Bureau. C'est le seul raccourci à utiliser ensuite.
Il installe ou reprend les données, les contrôle, puis ouvre le jeu.
Aucun droit administrateur n'est nécessaire pour le moteur portable.

**V12 :** laisse `Football_Monde_JSON_Visuels_v12.zip` (y compris un nom avec
`(1)` ou `(2)`) dans Téléchargements. Le lanceur le trouve automatiquement.
Si ce ZIP privé n'est pas encore sur ton PC, sa page s'ouvre : clique une fois sur
Télécharger, puis laisse le lanceur détecter la fin du téléchargement.
Une page ChatGPT privée ne peut pas être téléchargée anonymement comme un ZIP.

Si tu as déjà extrait le dépôt, ouvre **manager-foot/Lancer_Manager_Foot.bat**.
Tu peux aussi glisser ton ZIP sur ce fichier lorsque Python est disponible.

## Ce qui est installé

- Le jeu et ses catalogues FMInside/FMBlog inclus dans le dépôt.
- La base V12 complète : fiches, notes disponibles, portraits locaux, logos,
  divisions et historiques contenus dans le ZIP.
- Un complément FM local, rapproché uniquement par nom et naissance exacts :
  les homonymes ambigus restent séparés, les notes EA originales sont conservées.

Toutes les fiches historiques n'ont pas de notes ni de photo réelle : les champs
absents restent inconnus. Les dates et la provenance des sources restent visibles.
Les outils IA externes et l'import d'une sauvegarde FM restent optionnels.

## Reprise et mises à jour

Utilise toujours le même raccourci. Un téléchargement interrompu est repris si
le serveur le permet. Un pack non valide ne remplace pas la base utilisable.
L'import s'effectue dans une base provisoire ; une sauvegarde de la base précédente
est conservée avant remplacement. Le deuxième lancement réutilise la base contrôlée.

Les parties restent dans le navigateur ; exporte-les depuis **Options** pour
changer de PC. Le serveur conserve l'adresse `http://127.0.0.1:8765/`.
Les données locales et images personnelles sont conservées dans `donnees_jeu/`.

## Options utiles

Depuis le dossier `manager-foot`, avec Python installé :

```console
python outils/lanceur.py --pack "D:\Mes fichiers\Football_Monde_JSON_Visuels_v12.zip"
python outils/lanceur.py --pack-url "https://mon-hebergement/Football_Monde.zip"
python outils/lanceur.py --installer-seul
python outils/lanceur.py --hors-ligne
python outils/lanceur.py --diagnostic
```

L'URL doit être un **lien HTTPS direct vers le ZIP**, pas une page de partage.
Elle est mémorisée localement. `--sha256 EMPREINTE` permet de verrouiller le pack.
`--enrichir` lance les compléments réseau facultatifs, plus longs ; ils ne sont
pas indispensables au lancement de la V12. Certains fournisseurs peuvent refuser
ou ne plus actualiser leurs données.

Linux/macOS : Python 3.9+ puis `sh manager-foot/Lancer_Manager_Foot.sh`.
Le script PowerShell et le moteur portable concernent Windows.

## Dossier du projet

Un lanceur par système ; les anciens outils manuels sont rangés dans
`manager-foot/outils/maintenance/` et la documentation technique dans
`manager-foot/documentation/`. Il n'est pas nécessaire de les ouvrir pour jouer.

Détails et sources : [installation et V12](manager-foot/documentation/INSTALLATION_V12.md).

## Effectifs des trois divisions

Sur l’accueil, utilise **Effectifs FM D1–D3** sous le pays souhaité.
La nouvelle carrière charge les cinq pays, tous leurs groupes et les effectifs
première/réserve/jeunes référencés. Avec la V12 enrichie 12.3, les 1 939 joueurs des équipes affiliées
allemandes et espagnoles sont conservés en réserve, avec leur UID source.
Les anciennes parties restent des instantanés : ces ajouts concernent une nouvelle carrière.
Les notes détaillées et portraits de la V12 enrichie sont lus depuis le pack local.
Trois liens italiens de réserves sans UID distinct restent exclus des divisions ;
aucun club ou joueur n’est inventé pour les remplacer.
