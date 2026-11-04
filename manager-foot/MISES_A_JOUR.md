## Démarrage et mises à jour

Lance le jeu avec `Lancer_Manager_Foot.bat` (Windows) ou `Lancer_Manager_Foot.sh` (macOS/Linux). À chaque démarrage, le lanceur vérifie les mises à jour du code sur GitHub puis lance le serveur. Il ne modifie pas `donnees_jeu/` ni les sauvegardes existantes. Sans Internet, il continue avec la version locale.

### Pack V12 sur ton PC

Au premier démarrage, le lanceur cherche un ZIP `Football_Monde*.zip` ou contenant `V12` dans le dossier du jeu, son dossier parent, le dossier courant, Téléchargements/Downloads, Bureau/Desktop et Documents. Il contrôle le ZIP avant import. Si le pack est ailleurs, une fenêtre permet de le choisir ; le chemin est mémorisé pour les prochains démarrages.

Quand tu remplaces ce ZIP par une nouvelle version au même endroit, le lanceur compare son empreinte et réimporte les données modifiées. L'importeur conserve son journal de progression et reprend les fichiers déjà importés. Les photos et fichiers de la base restent locaux.

Pour obtenir le ZIP par Internet au lieu de le garder localement, renseigne une URL HTTPS directe vers l'archive dans `donnees_jeu/launcher.json` :

```json
{
  "pack_url": "https://serveur.example/Football_Monde.zip"
}
```

Cette URL est facultative : elle n'est pas nécessaire quand tu as le ZIP V12 sur ton PC. Il faut Python 3.9+.
