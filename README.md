# Tri intelligent de documents

Application avec interface graphique qui range automatiquement tes fichiers
**PDF, Word (.docx), PowerPoint (.pptx), texte (.txt, .md)** par centre
d'intérêt.

Tu choisis **ce qui doit être scanné** (tout le PC ou des dossiers précis) et
tu donnes tes catégories (ex. *Travail*, *Études*, *Cuisine*, *Finances*).
L'outil lit le contenu de chaque document, détermine dans quelle catégorie il
va, puis range les fichiers dans des sous-dossiers du dossier de destination.

## Deux moteurs d'analyse au choix

- **Local (sur ton PC, sans internet)** — analyse le contenu et le nom de
  chaque fichier par mots-clés. Rien n'est envoyé sur internet, c'est **gratuit
  et privé**. C'est le mode par défaut.
- **IA locale (Ollama)** — un vrai modèle de langage qui tourne **sur ton PC**
  pour une analyse fine du contenu, **sans clé API ni internet**. Nécessite
  d'installer [Ollama](https://ollama.com) et de télécharger un modèle.
- **API Claude** — analyse fine du contenu par l'IA. Plus précis, mais nécessite
  une clé API Anthropic et envoie un extrait de chaque document à Anthropic.

### Et « Copilot Windows » ?

Copilot Windows **n'expose aucune API publique** permettant à un programme de
lui envoyer automatiquement des milliers de documents pour les classer. On ne
peut donc pas le piloter en arrière-plan pour trier tout un PC. Les moteurs
**Local** et **IA locale (Ollama)** en sont les équivalents automatisables :
toute l'analyse se fait sur ta machine, sans rien envoyer ailleurs.

### Utiliser le moteur « IA locale (Ollama) »

1. Installe Ollama depuis https://ollama.com.
2. Télécharge un modèle (dans un terminal), par exemple :
   ```bash
   ollama pull llama3.2
   ```
   D'autres modèles conviennent aussi (`qwen2.5:3b`, `mistral`…). Les petits
   modèles sont plus rapides ; les plus gros, plus précis.
3. Dans l'appli, choisis le moteur **IA locale (Ollama)** et indique le nom du
   modèle téléchargé. Ollama doit être lancé (il l'est automatiquement après
   installation sous Windows/macOS).

## Installation rapide (recommandée)

Un script fait tout pour toi (installe les dépendances puis lance l'appli) :

- **macOS / Linux :**
  ```bash
  ./installer.sh
  ```
- **Windows :** double-clic sur `installer.bat` (ou lance-le depuis l'invite
  de commandes).

Le moteur **Local** fonctionne sans clé API. La clé n'est utile que pour le
moteur **API Claude**.

## Installation manuelle

1. Installer Python 3.9 ou plus récent.
2. Installer les dépendances :

   ```bash
   pip install -r requirements.txt
   ```

3. *(Uniquement pour le moteur API Claude)* récupérer une clé API Anthropic sur
   https://console.anthropic.com. Au premier lancement, colle ta clé dans le
   champ **« Clé API »** de l'application ; elle est mémorisée (fichier
   `cle_api.txt` à côté du programme) pour les fois suivantes. Tu peux aussi la
   définir comme variable d'environnement `ANTHROPIC_API_KEY`.

## Utilisation

```bash
python tri_documents.py
```

1. **Que veux-tu scanner ?** : *Tout le PC* (tous les disques) ou *des dossiers
   que tu choisis*.
2. **Dossier de destination** : l'endroit où les sous-dossiers de catégories
   seront créés.
3. **Moteur d'analyse** : *Local* (par défaut) ou *API Claude*.
4. **Catégories** : une par ligne. Ajoute des mots-clés après « : » pour
   guider le tri, par exemple :

   ```
   Cuisine: recette, ingrédient, cuisson, four
   Finances: facture, impôt, banque, salaire
   ```

   Ces mots-clés sont utilisés par **tous les moteurs** : le moteur Local les
   recherche en **mots entiers** et reconnaît les **variantes** d'un mot
   (facture ≈ factures ≈ facturation), avec un poids plus fort dans le nom du
   fichier et pour tes mots-clés que pour le nom de la catégorie ; les moteurs
   **Ollama** et **Claude** les reçoivent comme **indices** pour mieux juger.
   Plus tes mots-clés sont précis, meilleur est le tri.

5. **Options** :
   - *Simulation* (activée par défaut) : montre ce qui serait fait **sans rien
     déplacer ni copier**. Idéal pour un premier essai.
   - *Déplacer* (sinon, copie : les originaux sont conservés).
6. Cliquer sur **Lancer le tri**. Une **barre de progression** indique
   l'avancement ; le bouton **Arrêter** interrompt à tout moment ; le bouton
   **Ouvrir le dossier** ouvre la destination à la fin.

L'outil crée un sous-dossier par catégorie dans le dossier de destination et y
range chaque document. Les documents dont le thème ne correspond à aucune
catégorie vont dans **Non classé**.

À la fin, un **récapitulatif** (nombre de documents par catégorie, échecs,
ignorés) s'affiche dans le journal, et un **rapport CSV** (`rapport-*.csv`) est
écrit dans le dossier de destination : il liste, pour chaque fichier, sa
catégorie, la justification et sa destination — pratique pour vérifier le tri
(ou revenir en arrière). Tes réglages (dossiers, destination, moteur, modèle,
catégories, options) sont **mémorisés** d'un lancement à l'autre.

## Bon à savoir

- **Sécurité du scan « tout le PC »** : les dossiers système et techniques
  (Windows, Program Files, AppData, node_modules, caches, dossiers cachés…)
  sont automatiquement ignorés. Par défaut les fichiers sont **copiés** et le
  mode **simulation** est activé : commence par une simulation pour vérifier le
  résultat avant de déplacer quoi que ce soit.
- **Coût (moteur API Claude uniquement)** : chaque document entraîne un appel à
  l'API Claude (facturé selon ta consommation Anthropic). Seul un extrait du
  début de chaque document est envoyé.
- **Confidentialité** : en mode **Local**, rien ne quitte ton PC. En mode **API
  Claude**, un extrait du contenu est envoyé à Anthropic pour analyse.
- **Formats pris en charge** : `.pdf`, `.docx`, `.pptx`, `.txt`, `.md`. Les
  anciens formats `.doc` et `.ppt` ne sont pas lus (convertis-les au préalable).
- **Pas d'écrasement** : si un fichier du même nom existe déjà dans la
  catégorie cible, un suffixe ` (1)`, ` (2)`… est ajouté.
