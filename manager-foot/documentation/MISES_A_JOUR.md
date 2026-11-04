## Installation et mises à jour automatiques

Utilise un seul lanceur : `Lancer_Manager_Foot.bat` sous Windows ou `Lancer_Manager_Foot.sh` sous macOS/Linux. À chaque démarrage, il vérifie les changements du dépôt GitHub, met à jour les fichiers du jeu sans toucher à `donnees_jeu/`, puis lance le serveur local. Si Internet est indisponible, il conserve la version déjà installée.

Les fiches, notes et photos du pack Football Monde sont distribuées séparément du dépôt. Le lanceur installe automatiquement un ZIP local `Football_Monde*.zip` trouvé dans le dossier du jeu, le dossier parent ou Téléchargements. Pour télécharger aussi un pack actualisé automatiquement, créer `donnees_jeu/launcher.json` avec l’URL HTTPS directe du ZIP :

```json
{
  "pack_url": "https://exemple.invalid/Football_Monde.zip"
}
```

Remplace cette URL par le lien direct réel de ton pack. Le ZIP est contrôlé avant import ; les données et sauvegardes locales ne sont pas supprimées. Les mises à jour de la base fusionnent les fiches par identifiant et reprennent les lots déjà importés. Python 3.9+ est requis. Pour installer/mette à jour sans lancer le jeu : `py -3 outils/lanceur.py --installer-seul`.
