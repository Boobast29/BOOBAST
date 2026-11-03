# Catalogue Football Monde — FMB

Le catalogue livré contient 20 528 fiches joueurs, 12 324 fiches staff, 355 clubs et 18 compétitions. Le complément source comporte 234 profils détaillés ; 220 appartiennent au périmètre du catalogue. Les 316 médias locaux incluent aussi des profils hors périmètre.

Lancer `python outils/serveur.py` depuis manager-foot ou Lancer_Manager_Foot.bat, puis « Explorer le catalogue » sur l'accueil. En partie, ouvrir Outils → Catalogue FMB. Aucun téléchargement d'image n'est nécessaire. Les six segments du ZIP sont réunis et vérifiés automatiquement ; ne pas les extraire à la main.

L'index SQLite est créé dans donnees_jeu/catalogue_fmb, séparément des parties. La consultation ne remplace aucune note de sauvegarde. Les compétences FMB sont sur 99 et ne sont pas les attributs originaux FM sur 20. Les informations manquantes restent inconnues. Les affectations et salaires constituent un instantané de jeu, pas une confirmation des contrats réels actuels. La déclaration d'autorisation fournie par l'utilisateur figure dans l'archive ; son identité n'a pas été authentifiée. Les licences des autres sources ne sont pas modifiées.

Le pack mondial complet v16 (436 020 identités) reste une installation locale séparée : extraire les archives A puis B dans le même dossier, puis exécuter `python outils/importer_monde.py --donnees CHEMIN/Football_Monde`. Lancer ensuite le serveur avec `--donnees CHEMIN/Football_Monde`. Le JSON fusionné d'environ 1,1 Go n'est pas envoyé au navigateur ni stocké dans Git.

Validation : comptages réels du catalogue, recherche, filtres, portrait WebP, CSS, erreurs HTTP 400/403/503 et compilation Python/JavaScript. L'interface nécessite encore une vérification manuelle dans un navigateur.
