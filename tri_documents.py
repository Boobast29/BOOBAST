#!/usr/bin/env python3
"""Tri intelligent de documents (PDF, Word, PowerPoint, texte) par centre d'intérêt.

Application avec interface graphique. Tu choisis ce qui doit être scanné
(**tout le PC** ou des dossiers précis), tu donnes tes catégories, et l'outil
lit le contenu de chaque document, détermine dans quelle catégorie il va, puis
range les fichiers dans des sous-dossiers correspondants.

Trois moteurs d'analyse au choix :

* **Local (sur ton PC, sans internet)** — analyse le contenu et le nom du
  fichier par mots-clés. Rien n'est envoyé sur internet, c'est gratuit et privé.
* **IA locale (Ollama)** — un modèle de langage qui tourne sur ta machine, pour
  une analyse fine du contenu sans clé API ni internet.
* **API Claude** — analyse fine du contenu par l'IA (nécessite une clé API
  Anthropic).

À propos de « Copilot Windows » : Copilot Windows n'expose aucune API publique
permettant de lui envoyer automatiquement des milliers de documents pour les
classer. Il n'est donc pas possible de piloter Copilot en arrière-plan pour
trier tout un PC. Le moteur **Local** est l'équivalent automatisable le plus
proche : toute l'analyse se fait sur ta machine, sans rien envoyer ailleurs.

Lancement :
    python tri_documents.py
"""

from __future__ import annotations

import json
import os
import queue
import re
import shutil
import string
import sys
import threading
import tkinter as tk
import unicodedata
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk

# --- Lecture du contenu des documents --------------------------------------

# Nombre de caractères de contenu analysés par document. Un extrait assez
# généreux améliore la précision du classement, tout en maîtrisant le coût/la
# vitesse côté IA.
EXTRAIT_MAX_CARACTERES = 9000

MODELE = "claude-opus-4-8"

EXTENSIONS_SUPPORTEES = {".pdf", ".docx", ".pptx", ".txt", ".md"}

# Dossiers qu'on ne scanne jamais : système, caches, environnements de dev…
# Trier des fichiers système n'a pas de sens et peut casser des programmes.
DOSSIERS_IGNORES = {
    "windows", "program files", "program files (x86)", "programdata",
    "$recycle.bin", "$windows.~bs", "$windows.~ws", "system volume information",
    "recovery", "perflogs", "appdata", "application data", "local settings",
    "node_modules", ".git", ".svn", ".hg", ".cache", "__pycache__",
    ".venv", "venv", "env", "site-packages", "temp", "tmp",
    "library", "system", "private", ".trash", ".local", ".config",
}


def lire_pdf(chemin: Path) -> str:
    from pypdf import PdfReader

    lecteur = PdfReader(str(chemin))
    pages = lecteur.pages
    # Sur un PDF court, on lit tout dans l'ordre. Sur un PDF long, on échantillonne
    # début + milieu + fin : la 1re page est souvent une page de garde peu
    # informative, et le thème se précise au fil du document.
    if len(pages) <= 6:
        indices = range(len(pages))
    else:
        milieu = len(pages) // 2
        indices = [0, 1, 2, milieu, milieu + 1, len(pages) - 2, len(pages) - 1]

    morceaux = []
    for i in indices:
        texte = pages[i].extract_text() or ""
        if texte:
            morceaux.append(texte)
        if sum(len(m) for m in morceaux) >= EXTRAIT_MAX_CARACTERES:
            break
    return "\n".join(morceaux)


def lire_docx(chemin: Path) -> str:
    from docx import Document

    document = Document(str(chemin))
    morceaux = []
    for paragraphe in document.paragraphs:
        if paragraphe.text.strip():
            morceaux.append(paragraphe.text)
        if sum(len(m) for m in morceaux) >= EXTRAIT_MAX_CARACTERES:
            break
    return "\n".join(morceaux)


def lire_pptx(chemin: Path) -> str:
    from pptx import Presentation

    presentation = Presentation(str(chemin))
    morceaux = []
    for diapo in presentation.slides:
        for forme in diapo.shapes:
            if forme.has_text_frame and forme.text_frame.text.strip():
                morceaux.append(forme.text_frame.text)
        if sum(len(m) for m in morceaux) >= EXTRAIT_MAX_CARACTERES:
            break
    return "\n".join(morceaux)


def lire_texte_brut(chemin: Path) -> str:
    # On lit au plus l'extrait nécessaire, en tolérant les encodages exotiques.
    with open(chemin, "r", encoding="utf-8", errors="replace") as f:
        return f.read(EXTRAIT_MAX_CARACTERES)


def extraire_texte(chemin: Path) -> str:
    """Renvoie un extrait du contenu textuel du document."""
    extension = chemin.suffix.lower()
    if extension == ".pdf":
        texte = lire_pdf(chemin)
    elif extension == ".docx":
        texte = lire_docx(chemin)
    elif extension == ".pptx":
        texte = lire_pptx(chemin)
    elif extension in (".txt", ".md"):
        texte = lire_texte_brut(chemin)
    else:
        return ""
    return texte[:EXTRAIT_MAX_CARACTERES].strip()


# --- Recherche des documents sur le PC --------------------------------------


def lister_disques() -> list[Path]:
    """Renvoie la liste des racines à scanner pour « tout le PC »."""
    if os.name == "nt":
        disques = []
        for lettre in string.ascii_uppercase:
            racine = Path(f"{lettre}:\\")
            if racine.exists():
                disques.append(racine)
        return disques
    # macOS / Linux : on part du dossier personnel (plus sûr que la racine « / »,
    # qui est pleine de fichiers système).
    return [Path.home()]


def _doit_ignorer(nom_dossier: str) -> bool:
    nom = nom_dossier.lower()
    return nom in DOSSIERS_IGNORES or nom.startswith(".")


def scanner_documents(racines: list[Path], journaliser, arret,
                      exclure: set[Path] | None = None,
                      limite: int | None = None) -> list[Path]:
    """Parcourt récursivement les racines et renvoie les documents trouvés.

    Ignore les dossiers système/caches (et tout dossier de `exclure`, p. ex. le
    dossier de destination) et s'arrête proprement si `arret` (un
    threading.Event) est déclenché. Si `limite` est fixée, s'arrête une fois ce
    nombre de documents atteint (utile pour échantillonner rapidement).
    """
    exclure = exclure or set()
    trouves: list[Path] = []
    for racine in racines:
        if arret.is_set() or (limite is not None and len(trouves) >= limite):
            break
        journaliser(f"Scan de {racine}…")
        for dossier_courant, sous_dossiers, fichiers in os.walk(racine):
            if arret.is_set() or (limite is not None and len(trouves) >= limite):
                break
            # Élague les dossiers à ignorer (modification en place de la liste) :
            # noms système/caches, et le dossier de destination le cas échéant.
            gardes = []
            for d in sous_dossiers:
                if _doit_ignorer(d):
                    continue
                try:
                    if (Path(dossier_courant) / d).resolve() in exclure:
                        continue
                except OSError:
                    pass
                gardes.append(d)
            sous_dossiers[:] = gardes
            for nom in fichiers:
                if Path(nom).suffix.lower() in EXTENSIONS_SUPPORTEES:
                    trouves.append(Path(dossier_courant) / nom)
                    if len(trouves) % 200 == 0:
                        journaliser(f"  … {len(trouves)} documents repérés")
    return trouves


# --- Catégories (nom + mots-clés optionnels) --------------------------------


def parser_categories(lignes: list[str]) -> list[tuple[str, list[str]]]:
    """Transforme les lignes saisies en (nom, mots-clés).

    Format accepté par ligne :
        Travail
        Cuisine: recette, ingrédient, four, cuisson
    Les mots-clés (après « : ») servent au moteur local. Pour le moteur Claude,
    seul le nom compte.
    """
    categories: list[tuple[str, list[str]]] = []
    for ligne in lignes:
        ligne = ligne.strip()
        if not ligne:
            continue
        if ":" in ligne:
            nom, reste = ligne.split(":", 1)
            mots = [m.strip() for m in re.split(r"[,;]", reste) if m.strip()]
        else:
            nom, mots = ligne, []
        nom = nom.strip()
        if nom:
            categories.append((nom, mots))
    return categories


# --- Moteur d'analyse LOCAL (sur le PC, sans internet) ----------------------


def _normaliser(texte: str) -> str:
    """Minuscule, sans accents, et séparateurs uniformisés en espaces.

    Remplacer la ponctuation et les séparateurs (`_`, `-`, `.`…) par des espaces
    permet de retrouver un mot-clé même collé à un séparateur, comme « facture »
    dans « facture_edf.pdf ».
    """
    texte = texte.lower()
    texte = unicodedata.normalize("NFD", texte)
    texte = "".join(c for c in texte if unicodedata.category(c) != "Mn")
    # Tout ce qui n'est ni lettre ni chiffre devient un espace.
    return re.sub(r"[^0-9a-z]+", " ", texte).strip()


# Racinisation française légère (sans dépendance) : on retire un suffixe courant
# pour rattacher les variantes d'un même mot (facture / factures / facturation /
# facturer → « factur »). On évite volontairement les terminaisons purement
# verbales (ons, ez, ent…) qui rattacheraient mal les noms, et on n'agit que sur
# les mots assez longs pour ne pas sur-regrouper (art ≠ artisan).
_SUFFIXES_FR = (
    "issements", "issement", "ations", "ation", "ateurs", "ateur", "atrice",
    "ements", "ement", "ances", "ance", "ences", "ence", "ables", "able",
    "ibles", "ible", "ites", "ite", "eaux", "aux", "euses", "euse", "eurs",
    "eur", "ieres", "iere", "ier", "er", "ee", "ees", "es", "s", "x", "e",
)


def _raciniser(mot: str) -> str:
    """Renvoie une racine approximative d'un mot déjà normalisé."""
    if len(mot) <= 4:
        return mot
    for suffixe in _SUFFIXES_FR:
        if mot.endswith(suffixe) and len(mot) - len(suffixe) >= 4:
            return mot[: -len(suffixe)]
    return mot


def _raciner_tokens(texte_norm: str) -> list[str]:
    """Découpe un texte normalisé en mots et renvoie leurs racines."""
    return [_raciniser(mot) for mot in texte_norm.split()]


def _compter_sequence(sequence: list[str], tokens: list[str]) -> int:
    """Compte les occurrences consécutives de `sequence` dans `tokens`."""
    n = len(sequence)
    if n == 0:
        return 0
    return sum(1 for i in range(len(tokens) - n + 1)
               if tokens[i:i + n] == sequence)


# Poids du nom de fichier : un mot-clé dans le nom est un signal bien plus fort
# que dans le corps du document.
POIDS_NOM_FICHIER = 3
# Poids relatif : tes mots-clés (spécifiques) comptent plus que le nom de la
# catégorie (souvent générique, ex. « Personnel »).
POIDS_MOT_CLE = 2
POIDS_NOM_CATEGORIE = 1

# En mode multi-catégories, on retient aussi les catégories dont le score
# atteint cette fraction du meilleur (signal nettement présent, pas marginal).
SEUIL_MULTI = 0.6


def classer_local(nom_fichier: str, texte: str,
                  categories: list[tuple[str, list[str]]],
                  multi: bool = False) -> dict:
    """Classe un document par correspondance de mots-clés pondérée (aucun réseau).

    Le texte et les mots-clés sont réduits à leurs **racines** (facture ≈
    factures ≈ facturation), puis comparés en **mots/expressions entiers**. Pour
    chaque catégorie, on additionne les occurrences de son nom et de ses
    mots-clés, avec deux pondérations :

    * une occurrence dans le **nom du fichier** pèse plus que dans le corps ;
    * un **mot-clé** que tu as fourni pèse plus que le nom (générique) de la
      catégorie.

    Si `multi` est faux : la catégorie au meilleur score gagne (en cas d'égalité
    ou de score nul, « Non classé »). Si `multi` est vrai : toutes les catégories
    dont le score est proche du meilleur sont renvoyées dans « categories ».
    """
    tokens_nom = _raciner_tokens(_normaliser(nom_fichier))
    tokens_corps = _raciner_tokens(_normaliser(texte))

    scores: list[tuple[float, str, str]] = []  # (score, catégorie, motif)
    for nom, mots in categories:
        termes = [(nom, POIDS_NOM_CATEGORIE)] + [(m, POIDS_MOT_CLE) for m in mots]
        score = 0.0
        touches: list[str] = []
        for terme, poids in termes:
            sequence = _raciner_tokens(_normaliser(terme))
            dans_nom = _compter_sequence(sequence, tokens_nom)
            dans_corps = _compter_sequence(sequence, tokens_corps)
            gain = poids * (POIDS_NOM_FICHIER * dans_nom + dans_corps)
            if gain:
                score += gain
                touches.append(terme)
        scores.append((score, nom, ", ".join(touches[:5])))

    scores.sort(key=lambda x: x[0], reverse=True)
    meilleur = scores[0]

    if meilleur[0] == 0:
        return {"categorie": "Non classé",
                "justification": "Aucun mot-clé de catégorie trouvé."}

    if multi:
        # Toutes les catégories dont le signal est proche du meilleur.
        seuil = meilleur[0] * SEUIL_MULTI
        retenues = [(c, motif) for s, c, motif in scores if s >= seuil and s > 0]
        return {
            "categories": [c for c, _ in retenues],
            "justification": "; ".join(
                f"{c} ({motif})" for c, motif in retenues),
        }

    # Égalité en tête : ambigu, on préfère ne pas trancher au hasard.
    if len(scores) > 1 and scores[1][0] == meilleur[0]:
        return {"categorie": "Non classé",
                "justification": (
                    f"Ambigu entre « {meilleur[1]} » et « {scores[1][1]} » "
                    "(scores égaux).")}
    return {"categorie": meilleur[1],
            "justification": f"Mots-clés trouvés : {meilleur[2]}"}


# --- Moteur d'analyse CLAUDE (API) ------------------------------------------


class _ErreurFatale(Exception):
    """Erreur d'un moteur IA qui rendra TOUS les documents en échec.

    (clé invalide, plus de crédit, modèle introuvable, quota épuisé…). On
    interrompt alors le tri au lieu de réessayer en vain sur chaque fichier.
    """


# Indices d'erreurs définitives dans le message d'une exception (Claude/Anthropic).
_MOTS_ERREUR_FATALE = (
    "credit balance", "billing", "plans & billing", "quota",
    "authentication", "invalid x-api-key", "invalid api key",
    "permission", "could not resolve authentication",
)


def _est_fatale(message: str) -> bool:
    message = message.lower()
    return any(motif in message for motif in _MOTS_ERREUR_FATALE)


def _indices_categories(categories: list[tuple[str, list[str]]]) -> str:
    """Formate la liste des catégories et leurs mots-clés, en indices pour l'IA."""
    lignes = []
    for nom, mots in categories:
        if mots:
            lignes.append(f"- {nom} (indices : {', '.join(mots)})")
        else:
            lignes.append(f"- {nom}")
    return "\n".join(lignes)


def _contenu_document(nom_fichier: str, texte: str,
                      categories: list[tuple[str, list[str]]]) -> str:
    """Message décrivant le document et les catégories possibles (avec indices)."""
    entete = (
        "Catégories possibles (les « indices » sont des mots-clés typiques, pas "
        "des règles strictes) :\n"
        f"{_indices_categories(categories)}\n\n"
        f"Nom du fichier : {nom_fichier}\n\n"
    )
    if texte:
        return entete + f"Extrait du contenu :\n{texte}"
    return entete + (
        "(Impossible d'extraire du texte de ce document — base-toi sur le nom "
        "du fichier, ou choisis 'Non classé'.)"
    )


# Consigne commune aux moteurs IA pour proposer un sous-thème (tri fin).
_CONSIGNE_SOUS_CATEGORIE = (
    " Donne aussi un 'sous_categorie' : un sous-thème court (1 à 3 mots) et "
    "réutilisable décrivant plus finement le document dans sa catégorie (ex. "
    "« Factures EDF », « Impôts », « Recettes desserts »). Reste cohérent d'un "
    "document à l'autre, et laisse-le vide si aucun sous-thème net ne se dégage."
)


def _schema_classement(valeurs: list[str], sous_dossiers: bool,
                       multi: bool) -> tuple[dict, list[str]]:
    """Construit (proprietes, requis) du schéma JSON de classement."""
    if multi:
        proprietes = {
            "categories": {
                "type": "array",
                "items": {"type": "string", "enum": valeurs},
                "minItems": 1,
                "maxItems": 3,
            },
            "justification": {"type": "string"},
        }
        requis = ["categories", "justification"]
    else:
        proprietes = {
            "categorie": {"type": "string", "enum": valeurs},
            "justification": {"type": "string"},
        }
        requis = ["categorie", "justification"]
    if sous_dossiers:
        proprietes["sous_categorie"] = {"type": "string"}
        requis.append("sous_categorie")
    return proprietes, requis


def _consigne_classement(multi: bool) -> str:
    """Phrase indiquant à l'IA de choisir une ou plusieurs catégories."""
    if multi:
        return (
            "Choisis 1 à 3 catégories parmi la liste, celles dont relève "
            "réellement le document. N'en mets plusieurs QUE si le document "
            "couvre vraiment plusieurs thèmes ; sinon une seule. Renvoie-les "
            "dans 'categories'."
        )
    return (
        "Choisis exactement UNE catégorie parmi la liste, celle qui correspond "
        "le mieux au thème réel du document."
    )


def classer_claude(client, nom_fichier: str, texte: str,
                   categories: list[tuple[str, list[str]]],
                   sous_dossiers: bool = False, multi: bool = False) -> dict:
    """Demande à Claude dans quelle(s) catégorie(s) ranger le document."""
    noms = [nom for nom, _ in categories]
    valeurs = noms + ["Non classé"]
    proprietes, requis = _schema_classement(valeurs, sous_dossiers, multi)
    schema = {
        "type": "object",
        "properties": proprietes,
        "required": requis,
        "additionalProperties": False,
    }

    contenu = _contenu_document(nom_fichier, texte, categories)
    consigne_sous = _CONSIGNE_SOUS_CATEGORIE if sous_dossiers else ""

    try:
        reponse = client.messages.create(
            model=MODELE,
            max_tokens=1000,
            system=(
                "Tu es un assistant qui range des documents par centre d'intérêt. "
                + _consigne_classement(multi) +
                " Sers-toi des indices comme d'une aide, mais juge surtout d'après "
                "le contenu. Si le document ne correspond clairement à aucune "
                "catégorie, ou que le contenu est inexploitable, utilise 'Non "
                "classé' plutôt que de forcer un choix. La justification doit tenir "
                "en une courte phrase."
                + consigne_sous
            ),
            messages=[{"role": "user", "content": contenu}],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
    except Exception as erreur:  # noqa: BLE001 - on classe l'erreur (fatale ou non)
        message = str(erreur)
        if _est_fatale(message):
            raise _ErreurFatale(
                "Claude a refusé l'accès. Souvent : plus de crédit Anthropic, "
                "ou clé invalide. Passe au moteur « Google Gemini » (gratuit) "
                "ou « Ollama »/« Local ». [détail : "
                f"{message[:200]}]") from erreur
        raise
    texte_reponse = next(bloc.text for bloc in reponse.content if bloc.type == "text")
    return json.loads(texte_reponse)


# --- Moteur d'analyse IA LOCALE (Ollama, sur le PC) -------------------------

# Ollama (https://ollama.com) fait tourner un modèle de langage directement sur
# ta machine et expose une petite API HTTP locale. Aucune donnée ne quitte le
# PC, aucune clé API. Il faut avoir installé Ollama et téléchargé un modèle
# (ex. `ollama pull llama3.2`).
OLLAMA_HOTE_DEFAUT = "http://localhost:11434"
OLLAMA_MODELE_DEFAUT = "llama3.2"


def lister_modeles_ollama(hote: str = OLLAMA_HOTE_DEFAUT) -> list[str]:
    """Renvoie la liste des modèles installés dans Ollama (vide si injoignable)."""
    import urllib.error
    import urllib.request

    try:
        with urllib.request.urlopen(
                hote.rstrip("/") + "/api/tags", timeout=5) as reponse:
            donnees = json.loads(reponse.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError, OSError):
        return []
    return sorted(m.get("name", "") for m in donnees.get("models", [])
                  if m.get("name"))


def classer_ollama(nom_fichier: str, texte: str,
                   categories: list[tuple[str, list[str]]],
                   modele: str, hote: str, sous_dossiers: bool = False,
                   multi: bool = False) -> dict:
    """Classe un document via un modèle local servi par Ollama (aucun réseau externe)."""
    import urllib.error
    import urllib.request

    noms = [nom for nom, _ in categories]
    valeurs = noms + ["Non classé"]
    proprietes, requis = _schema_classement(valeurs, sous_dossiers, multi)
    schema = {"type": "object", "properties": proprietes, "required": requis}

    contenu = _contenu_document(nom_fichier, texte, categories)

    cle_json = "'categories' (liste)" if multi else "'categorie'"
    systeme = (
        "Tu ranges des documents par centre d'intérêt parmi : "
        f"{', '.join(valeurs)}. " + _consigne_classement(multi) +
        " Juge d'après le thème réel du document ; les indices fournis sont une "
        "aide, pas une règle stricte. Si le document ne correspond clairement à "
        "aucune catégorie, utilise 'Non classé' plutôt que de forcer. Réponds "
        f"uniquement en JSON avec les clés {cle_json} et 'justification'."
        + (_CONSIGNE_SOUS_CATEGORIE if sous_dossiers else "")
    )

    payload = {
        "model": modele,
        "messages": [
            {"role": "system", "content": systeme},
            {"role": "user", "content": contenu},
        ],
        "stream": False,
        "format": schema,
        # temperature 0 = réponse stable ; num_ctx large pour que tout l'extrait
        # soit réellement lu (la fenêtre par défaut d'Ollama tronque les longs
        # documents, ce qui dégrade la précision du classement).
        "options": {"temperature": 0, "num_ctx": 8192},
    }

    requete = urllib.request.Request(
        hote.rstrip("/") + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(requete, timeout=180) as reponse:
            donnees = json.loads(reponse.read().decode("utf-8"))
    except urllib.error.URLError as erreur:
        raise RuntimeError(
            f"Ollama injoignable sur {hote}. Vérifie qu'Ollama est lancé. "
            f"(détail : {erreur})"
        ) from erreur

    if "error" in donnees:
        raise RuntimeError(f"Ollama : {donnees['error']}")

    texte_reponse = donnees.get("message", {}).get("content", "").strip()
    try:
        resultat = json.loads(texte_reponse)
    except json.JSONDecodeError:
        # Repli : le modèle n'a pas renvoyé du JSON valide.
        return {"categorie": "Non classé",
                "justification": "Réponse du modèle local illisible."}

    # Sécurité : on ne garde que des catégories de la liste autorisée.
    resultat.setdefault("justification", "")
    if multi:
        valides = [c for c in resultat.get("categories", []) if c in valeurs]
        resultat["categories"] = valides or ["Non classé"]
    elif resultat.get("categorie") not in valeurs:
        resultat["categorie"] = "Non classé"
    return resultat


# --- Moteur d'analyse GOOGLE GEMINI (API gratuite) --------------------------

# Gemini propose un palier gratuit généreux. Clé API gratuite à créer sur
# https://aistudio.google.com/apikey. On appelle l'API REST directement (aucune
# dépendance Python à installer). Les documents transitent par Google.
GEMINI_MODELE_DEFAUT = "gemini-2.0-flash"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{modele}:generateContent"
)


def _delai_retry_gemini(corps_err: str) -> int | None:
    """Extrait le délai d'attente conseillé (en secondes) d'une erreur 429."""
    try:
        donnees = json.loads(corps_err)
    except json.JSONDecodeError:
        return None
    for detail in donnees.get("error", {}).get("details", []):
        retard = detail.get("retryDelay", "")
        if isinstance(retard, str) and retard.endswith("s"):
            try:
                return max(1, int(float(retard[:-1])))
            except ValueError:
                pass
    return None


def _appel_gemini_json(modele: str, cle: str, systeme: str, user: str,
                       journaliser=None) -> dict:
    """Appelle Gemini et renvoie la réponse JSON décodée (aucune dépendance).

    On reste sur la requête la plus compatible possible : pas de
    `system_instruction` ni de `responseSchema` (rejetés en HTTP 400 par
    certains modèles) — la consigne est mise dans le texte, on demande juste du
    JSON via `responseMimeType`, et on valide la réponse côté code. En cas de
    quota dépassé (HTTP 429), on attend le délai conseillé puis on réessaie.
    """
    import time
    import urllib.error
    import urllib.parse
    import urllib.request

    if not cle:
        raise RuntimeError(
            "Clé API Gemini manquante. Crée-en une gratuitement sur "
            "https://aistudio.google.com/apikey et colle-la dans le champ "
            "« Clé API Gemini ».")

    invite = f"{systeme}\n\n{user}"
    corps = {
        "contents": [{"role": "user", "parts": [{"text": invite}]}],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": "application/json",
        },
    }
    url = (GEMINI_URL.format(modele=modele or GEMINI_MODELE_DEFAUT)
           + "?key=" + urllib.parse.quote(cle))
    requete = urllib.request.Request(
        url, data=json.dumps(corps).encode("utf-8"),
        headers={"Content-Type": "application/json"})

    max_essais = 5
    for essai in range(max_essais):
        try:
            with urllib.request.urlopen(requete, timeout=120) as reponse:
                donnees = json.loads(reponse.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as erreur:
            detail = erreur.read().decode("utf-8", errors="replace")
            # Quota dépassé : on patiente le temps conseillé puis on réessaie.
            if erreur.code == 429 and essai < max_essais - 1:
                delai = _delai_retry_gemini(detail) or (10 * (essai + 1))
                delai = min(delai, 60)
                if journaliser:
                    journaliser(
                        f"    Quota Gemini atteint — pause de {delai}s puis "
                        "nouvelle tentative…")
                time.sleep(delai)
                continue
            extrait = detail[:300]
            # Ces erreurs feront échouer TOUS les documents : on interrompt.
            if erreur.code in (401, 403):
                indice = ("Ta clé API semble invalide ou non autorisée. "
                          "Recrée-en une sur https://aistudio.google.com/apikey "
                          "et recopie-la entièrement (sans espace).")
            elif erreur.code in (400, 404):
                indice = (f"Le modèle « {modele or GEMINI_MODELE_DEFAUT} » n'est "
                          "pas accepté. Essaie un autre nom de modèle, par ex. "
                          "« gemini-1.5-flash » ou « gemini-2.5-flash ».")
            elif erreur.code == 429:
                indice = ("Quota gratuit dépassé. Attends quelques minutes, "
                          "réduis le nombre de documents, ou utilise le moteur "
                          "« Ollama » / « Local » (sans quota).")
            else:
                indice = "Vérifie ta clé API et le nom du modèle."
            message = (f"Gemini a refusé la requête (HTTP {erreur.code}). "
                       f"{indice} [détail : {extrait}]")
            if erreur.code in (400, 401, 403, 404, 429):
                raise _ErreurFatale(message) from erreur
            raise RuntimeError(message) from erreur
        except urllib.error.URLError as erreur:
            raise RuntimeError(
                f"Gemini injoignable (vérifie ta connexion internet). {erreur}"
            ) from erreur

    candidats = donnees.get("candidates")
    if not candidats:
        blocage = donnees.get("promptFeedback", {}).get("blockReason")
        if blocage:
            raise RuntimeError(
                f"Gemini a bloqué la demande (raison : {blocage}).")
        raise RuntimeError(f"Réponse Gemini vide : {str(donnees)[:200]}")
    try:
        texte = candidats[0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as erreur:
        raison = candidats[0].get("finishReason", "inconnue")
        raise RuntimeError(
            f"Gemini n'a pas renvoyé de texte (finishReason : {raison}). "
            "Réessaie, éventuellement avec un autre modèle.") from erreur
    try:
        return json.loads(texte)
    except json.JSONDecodeError as erreur:
        raise RuntimeError(
            f"Réponse Gemini illisible (pas du JSON) : {texte[:200]}") from erreur


def classer_gemini(nom_fichier: str, texte: str,
                   categories: list[tuple[str, list[str]]],
                   modele: str, cle: str, sous_dossiers: bool = False,
                   multi: bool = False, journaliser=None) -> dict:
    """Classe un document via l'API Google Gemini."""
    noms = [nom for nom, _ in categories]
    valeurs = noms + ["Non classé"]

    contenu = _contenu_document(nom_fichier, texte, categories)
    if multi:
        format_json = ('{"categories": ["..."], "justification": "..."'
                       + (', "sous_categorie": "..."' if sous_dossiers else "")
                       + "}")
    else:
        format_json = ('{"categorie": "...", "justification": "..."'
                       + (', "sous_categorie": "..."' if sous_dossiers else "")
                       + "}")
    systeme = (
        "Tu ranges des documents par centre d'intérêt parmi exactement ces "
        f"catégories : {', '.join(valeurs)}. "
        + _consigne_classement(multi) +
        " Sers-toi des indices comme d'une aide, mais juge surtout d'après le "
        "contenu. Si le document ne correspond clairement à aucune catégorie, "
        "ou que le contenu est inexploitable, utilise 'Non classé' plutôt que "
        "de forcer un choix. La justification doit tenir en une courte phrase."
        + (_CONSIGNE_SOUS_CATEGORIE if sous_dossiers else "")
        + f" Réponds UNIQUEMENT par un objet JSON de la forme {format_json}."
    )

    resultat = _appel_gemini_json(modele, cle, systeme, contenu, journaliser)
    resultat.setdefault("justification", "")
    if multi:
        valides = [c for c in resultat.get("categories", []) if c in valeurs]
        resultat["categories"] = valides or ["Non classé"]
    elif resultat.get("categorie") not in valeurs:
        resultat["categorie"] = "Non classé"
    return resultat


# --- Proposition automatique de catégories (IA) -----------------------------

_SCHEMA_PROPOSITION = {
    "type": "object",
    "properties": {
        "categories": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "nom": {"type": "string"},
                    "mots_cles": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["nom", "mots_cles"],
            },
        }
    },
    "required": ["categories"],
}

_CONSIGNE_PROPOSITION = (
    "Tu aides à organiser des documents personnels. À partir des extraits "
    "fournis, propose entre 4 et 8 catégories de classement par centre "
    "d'intérêt, vraiment adaptées à CES documents. Pour chaque catégorie : un "
    "nom court (1 à 3 mots) et 3 à 6 mots-clés représentatifs. Évite les "
    "doublons. Réponds uniquement en JSON : "
    '{"categories":[{"nom":..., "mots_cles":[...]}]}.'
)


def _digest_echantillon(fichiers: list[Path], arret,
                        max_fichiers: int = 20, max_chars: int = 500) -> str:
    """Construit un condensé (nom + court extrait) d'un échantillon de fichiers."""
    morceaux = []
    for fichier in fichiers[:max_fichiers]:
        if arret.is_set():
            break
        try:
            extrait = extraire_texte(fichier)[:max_chars]
        except Exception:  # noqa: BLE001 - un fichier illisible ne doit pas tout bloquer
            extrait = ""
        morceaux.append(f"Fichier : {fichier.name}\nExtrait : {extrait}")
    return "\n\n".join(morceaux)


def _proposition_vers_categories(donnees: dict) -> list[tuple[str, list[str]]]:
    categories = []
    for item in donnees.get("categories", []):
        nom = (item.get("nom") or "").strip()
        mots = [m.strip() for m in item.get("mots_cles", []) if m.strip()]
        if nom:
            categories.append((nom, mots))
    return categories


def proposer_categories(echantillon: str, moteur: str,
                        cfg: dict) -> list[tuple[str, list[str]]]:
    """Demande à l'IA de proposer des catégories d'après un échantillon.

    Utilise le moteur sélectionné s'il est une IA (Claude / Gemini / Ollama).
    Pour le moteur « Local » (qui ne sait pas inventer de catégories), on se
    rabat sur Ollama. `cfg` porte les clés/modèles des moteurs.
    """
    user = "Extraits de documents :\n\n" + echantillon

    if moteur == "claude":
        import anthropic
        if not cfg.get("cle_api"):
            raise RuntimeError("Clé API Anthropic requise pour la proposition.")
        client = anthropic.Anthropic(api_key=cfg["cle_api"])
        reponse = client.messages.create(
            model=MODELE,
            max_tokens=1000,
            system=_CONSIGNE_PROPOSITION,
            messages=[{"role": "user", "content": user}],
            output_config={"format": {"type": "json_schema",
                                      "schema": _SCHEMA_PROPOSITION}},
        )
        texte = next(b.text for b in reponse.content if b.type == "text")
        return _proposition_vers_categories(json.loads(texte))

    if moteur == "gemini":
        donnees = _appel_gemini_json(
            cfg.get("modele_gemini", ""), cfg.get("cle_gemini", ""),
            _CONSIGNE_PROPOSITION, user)
        return _proposition_vers_categories(donnees)

    # Ollama (moteur local ou ollama)
    import urllib.error
    import urllib.request
    hote = cfg.get("hote_ollama", "") or OLLAMA_HOTE_DEFAUT
    payload = {
        "model": cfg.get("modele_ollama", "") or OLLAMA_MODELE_DEFAUT,
        "messages": [
            {"role": "system", "content": _CONSIGNE_PROPOSITION},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "format": _SCHEMA_PROPOSITION,
        "options": {"temperature": 0, "num_ctx": 8192},
    }
    requete = urllib.request.Request(
        hote.rstrip("/") + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(requete, timeout=180) as reponse:
            donnees = json.loads(reponse.read().decode("utf-8"))
    except urllib.error.URLError as erreur:
        raise RuntimeError(
            f"Ollama injoignable sur {hote}. Lance Ollama (ou choisis un autre "
            "moteur IA) pour proposer des catégories. "
            f"(détail : {erreur})") from erreur
    if "error" in donnees:
        raise RuntimeError(f"Ollama : {donnees['error']}")
    contenu = donnees.get("message", {}).get("content", "").strip()
    return _proposition_vers_categories(json.loads(contenu))


# --- Logique de tri (exécutée dans un thread de fond) -----------------------


def tache_proposer(racines: list[Path], moteur: str, cfg: dict,
                   journaliser, arret, fini):
    """Analyse un échantillon de documents et propose des catégories. Thread de fond.

    `fini(texte)` reçoit les catégories proposées (texte prêt à coller) ou None.
    """
    journaliser("Recherche d'un échantillon de documents…")
    fichiers = scanner_documents(racines, journaliser, arret, limite=60)
    if arret.is_set():
        journaliser("⏹ Analyse interrompue.")
        fini(None)
        return
    if not fichiers:
        journaliser("Aucun document trouvé pour l'analyse.")
        fini(None)
        return

    journaliser(f"Analyse de {min(len(fichiers), 20)} document(s) par l'IA…")
    echantillon = _digest_echantillon(fichiers, arret)
    try:
        categories = proposer_categories(echantillon, moteur, cfg)
    except Exception as erreur:  # noqa: BLE001 - on rapporte l'erreur à l'utilisateur
        journaliser(f"ÉCHEC de la proposition : {erreur}")
        fini(None)
        return

    if not categories:
        journaliser("L'IA n'a pas proposé de catégories exploitables.")
        fini(None)
        return

    texte = "\n".join(
        f"{nom}: {', '.join(mots)}" if mots else nom for nom, mots in categories)
    journaliser(f"✅ {len(categories)} catégorie(s) proposée(s) — vérifie et ajuste si besoin.")
    fini(texte)


def chemin_destination_unique(dossier: Path, nom: str) -> Path:
    """Évite d'écraser un fichier portant déjà ce nom dans la destination."""
    cible = dossier / nom
    if not cible.exists():
        return cible
    tige, extension = os.path.splitext(nom)
    compteur = 1
    while True:
        candidat = dossier / f"{tige} ({compteur}){extension}"
        if not candidat.exists():
            return candidat
        compteur += 1


def trier(racines: list[Path], destination: Path,
          categories: list[tuple[str, list[str]]], moteur: str, deplacer: bool,
          simulation: bool, cfg: dict, sous_dossiers: bool, multi: bool,
          journaliser, arret, fini, progres=None):
    """Scanne les racines, classe chaque document et le range. Thread de fond.

    `cfg` porte les clés/modèles des moteurs IA. `progres(courant, total)` est
    appelé pour la barre de progression (optionnel).
    """
    def avancer(courant, total):
        if progres is not None:
            progres(courant, total)

    try:
        classer = _preparer_moteur(
            moteur, cfg, sous_dossiers, multi, journaliser)
    except _ErreurMoteur:
        fini()
        return

    journaliser("Recherche des documents… (cela peut prendre un moment)\n")
    destination.mkdir(parents=True, exist_ok=True)
    fichiers = scanner_documents(
        racines, journaliser, arret, exclure={destination.resolve()})

    if arret.is_set():
        journaliser("\n⏹ Scan interrompu.")
        fini()
        return

    if not fichiers:
        journaliser("Aucun document (.pdf, .docx, .pptx, .txt, .md) trouvé.")
        fini()
        return

    journaliser(f"\n{len(fichiers)} document(s) à trier.")
    if simulation:
        journaliser("MODE SIMULATION : aucun fichier ne sera déplacé ni copié.")
    journaliser("")

    deja_dans_destination = destination.resolve()
    total = len(fichiers)
    compteur: dict[str, int] = {}
    echecs = 0
    ignores = 0
    lignes_rapport: list[tuple[str, str, str, str]] = []
    # Sous-thèmes déjà vus par catégorie, pour les regrouper de façon cohérente.
    sous_vus: dict[str, list[tuple[set[str], str]]] = {}

    for i, fichier in enumerate(fichiers, start=1):
        if arret.is_set():
            journaliser("\n⏹ Tri interrompu.")
            break
        avancer(i, total)
        journaliser(f"[{i}/{total}] {fichier.name} — analyse…")
        try:
            # Ne pas re-trier ce qui est déjà rangé dans le dossier de destination.
            if deja_dans_destination in fichier.resolve().parents:
                journaliser("    (déjà dans le dossier de destination — ignoré)\n")
                ignores += 1
                continue

            texte = extraire_texte(fichier)
            resultat = classer(fichier.name, texte, categories)
            justification = resultat.get("justification", "")

            # Une ou plusieurs catégories selon le moteur / le mode.
            cats_doc = resultat.get("categories") or [
                resultat.get("categorie", "Non classé")]
            # Dédoublonne en gardant l'ordre (la 1re est la catégorie principale).
            vues = set()
            cats_doc = [c for c in cats_doc
                        if c and not (c in vues or vues.add(c))] or ["Non classé"]

            # Sous-thème (tri fin) : appliqué à la catégorie principale.
            sous = (resultat.get("sous_categorie") or "").strip()

            journaliser(f"    → {' + '.join(cats_doc)}  ({justification})")

            for rang, categorie in enumerate(cats_doc):
                dossier_cible = destination / _nom_dossier_sur(categorie)
                if rang == 0 and sous_dossiers and sous:
                    canon = _canoniser_sous_theme(
                        sous, sous_vus.setdefault(categorie, []))
                    dossier_cible = dossier_cible / _nom_dossier_sur(canon)
                cible = chemin_destination_unique(dossier_cible, fichier.name)

                if simulation:
                    journaliser(f"    [simulation] irait dans : {dossier_cible}")
                else:
                    dossier_cible.mkdir(parents=True, exist_ok=True)
                    # On copie dans chaque catégorie (un fichier peut être dans
                    # plusieurs). Le déplacement éventuel se fait après coup.
                    shutil.copy2(str(fichier), str(cible))
                    journaliser(f"    Copié dans : {dossier_cible}")

                compteur[categorie] = compteur.get(categorie, 0) + 1
                lignes_rapport.append(
                    (str(fichier), categorie, justification, str(cible)))

            # En mode « déplacer », l'original est retiré une fois copié partout.
            if deplacer and not simulation:
                try:
                    os.remove(str(fichier))
                except OSError as err:
                    journaliser(f"    (original non supprimé : {err})")
            journaliser("")
        except _ErreurFatale as erreur:
            # Erreur qui ferait échouer tous les documents : on arrête net.
            journaliser(f"\n⛔ {erreur}")
            journaliser("Tri interrompu — change de moteur puis relance.\n")
            break
        except Exception as erreur:  # noqa: BLE001 - on continue malgré une erreur isolée
            journaliser(f"    ÉCHEC : {erreur}\n")
            echecs += 1
            lignes_rapport.append((str(fichier), "ÉCHEC", str(erreur), ""))

    _ecrire_recapitulatif(journaliser, compteur, echecs, ignores, simulation)
    chemin_rapport = _ecrire_rapport_csv(destination, lignes_rapport, simulation)
    if chemin_rapport:
        journaliser(f"📄 Rapport détaillé : {chemin_rapport}")
    fini()


def _ecrire_recapitulatif(journaliser, compteur: dict[str, int], echecs: int,
                          ignores: int, simulation: bool):
    journaliser("\n— Récapitulatif —")
    if compteur:
        for categorie in sorted(compteur, key=lambda c: (-compteur[c], c)):
            journaliser(f"  {categorie} : {compteur[categorie]}")
    else:
        journaliser("  Aucun document classé.")
    if ignores:
        journaliser(f"  Ignorés (déjà rangés) : {ignores}")
    if echecs:
        journaliser(f"  Échecs : {echecs}")
    journaliser("\n✅ Simulation terminée (rien n'a été modifié)." if simulation
                else "\n✅ Tri terminé.")


def _ecrire_rapport_csv(destination: Path,
                        lignes: list[tuple[str, str, str, str]],
                        simulation: bool) -> Path | None:
    """Écrit un rapport CSV de ce qui a été (ou serait) rangé. Aide à vérifier/annuler."""
    if not lignes:
        return None
    import csv
    from datetime import datetime

    suffixe = "simulation" if simulation else "tri"
    horodatage = datetime.now().strftime("%Y%m%d-%H%M%S")
    chemin = destination / f"rapport-{suffixe}-{horodatage}.csv"
    try:
        with open(chemin, "w", encoding="utf-8-sig", newline="") as f:
            ecrivain = csv.writer(f)
            ecrivain.writerow(
                ["Fichier source", "Catégorie", "Justification", "Destination"])
            ecrivain.writerows(lignes)
        return chemin
    except OSError:
        return None


def _nom_dossier_sur(nom: str) -> str:
    """Nettoie un nom de catégorie pour en faire un nom de dossier valide."""
    nom = re.sub(r'[<>:"/\\|?*]', "_", nom).strip().strip(".")
    return nom or "Non classé"


# Mots vides ignorés pour comparer deux sous-thèmes.
_MOTS_VIDES = {
    "de", "des", "du", "la", "le", "les", "et", "ou", "un", "une", "aux",
    "au", "en", "pour", "par", "sur", "a", "l", "d",
}


def _stems_significatifs(texte: str) -> set[str]:
    """Ensemble des racines des mots « porteurs de sens » d'un libellé."""
    return {
        _raciniser(mot)
        for mot in _normaliser(texte).split()
        if len(mot) > 2 and mot not in _MOTS_VIDES
    }


def _canoniser_sous_theme(nom: str, deja_vus: list[tuple[set[str], str]]) -> str:
    """Regroupe les sous-thèmes équivalents sous un seul libellé.

    Compare le sous-thème proposé à ceux déjà rencontrés (dans la même
    catégorie) via leurs racines : si l'un est inclus dans l'autre, ou si le
    recouvrement (Jaccard) est suffisant, on réutilise le libellé déjà vu pour
    éviter d'éparpiller « Factures EDF », « EDF » et « facture edf » dans trois
    dossiers différents. `deja_vus` est complété au fil de l'eau.
    """
    stems = _stems_significatifs(nom)
    if not stems:
        return nom
    for autres_stems, canon in deja_vus:
        if not autres_stems:
            continue
        if stems <= autres_stems or autres_stems <= stems:
            return canon
        jaccard = len(stems & autres_stems) / len(stems | autres_stems)
        if jaccard >= 0.6:
            return canon
    deja_vus.append((stems, nom))
    return nom


class _ErreurMoteur(Exception):
    pass


def _preparer_moteur(moteur: str, cfg: dict, sous_dossiers: bool, multi: bool,
                     journaliser):
    """Renvoie une fonction classer(nom, texte, categories) -> dict."""
    if moteur == "local":
        return lambda nom, texte, cats: classer_local(nom, texte, cats, multi)

    if moteur == "ollama":
        modele = cfg.get("modele_ollama", "") or OLLAMA_MODELE_DEFAUT
        hote = cfg.get("hote_ollama", "") or OLLAMA_HOTE_DEFAUT
        journaliser(
            f"Moteur IA locale (Ollama) — modèle « {modele} » sur {hote}.\n"
            "Si rien ne se passe : installe Ollama (https://ollama.com), puis "
            f"dans un terminal lance « ollama pull {modele} ».\n"
        )
        return lambda nom, texte, cats: classer_ollama(
            nom, texte, cats, modele, hote, sous_dossiers, multi)

    if moteur == "gemini":
        cle = cfg.get("cle_gemini", "")
        modele = cfg.get("modele_gemini", "") or GEMINI_MODELE_DEFAUT
        if not cle:
            journaliser(
                "ERREUR : clé API Gemini manquante. Crée-en une gratuitement "
                "sur https://aistudio.google.com/apikey et colle-la dans le "
                "champ « Clé API Gemini »."
            )
            raise _ErreurMoteur
        journaliser(f"Moteur Google Gemini — modèle « {modele} ».\n")
        return lambda nom, texte, cats: classer_gemini(
            nom, texte, cats, modele, cle, sous_dossiers, multi, journaliser)

    # moteur == "claude"
    try:
        import anthropic
    except ImportError:
        journaliser(
            "ERREUR : le paquet 'anthropic' n'est pas installé pour ce Python.\n"
            f"    Python utilisé : {sys.executable}\n"
            "    Installe les dépendances avec CE Python précis :\n"
            f'    "{sys.executable}" -m pip install anthropic pypdf python-docx python-pptx'
        )
        raise _ErreurMoteur
    cle_api = cfg.get("cle_api", "")
    if not cle_api:
        journaliser(
            "ERREUR : aucune clé API. Colle ta clé Anthropic dans le champ "
            "'Clé API' (récupère-la sur https://console.anthropic.com), ou "
            "choisis un autre moteur."
        )
        raise _ErreurMoteur
    client = anthropic.Anthropic(api_key=cle_api)
    return lambda nom, texte, cats: classer_claude(
        client, nom, texte, cats, sous_dossiers, multi)


# --- Mémorisation de la clé API ---------------------------------------------

# La clé est conservée dans un fichier à côté du script, pour ne la saisir
# qu'une seule fois (évite de devoir gérer une variable d'environnement).
CHEMIN_CLE = Path(__file__).resolve().parent / "cle_api.txt"


def charger_cle() -> str:
    """Clé API mémorisée : variable d'environnement, sinon fichier cle_api.txt."""
    depuis_env = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if depuis_env:
        return depuis_env
    try:
        return CHEMIN_CLE.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def enregistrer_cle(cle: str) -> None:
    """Mémorise la clé dans cle_api.txt pour les prochains lancements."""
    try:
        CHEMIN_CLE.write_text(cle.strip(), encoding="utf-8")
    except OSError:
        pass  # pas grave : la clé reste utilisable pour cette session


# Clé API Gemini (gratuite), mémorisée dans son propre fichier.
CHEMIN_CLE_GEMINI = Path(__file__).resolve().parent / "cle_gemini.txt"


def charger_cle_gemini() -> str:
    """Clé Gemini : variable d'environnement, sinon fichier cle_gemini.txt."""
    for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        depuis_env = os.environ.get(var, "").strip()
        if depuis_env:
            return depuis_env
    try:
        return CHEMIN_CLE_GEMINI.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def enregistrer_cle_gemini(cle: str) -> None:
    """Mémorise la clé Gemini pour les prochains lancements."""
    try:
        CHEMIN_CLE_GEMINI.write_text(cle.strip(), encoding="utf-8")
    except OSError:
        pass


# --- Mémorisation des réglages ----------------------------------------------

# On retient les derniers réglages (destination, catégories, moteur…) pour ne
# pas avoir à tout ressaisir à chaque lancement. La clé API reste à part.
CHEMIN_CONFIG = Path(__file__).resolve().parent / "config.json"


def charger_config() -> dict:
    try:
        return json.loads(CHEMIN_CONFIG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def enregistrer_config(config: dict) -> None:
    try:
        CHEMIN_CONFIG.write_text(
            json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


def ouvrir_dossier(chemin: Path) -> None:
    """Ouvre un dossier dans l'explorateur de fichiers du système."""
    try:
        if os.name == "nt":
            os.startfile(str(chemin))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            import subprocess
            subprocess.Popen(["open", str(chemin)])
        else:
            import subprocess
            subprocess.Popen(["xdg-open", str(chemin)])
    except Exception:  # noqa: BLE001 - simple confort, on ignore les erreurs
        pass


# --- Aide Copilot pour les documents « Non classé » -------------------------

# On ne peut pas piloter Copilot Windows automatiquement (pas d'API publique).
# En revanche, pour les documents que le tri n'a pas su classer, on prépare une
# demande toute prête et on ouvre Copilot : l'utilisateur colle la demande et
# Copilot l'aide à décider. Honnête, gratuit, et ça utilise vraiment Copilot.
NOM_NON_CLASSE = "Non classé"
URL_COPILOT = "https://copilot.microsoft.com"


def construire_prompt_copilot(nom_fichier: str, extrait: str,
                              noms_categories: list[str]) -> str:
    """Rédige une demande prête à coller dans Copilot pour un document."""
    cats = ", ".join(noms_categories) if noms_categories else "(à toi de proposer)"
    return (
        "Dans laquelle de ces catégories devrais-je ranger ce document ? "
        f"Catégories possibles : {cats}. Réponds par UNE seule catégorie et "
        "explique en une phrase.\n\n"
        f"Nom du fichier : {nom_fichier}\n"
        f"Extrait du contenu :\n{extrait[:1500]}"
    )


def preparer_aide_copilot(destination: Path, noms_categories: list[str]):
    """Prépare les demandes Copilot pour les documents du dossier « Non classé ».

    Écrit un fichier `aide-copilot.txt` (une demande par document) et renvoie
    (chemin_du_fichier, nombre, première_demande), ou None s'il n'y a rien.
    """
    dossier = destination / NOM_NON_CLASSE
    if not dossier.is_dir():
        return None
    fichiers = [p for p in sorted(dossier.iterdir())
                if p.is_file() and p.suffix.lower() in EXTENSIONS_SUPPORTEES]
    if not fichiers:
        return None

    blocs = []
    premier = ""
    for fichier in fichiers:
        try:
            extrait = extraire_texte(fichier)
        except Exception:  # noqa: BLE001 - un fichier illisible ne bloque pas
            extrait = ""
        prompt = construire_prompt_copilot(fichier.name, extrait, noms_categories)
        if not premier:
            premier = prompt
        blocs.append("=" * 60 + "\n" + prompt)

    chemin = destination / "aide-copilot.txt"
    chemin.write_text("\n\n".join(blocs), encoding="utf-8")
    return chemin, len(fichiers), premier


# --- Interface graphique -----------------------------------------------------


class Application(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Tri intelligent de documents")
        self.geometry("760x760")
        self.minsize(680, 640)

        self.file_journal: queue.Queue[str] = queue.Queue()
        self.file_progres: queue.Queue[tuple[int, int]] = queue.Queue()
        self.arret = threading.Event()
        self.config = charger_config()
        self.dossiers_choisis: list[str] = list(
            self.config.get("dossiers_choisis", []))
        self.derniere_destination: Path | None = None
        self._construire_interface()
        self.after(100, self._vider_journal)

    def _construire_interface(self):
        cadre = ttk.Frame(self, padding=12)
        cadre.pack(fill="both", expand=True)

        # --- Quoi scanner ---
        ttk.Label(cadre, text="Que veux-tu scanner ?",
                  font=("TkDefaultFont", 10, "bold")).pack(anchor="w")
        self.var_etendue = tk.StringVar(value=self.config.get("etendue", "pc"))
        ttk.Radiobutton(cadre, text="Tout le PC (tous les disques)",
                        variable=self.var_etendue, value="pc",
                        command=self._maj_etendue).pack(anchor="w")
        self.radio_dossiers = ttk.Radiobutton(
            cadre, text="Des dossiers que je choisis",
            variable=self.var_etendue, value="dossiers",
            command=self._maj_etendue)
        self.radio_dossiers.pack(anchor="w")

        self.cadre_dossiers = ttk.Frame(cadre)
        ligne_d = ttk.Frame(self.cadre_dossiers)
        ligne_d.pack(fill="x")
        ttk.Button(ligne_d, text="Ajouter un dossier…",
                   command=self._ajouter_dossier).pack(side="left")
        ttk.Button(ligne_d, text="Vider la liste",
                   command=self._vider_dossiers).pack(side="left", padx=(6, 0))
        self.liste_dossiers = tk.Listbox(self.cadre_dossiers, height=3)
        self.liste_dossiers.pack(fill="x", pady=(4, 0))
        for d in self.dossiers_choisis:
            self.liste_dossiers.insert("end", d)

        # --- Destination ---
        ttk.Label(cadre, text="Dossier de destination (où créer les catégories) :",
                  font=("TkDefaultFont", 10, "bold")).pack(anchor="w", pady=(10, 0))
        ligne = ttk.Frame(cadre)
        ligne.pack(fill="x", pady=(2, 10))
        self.var_destination = tk.StringVar(
            value=self.config.get(
                "destination", str(Path.home() / "Documents tries")))
        ttk.Entry(ligne, textvariable=self.var_destination).pack(
            side="left", fill="x", expand=True)
        ttk.Button(ligne, text="Parcourir…",
                   command=self._choisir_destination).pack(side="left", padx=(6, 0))

        # --- Moteur d'analyse ---
        ttk.Label(cadre, text="Moteur d'analyse :",
                  font=("TkDefaultFont", 10, "bold")).pack(anchor="w")
        self.var_moteur = tk.StringVar(value=self.config.get("moteur", "local"))
        ttk.Radiobutton(
            cadre,
            text="Local — sur ton PC, sans internet, gratuit (mots-clés)",
            variable=self.var_moteur, value="local",
            command=self._maj_moteur).pack(anchor="w")
        self.radio_gemini = ttk.Radiobutton(
            cadre,
            text="Google Gemini — IA puissante et GRATUITE (clé API gratuite requise)",
            variable=self.var_moteur, value="gemini",
            command=self._maj_moteur)
        self.radio_gemini.pack(anchor="w")
        self.radio_ollama = ttk.Radiobutton(
            cadre,
            text="IA locale (Ollama) — analyse fine du contenu, sur ton PC, sans clé API",
            variable=self.var_moteur, value="ollama",
            command=self._maj_moteur)
        self.radio_ollama.pack(anchor="w")
        self.radio_claude = ttk.Radiobutton(
            cadre,
            text="API Claude — analyse fine du contenu (clé API requise)",
            variable=self.var_moteur, value="claude",
            command=self._maj_moteur)
        self.radio_claude.pack(anchor="w")

        self.cadre_gemini = ttk.Frame(cadre)
        ttk.Label(self.cadre_gemini,
                  text="Modèle Gemini :").pack(anchor="w")
        self.var_modele_gemini = tk.StringVar(
            value=self.config.get("modele_gemini", GEMINI_MODELE_DEFAUT))
        ttk.Entry(self.cadre_gemini, textvariable=self.var_modele_gemini).pack(
            fill="x", pady=(2, 4))
        ttk.Label(self.cadre_gemini,
                  text="Clé API Gemini (gratuite, mémorisée après le 1er tri) :").pack(anchor="w")
        self.var_cle_gemini = tk.StringVar(value=charger_cle_gemini())
        ttk.Entry(self.cadre_gemini, textvariable=self.var_cle_gemini,
                  show="•").pack(fill="x", pady=(2, 0))
        ttk.Label(
            self.cadre_gemini,
            text="Crée ta clé gratuite sur https://aistudio.google.com/apikey",
            foreground="#666",
        ).pack(anchor="w")

        self.cadre_ollama = ttk.Frame(cadre)
        ttk.Label(self.cadre_ollama,
                  text="Modèle Ollama (ex. llama3.2, qwen2.5:3b, mistral) :").pack(anchor="w")
        ligne_m = ttk.Frame(self.cadre_ollama)
        ligne_m.pack(fill="x", pady=(2, 0))
        self.var_modele = tk.StringVar(
            value=self.config.get("modele", OLLAMA_MODELE_DEFAUT))
        self.combo_modele = ttk.Combobox(ligne_m, textvariable=self.var_modele)
        self.combo_modele.pack(side="left", fill="x", expand=True)
        ttk.Button(ligne_m, text="Détecter les modèles",
                   command=self._detecter_modeles).pack(side="left", padx=(6, 0))
        ttk.Label(
            self.cadre_ollama,
            text="Installe Ollama depuis https://ollama.com, puis : ollama pull " + OLLAMA_MODELE_DEFAUT,
            foreground="#666",
        ).pack(anchor="w")

        self.cadre_cle = ttk.Frame(cadre)
        ttk.Label(self.cadre_cle,
                  text="Clé API Anthropic (mémorisée après le 1er tri) :").pack(anchor="w")
        self.var_cle = tk.StringVar(value=charger_cle())
        ttk.Entry(self.cadre_cle, textvariable=self.var_cle, show="•").pack(
            fill="x", pady=(2, 0))

        # --- Catégories ---
        ligne_cat = ttk.Frame(cadre)
        ligne_cat.pack(fill="x", pady=(10, 0))
        ttk.Label(
            ligne_cat,
            text=("Tes catégories (une par ligne). En mode Local, ajoute des "
                  "mots-clés après « : »."),
            font=("TkDefaultFont", 10, "bold"),
        ).pack(side="left")
        self.bouton_proposer = ttk.Button(
            ligne_cat, text="Proposer des catégories (IA)",
            command=self._proposer_categories)
        self.bouton_proposer.pack(side="right")
        ttk.Label(
            cadre,
            text="Ex.  Cuisine: recette, ingrédient, cuisson    |    Finances: facture, impôt, banque",
            foreground="#666",
        ).pack(anchor="w")
        self.txt_categories = tk.Text(cadre, height=6)
        self.txt_categories.pack(fill="x", pady=(2, 10))
        self.txt_categories.insert(
            "1.0",
            self.config.get(
                "categories",
                "Travail: contrat, réunion, projet, client\n"
                "Études: cours, examen, devoir, université\n"
                "Finances: facture, impôt, banque, salaire\n"
                "Personnel: famille, photo, vacances",
            ),
        )

        # --- Options ---
        self.var_simulation = tk.BooleanVar(
            value=self.config.get("simulation", True))
        ttk.Checkbutton(
            cadre,
            text="Simulation (montre ce qui serait fait, sans rien déplacer) — recommandé pour un 1er essai",
            variable=self.var_simulation,
        ).pack(anchor="w")
        self.var_deplacer = tk.BooleanVar(
            value=self.config.get("deplacer", False))
        ttk.Checkbutton(
            cadre,
            text="Déplacer les fichiers (décoché = les copier, originaux conservés)",
            variable=self.var_deplacer,
        ).pack(anchor="w")
        self.var_sous_dossiers = tk.BooleanVar(
            value=self.config.get("sous_dossiers", False))
        ttk.Checkbutton(
            cadre,
            text="Tri fin : créer des sous-dossiers par sous-thème (moteurs IA Ollama / Claude)",
            variable=self.var_sous_dossiers,
        ).pack(anchor="w")
        self.var_multi = tk.BooleanVar(
            value=self.config.get("multi", False))
        ttk.Checkbutton(
            cadre,
            text="Multi-catégories : copier un document dans chaque catégorie pertinente",
            variable=self.var_multi,
        ).pack(anchor="w", pady=(0, 8))

        # --- Boutons ---
        ligne_boutons = ttk.Frame(cadre)
        ligne_boutons.pack(anchor="w", pady=(0, 10))
        self.bouton_lancer = ttk.Button(
            ligne_boutons, text="Lancer le tri", command=self._lancer)
        self.bouton_lancer.pack(side="left")
        self.bouton_arret = ttk.Button(
            ligne_boutons, text="Arrêter", command=self._demander_arret,
            state="disabled")
        self.bouton_arret.pack(side="left", padx=(6, 0))
        self.bouton_ouvrir = ttk.Button(
            ligne_boutons, text="Ouvrir le dossier",
            command=self._ouvrir_destination, state="disabled")
        self.bouton_ouvrir.pack(side="left", padx=(6, 0))
        self.bouton_copilot = ttk.Button(
            ligne_boutons, text="Aide Copilot (Non classé)",
            command=self._aide_copilot, state="disabled")
        self.bouton_copilot.pack(side="left", padx=(6, 0))

        # --- Progression ---
        self.progression = ttk.Progressbar(cadre, mode="determinate")
        self.progression.pack(fill="x", pady=(0, 6))
        self.var_statut = tk.StringVar(value="")
        ttk.Label(cadre, textvariable=self.var_statut, foreground="#666").pack(
            anchor="w")

        # --- Journal ---
        ttk.Label(cadre, text="Journal :").pack(anchor="w")
        self.journal = scrolledtext.ScrolledText(cadre, height=12, state="disabled")
        self.journal.pack(fill="both", expand=True, pady=(2, 0))

        self._maj_etendue()
        self._maj_moteur()

    # --- Réactions de l'interface ---

    def _maj_etendue(self):
        if self.var_etendue.get() == "dossiers":
            self.cadre_dossiers.pack(fill="x", pady=(4, 0),
                                     after=self.radio_dossiers)
        else:
            self.cadre_dossiers.pack_forget()

    def _maj_moteur(self):
        moteur = self.var_moteur.get()
        if moteur == "ollama":
            self.cadre_ollama.pack(fill="x", pady=(2, 6), after=self.radio_ollama)
        else:
            self.cadre_ollama.pack_forget()
        if moteur == "gemini":
            self.cadre_gemini.pack(fill="x", pady=(2, 6), after=self.radio_gemini)
        else:
            self.cadre_gemini.pack_forget()
        if moteur == "claude":
            self.cadre_cle.pack(fill="x", pady=(2, 6), after=self.radio_claude)
        else:
            self.cadre_cle.pack_forget()

    def _ajouter_dossier(self):
        dossier = filedialog.askdirectory(title="Choisis un dossier à scanner")
        if dossier and dossier not in self.dossiers_choisis:
            self.dossiers_choisis.append(dossier)
            self.liste_dossiers.insert("end", dossier)

    def _vider_dossiers(self):
        self.dossiers_choisis.clear()
        self.liste_dossiers.delete(0, "end")

    def _choisir_destination(self):
        dossier = filedialog.askdirectory(title="Choisis le dossier de destination")
        if dossier:
            self.var_destination.set(dossier)

    def _detecter_modeles(self):
        modeles = lister_modeles_ollama()
        if not modeles:
            messagebox.showwarning(
                "Aucun modèle détecté",
                "Ollama ne répond pas ou aucun modèle n'est installé.\n\n"
                "Vérifie qu'Ollama est lancé (https://ollama.com) et qu'un "
                "modèle est téléchargé, par ex. : ollama pull " + OLLAMA_MODELE_DEFAUT)
            return
        self.combo_modele.configure(values=modeles)
        if self.var_modele.get() not in modeles:
            self.var_modele.set(modeles[0])

    def _ecrire(self, message: str):
        self.journal.configure(state="normal")
        self.journal.insert("end", message + "\n")
        self.journal.see("end")
        self.journal.configure(state="disabled")

    def _vider_journal(self):
        while not self.file_journal.empty():
            self._ecrire(self.file_journal.get_nowait())
        while not self.file_progres.empty():
            courant, total = self.file_progres.get_nowait()
            self.progression.configure(maximum=max(total, 1), value=courant)
            self.var_statut.set(f"{courant} / {total} documents traités")
        self.after(100, self._vider_journal)

    def _ouvrir_destination(self):
        if self.derniere_destination is not None:
            ouvrir_dossier(self.derniere_destination)

    def _aide_copilot(self):
        """Prépare une demande Copilot pour les documents « Non classé »."""
        if self.derniere_destination is None:
            return
        noms = [nom for nom, _ in parser_categories(
            self.txt_categories.get("1.0", "end").splitlines())]
        resultat = preparer_aide_copilot(self.derniere_destination, noms)
        if resultat is None:
            messagebox.showinfo(
                "Rien à faire",
                "Aucun document dans le dossier « Non classé ». "
                "(Lance d'abord un tri réel, hors simulation.)")
            return
        chemin, nombre, premier = resultat
        # Copie la 1re demande dans le presse-papiers et ouvre Copilot.
        self.clipboard_clear()
        self.clipboard_append(premier)
        self.update()
        import webbrowser
        webbrowser.open(URL_COPILOT)
        self.file_journal.put(
            f"🧠 Aide Copilot : {nombre} document(s) « Non classé ».\n"
            f"   La 1re demande est copiée — colle-la dans Copilot (Ctrl+V).\n"
            f"   Toutes les demandes sont dans : {chemin}\n")
        messagebox.showinfo(
            "Aide Copilot prête",
            f"{nombre} document(s) non classé(s).\n\n"
            "La 1re demande est copiée dans le presse-papiers : colle-la dans "
            "Copilot (Ctrl+V).\n\n"
            f"Toutes les demandes ont été enregistrées dans :\n{chemin}")

    def _demander_arret(self):
        self.arret.set()
        self.file_journal.put("Arrêt demandé…")

    def _racines_courantes(self, confirmer_pc: bool):
        """Renvoie les racines à scanner selon l'étendue choisie, ou None."""
        if self.var_etendue.get() == "pc":
            racines = lister_disques()
            if not racines:
                messagebox.showerror("Aucun disque", "Aucun disque détecté.")
                return None
            if confirmer_pc and not messagebox.askyesno(
                "Scanner tout le PC ?",
                "Tu vas scanner TOUT le PC. Cela peut prendre du temps.\n\n"
                "Les dossiers système sont ignorés et, par défaut, les fichiers "
                "sont copiés (pas déplacés) en mode simulation.\n\nContinuer ?"):
                return None
            return racines
        if not self.dossiers_choisis:
            messagebox.showwarning(
                "Aucun dossier", "Ajoute au moins un dossier à scanner.")
            return None
        return [Path(d) for d in self.dossiers_choisis]

    def _config_moteurs(self) -> dict:
        """Rassemble clés/modèles des moteurs IA en un seul dictionnaire."""
        return {
            "cle_api": self.var_cle.get().strip(),
            "modele_ollama": self.var_modele.get().strip(),
            "hote_ollama": OLLAMA_HOTE_DEFAUT,
            "cle_gemini": self.var_cle_gemini.get().strip(),
            "modele_gemini": self.var_modele_gemini.get().strip(),
        }

    def _proposer_categories(self):
        racines = self._racines_courantes(confirmer_pc=False)
        if racines is None:
            return
        moteur = self.var_moteur.get()
        cfg = self._config_moteurs()
        if moteur == "claude" and not cfg["cle_api"]:
            messagebox.showwarning(
                "Clé API manquante",
                "Pour proposer des catégories avec Claude, indique ta clé API, "
                "ou choisis un autre moteur.")
            return
        if moteur == "gemini" and not cfg["cle_gemini"]:
            messagebox.showwarning(
                "Clé API manquante",
                "Pour proposer des catégories avec Gemini, indique ta clé API "
                "gratuite (https://aistudio.google.com/apikey).")
            return
        if moteur == "gemini":
            enregistrer_cle_gemini(cfg["cle_gemini"])

        self.arret.clear()
        self.bouton_lancer.configure(state="disabled")
        self.bouton_proposer.configure(state="disabled")
        self.bouton_arret.configure(state="normal")
        self.journal.configure(state="normal")
        self.journal.delete("1.0", "end")
        self.journal.configure(state="disabled")

        threading.Thread(
            target=tache_proposer,
            args=(
                racines, moteur, cfg, self.file_journal.put, self.arret,
                lambda texte: self.after(0, self._appliquer_categories, texte),
            ),
            daemon=True,
        ).start()

    def _appliquer_categories(self, texte):
        self.bouton_lancer.configure(state="normal")
        self.bouton_proposer.configure(state="normal")
        self.bouton_arret.configure(state="disabled")
        if texte:
            self.txt_categories.delete("1.0", "end")
            self.txt_categories.insert("1.0", texte)

    def _lancer(self):
        racines = self._racines_courantes(confirmer_pc=True)
        if racines is None:
            return

        destination_txt = self.var_destination.get().strip()
        if not destination_txt:
            messagebox.showwarning(
                "Destination manquante", "Indique un dossier de destination.")
            return
        destination = Path(destination_txt)

        categories = parser_categories(
            self.txt_categories.get("1.0", "end").splitlines())
        if not categories:
            messagebox.showwarning(
                "Catégories manquantes", "Indique au moins une catégorie.")
            return

        moteur = self.var_moteur.get()
        cfg = self._config_moteurs()
        if moteur == "claude":
            if not cfg["cle_api"]:
                messagebox.showwarning(
                    "Clé API manquante",
                    "Colle ta clé API Anthropic, ou choisis un autre moteur.")
                return
            enregistrer_cle(cfg["cle_api"])
        if moteur == "gemini":
            if not cfg["cle_gemini"]:
                messagebox.showwarning(
                    "Clé API manquante",
                    "Colle ta clé API Gemini gratuite "
                    "(https://aistudio.google.com/apikey), ou choisis un autre "
                    "moteur.")
                return
            enregistrer_cle_gemini(cfg["cle_gemini"])

        # Mémorise les réglages pour le prochain lancement.
        enregistrer_config({
            "etendue": self.var_etendue.get(),
            "dossiers_choisis": self.dossiers_choisis,
            "destination": destination_txt,
            "moteur": moteur,
            "modele": self.var_modele.get().strip(),
            "modele_gemini": self.var_modele_gemini.get().strip(),
            "categories": self.txt_categories.get("1.0", "end").strip(),
            "simulation": self.var_simulation.get(),
            "deplacer": self.var_deplacer.get(),
            "sous_dossiers": self.var_sous_dossiers.get(),
            "multi": self.var_multi.get(),
        })

        self.derniere_destination = destination
        self.arret.clear()
        self.bouton_lancer.configure(state="disabled")
        self.bouton_arret.configure(state="normal")
        self.bouton_ouvrir.configure(state="disabled")
        self.progression.configure(value=0)
        self.var_statut.set("")
        self.journal.configure(state="normal")
        self.journal.delete("1.0", "end")
        self.journal.configure(state="disabled")

        threading.Thread(
            target=trier,
            args=(
                racines,
                destination,
                categories,
                moteur,
                self.var_deplacer.get(),
                self.var_simulation.get(),
                cfg,
                self.var_sous_dossiers.get(),
                self.var_multi.get(),
                self.file_journal.put,
                self.arret,
                lambda: self.after(0, self._reactiver),
                lambda c, t: self.file_progres.put((c, t)),
            ),
            daemon=True,
        ).start()

    def _reactiver(self):
        self.bouton_lancer.configure(state="normal")
        self.bouton_proposer.configure(state="normal")
        self.bouton_arret.configure(state="disabled")
        if self.derniere_destination is not None:
            self.bouton_ouvrir.configure(state="normal")
            self.bouton_copilot.configure(state="normal")


if __name__ == "__main__":
    Application().mainloop()
