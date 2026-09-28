# Tri intelligent de documents

Petite application avec interface graphique qui range automatiquement tes
fichiers **PDF, Word (.docx) et PowerPoint (.pptx)** par centre d'intérêt.

Tu choisis un dossier et tu donnes tes catégories (ex. *Travail*, *Études*,
*Cuisine*, *Voyages*). L'outil lit le contenu de chaque document, demande à
l'IA (l'**API Claude**) dans quelle catégorie il va, puis range les fichiers
dans des sous-dossiers correspondants.

## Installation rapide (recommandée)

Un script fait tout pour toi (installe les dépendances puis lance l'appli) :

- **macOS / Linux :**
  ```bash
  ./installer.sh
  ```
- **Windows :** double-clic sur `installer.bat` (ou lance-le depuis l'invite
  de commandes).

Pense quand même à définir ta clé API (voir l'étape 3 ci-dessous) ; le script
te prévient si elle manque.

## Installation manuelle

1. Installer Python 3.9 ou plus récent.
2. Installer les dépendances :

   ```bash
   pip install -r requirements.txt
   ```

3. Récupérer une clé API Anthropic sur https://console.anthropic.com. Tu n'as
   **rien à configurer** : au premier lancement, colle simplement ta clé dans
   le champ **« Clé API »** de l'application. Elle est mémorisée (dans un
   fichier `cle_api.txt` à côté du programme) pour les fois suivantes.

   *Optionnel* — si tu préfères, tu peux aussi la définir comme variable
   d'environnement `ANTHROPIC_API_KEY` ; l'appli la reprendra automatiquement.

## Utilisation

```bash
python tri_documents.py
```

1. **Parcourir…** pour choisir le dossier contenant tes documents.
2. Saisir tes catégories, une par ligne.
3. Choisir de **copier** (par défaut, les originaux sont conservés) ou de
   **déplacer** les fichiers.
4. Cliquer sur **Lancer le tri**.

L'outil crée un sous-dossier par catégorie dans ton dossier et y range chaque
document. Les documents dont le thème ne correspond à aucune catégorie (ou
illisibles) vont dans **Non classé**.

## Bon à savoir

- **Coût :** chaque document entraîne un appel à l'API Claude (facturé selon ta
  consommation Anthropic). Seul un extrait du début de chaque document est
  envoyé, ce qui suffit pour le thème et limite le coût.
- **Confidentialité :** le contenu des documents est envoyé à l'API d'Anthropic
  pour analyse.
- **Formats pris en charge :** `.pdf`, `.docx`, `.pptx`. Les anciens formats
  `.doc` et `.ppt` ne sont pas lus (convertis-les au préalable).
- **Pas d'écrasement :** si un fichier du même nom existe déjà dans la
  catégorie cible, un suffixe ` (1)`, ` (2)`… est ajouté.

---

## Autre projet du dépôt : QEA Coach (appli iPhone / Android du Quimper Ergué Armel FC)

Le dossier [`coach-app/`](coach-app/README.md) contient une application mobile
pour suivre les joueurs d'une équipe : questionnaires d'après-match, statistiques,
charge (RPE), bien-être et blessures.
