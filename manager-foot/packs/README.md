# Catalogue Football Monde — FMB

Le catalogue livré contient 20 528 fiches joueurs, 12 324 fiches staff, 355 clubs et 18 compétitions. Le complément source comporte 234 profils détaillés ; 220 appartiennent au périmètre du catalogue. Les 316 médias locaux incluent aussi des profils hors périmètre.

Les cinq pays jouables contiennent 18 589 joueurs : 9 982 possèdent une URL de portrait dans le pack FMB, dont 120 disposent aussi d'un fichier local. Cinq portraits supplémentaires ont été rapprochés manuellement de leurs fiches sur Wikimedia Commons, avec auteur, licence et page source dans `portraits-commons-verifies.json` : Khusanov, Beraldo, Sano, Lamine Camara et Diomandé. Pour les 8 602 autres joueurs, le jeu essaie à l'affichage une adresse candidate fondée sur leur identifiant FMB et le format des URL confirmées. Ce n'est **pas** une photo attestée : si l'adresse ne répond pas, les initiales s'affichent. Une URL n'est pas une garantie que le serveur distant répondra. La fiche de Lamine Camara signale une divergence sur sa date de naissance entre FMInside et l'AS Monaco.

Lancer `python outils/serveur.py` depuis manager-foot ou Lancer_Manager_Foot.bat, puis « Explorer le catalogue » sur l'accueil. En partie, ouvrir Outils → Catalogue FMB. Aucun téléchargement d'image n'est nécessaire. Les six segments du ZIP sont réunis et vérifiés automatiquement ; ne pas les extraire à la main.

L'index SQLite est créé dans donnees_jeu/catalogue_fmb, séparément des parties. La consultation ne remplace aucune note de sauvegarde. Les compétences FMB sont sur 99 et ne sont pas les attributs originaux FM sur 20. Les informations manquantes restent inconnues. Les affectations et salaires constituent un instantané de jeu, pas une confirmation des contrats réels actuels. La déclaration d'autorisation fournie par l'utilisateur figure dans l'archive ; son identité n'a pas été authentifiée. Les licences des autres sources ne sont pas modifiées.

Le pack mondial complet v16 (436 020 identités) reste une installation locale séparée : extraire les archives A puis B dans le même dossier, puis exécuter `python outils/importer_monde.py --donnees CHEMIN/Football_Monde`. Lancer ensuite le serveur avec `--donnees CHEMIN/Football_Monde`. Le JSON fusionné d'environ 1,1 Go n'est pas envoyé au navigateur ni stocké dans Git.

Validation : comptages réels du catalogue, recherche, filtres, portrait WebP, CSS, erreurs HTTP 400/403/503 et compilation Python/JavaScript. L'interface nécessite encore une vérification manuelle dans un navigateur.
