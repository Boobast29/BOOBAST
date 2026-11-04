# Un seul lanceur

Utilise uniquement **`Lancer_Manager_Foot.bat`** (Windows) ou **`Lancer_Manager_Foot.sh`** (macOS/Linux). Le même lanceur vérifie les mises à jour du code GitHub, cherche le ZIP V12 local, l'importe si nouveau ou modifié, puis démarre le jeu. Les anciens fichiers `Tout_Installer` et `Installer_*V12/Joueurs_Photos` sont conservés comme raccourcis de compatibilité et renvoient vers le lanceur unique.

## ZIP V12 sur ton ordinateur

Au premier lancement, le lanceur cherche un ZIP Football_Monde/V12 dans le dossier du jeu, le dossier parent, Téléchargements, Bureau et Documents. S'il ne le trouve pas, il propose de sélectionner le ZIP et mémorise son chemin. Il vérifie l'archive avant l'import. Un ZIP remplacé ou modifié est réimporté au lancement suivant. Le code de reprise de l'import évite de dupliquer les identifiants et conserve les données locales.

Le pack ne peut pas être actualisé automatiquement depuis un fichier qui reste uniquement sur ton PC et n'a pas changé. Pour recevoir de nouvelles fiches, photos ou notes, remplace le ZIP local par sa nouvelle version. Le téléchargement automatique du pack est aussi possible en configurant une URL HTTPS directe dans `donnees_jeu/launcher.json` sous la forme `{"pack_url":"https://ton-hebergeur/Football_Monde.zip"}`.

Les mises à jour du jeu remplacent les fichiers du programme, sans supprimer `donnees_jeu/` ni les sauvegardes. Internet indisponible ? Le lanceur continue avec la version locale installée. Python 3.9+ est requis.
