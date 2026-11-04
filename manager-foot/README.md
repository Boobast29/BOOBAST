# Manager Foot

**Ouvre uniquement `Lancer_Manager_Foot.bat`** sous Windows, ou
`sh Lancer_Manager_Foot.sh` sous Linux/macOS (Python 3.9+).
Le même lanceur installe, vérifie, reprend une installation interrompue et démarre le jeu.

Place le ZIP V12 dans Téléchargements. Il n'est pas nécessaire de l'extraire.
Sous Windows, si Python manque, le lanceur prépare un moteur portable officiel.
Le raccourci « BOOBAST Manager Foot » sur le Bureau permet les ouvertures suivantes.

Ne lance pas directement `index.html` pour utiliser la V12 : le serveur local est
nécessaire aux catalogues, images et données réelles.

- Ferme la fenêtre du serveur avant une mise à jour de la base.
- Le lanceur conserve les données locales et la base précédente.
- Les parties se sauvegardent dans le navigateur ; **Options → Exporter** permet de les emporter.
- Diagnostic : `python outils/lanceur.py --diagnostic`.
- Journal : `donnees_jeu/journal_lanceur.txt`.
- Compléments réseau facultatifs : `python outils/lanceur.py --enrichir`.

[Installation complète et commande PowerShell](../README.md) ·
[Documentation technique](documentation/INSTALLATION_V12.md) ·
[Anciens outils manuels](outils/maintenance/)
