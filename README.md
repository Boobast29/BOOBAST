# Tri intelligent de documents

Petite application avec interface graphique qui range automatiquement tes
fichiers **PDF, Word (.docx) et PowerPoint (.pptx)** par centre d'intérêt.

Tu choisis un dossier et tu donnes tes catégories (ex. *Travail*, *Études*,
*Cuisine*, *Voyages*). L'outil lit le contenu de chaque document, demande à
l'IA (l'**API Claude**) dans quelle catégorie il va, puis range les fichiers
dans des sous-dossiers correspondants.

## Installation

1. Installer Python 3.9 ou plus récent.
2. Installer les dépendances :

   ```bash
   pip install -r requirements.txt
   ```

3. Récupérer une clé API Anthropic sur https://console.anthropic.com puis la
   définir comme variable d'environnement :

   - **macOS / Linux :**
     ```bash
     export ANTHROPIC_API_KEY="ta-clé-ici"
     ```
   - **Windows (PowerShell) :**
     ```powershell
     setx ANTHROPIC_API_KEY "ta-clé-ici"
     ```
     (puis rouvrir le terminal)

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
