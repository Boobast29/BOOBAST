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

# Nombre de caractères de contenu analysés par document. Un extrait suffit
# largement pour déterminer le thème, et ça maîtrise le coût/la vitesse.
EXTRAIT_MAX_CARACTERES = 6000

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
    morceaux = []
    for page in lecteur.pages:
        texte = page.extract_text() or ""
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
                      exclure: set[Path] | None = None) -> list[Path]:
    """Parcourt récursivement les racines et renvoie les documents trouvés.

    Ignore les dossiers système/caches (et tout dossier de `exclure`, p. ex. le
    dossier de destination) et s'arrête proprement si `arret` (un
    threading.Event) est déclenché.
    """
    exclure = exclure or set()
    trouves: list[Path] = []
    for racine in racines:
        if arret.is_set():
            break
        journaliser(f"Scan de {racine}…")
        for dossier_courant, sous_dossiers, fichiers in os.walk(racine):
            if arret.is_set():
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
    """Minuscule + sans accents, pour comparer les mots-clés de façon tolérante."""
    texte = texte.lower()
    texte = unicodedata.normalize("NFD", texte)
    return "".join(c for c in texte if unicodedata.category(c) != "Mn")


def classer_local(nom_fichier: str, texte: str,
                  categories: list[tuple[str, list[str]]]) -> dict:
    """Classe un document par comptage de mots-clés (aucun appel réseau).

    Chaque catégorie est notée selon le nombre d'occurrences de ses mots-clés
    (et de son propre nom) dans le nom du fichier et l'extrait de contenu. La
    catégorie au meilleur score gagne ; en cas d'égalité à zéro, « Non classé ».
    """
    base = _normaliser(f"{nom_fichier}\n{texte}")
    meilleur_nom = "Non classé"
    meilleur_score = 0
    meilleur_motif = ""

    for nom, mots in categories:
        # Le nom de la catégorie compte aussi comme mot-clé implicite.
        termes = [nom] + mots
        score = 0
        touches: list[str] = []
        for terme in termes:
            terme_norm = _normaliser(terme)
            if not terme_norm:
                continue
            # \b ne marche pas avec les accents retirés sur tous les mots ;
            # on compte les occurrences de sous-chaîne, suffisant ici.
            occurrences = base.count(terme_norm)
            if occurrences:
                score += occurrences
                touches.append(terme)
        if score > meilleur_score:
            meilleur_score = score
            meilleur_nom = nom
            meilleur_motif = ", ".join(touches[:5])

    if meilleur_score == 0:
        return {"categorie": "Non classé",
                "justification": "Aucun mot-clé de catégorie trouvé."}
    return {"categorie": meilleur_nom,
            "justification": f"Mots-clés trouvés : {meilleur_motif}"}


# --- Moteur d'analyse CLAUDE (API) ------------------------------------------


def classer_claude(client, nom_fichier: str, texte: str,
                   categories: list[tuple[str, list[str]]]) -> dict:
    """Demande à Claude dans quelle catégorie ranger le document."""
    noms = [nom for nom, _ in categories]
    valeurs = noms + ["Non classé"]
    schema = {
        "type": "object",
        "properties": {
            "categorie": {"type": "string", "enum": valeurs},
            "justification": {"type": "string"},
        },
        "required": ["categorie", "justification"],
        "additionalProperties": False,
    }

    if texte:
        contenu = f"Nom du fichier : {nom_fichier}\n\nExtrait du contenu :\n{texte}"
    else:
        contenu = (
            f"Nom du fichier : {nom_fichier}\n\n"
            "(Impossible d'extraire du texte de ce document — base-toi "
            "uniquement sur le nom du fichier, ou choisis 'Non classé'.)"
        )

    reponse = client.messages.create(
        model=MODELE,
        max_tokens=1000,
        system=(
            "Tu es un assistant qui range des documents par centre d'intérêt. "
            "Tu choisis exactement UNE catégorie parmi la liste fournie, celle "
            "qui correspond le mieux au thème du document. Si rien ne "
            "correspond ou que le contenu est inexploitable, utilise "
            "'Non classé'. La justification doit tenir en une courte phrase."
        ),
        messages=[{"role": "user", "content": contenu}],
        output_config={"format": {"type": "json_schema", "schema": schema}},
    )
    texte_reponse = next(bloc.text for bloc in reponse.content if bloc.type == "text")
    return json.loads(texte_reponse)


# --- Moteur d'analyse IA LOCALE (Ollama, sur le PC) -------------------------

# Ollama (https://ollama.com) fait tourner un modèle de langage directement sur
# ta machine et expose une petite API HTTP locale. Aucune donnée ne quitte le
# PC, aucune clé API. Il faut avoir installé Ollama et téléchargé un modèle
# (ex. `ollama pull llama3.2`).
OLLAMA_HOTE_DEFAUT = "http://localhost:11434"
OLLAMA_MODELE_DEFAUT = "llama3.2"


def classer_ollama(nom_fichier: str, texte: str,
                   categories: list[tuple[str, list[str]]],
                   modele: str, hote: str) -> dict:
    """Classe un document via un modèle local servi par Ollama (aucun réseau externe)."""
    import urllib.error
    import urllib.request

    noms = [nom for nom, _ in categories]
    valeurs = noms + ["Non classé"]
    schema = {
        "type": "object",
        "properties": {
            "categorie": {"type": "string", "enum": valeurs},
            "justification": {"type": "string"},
        },
        "required": ["categorie", "justification"],
    }

    if texte:
        contenu = f"Nom du fichier : {nom_fichier}\n\nExtrait du contenu :\n{texte}"
    else:
        contenu = (
            f"Nom du fichier : {nom_fichier}\n\n"
            "(Impossible d'extraire du texte — base-toi sur le nom du fichier, "
            "ou choisis 'Non classé'.)"
        )

    systeme = (
        "Tu ranges des documents par centre d'intérêt. Choisis exactement UNE "
        f"catégorie parmi : {', '.join(valeurs)}. Choisis celle qui correspond "
        "le mieux au thème du document. Si rien ne correspond, utilise "
        "'Non classé'. Réponds uniquement en JSON avec les clés 'categorie' et "
        "'justification' (une courte phrase)."
    )

    payload = {
        "model": modele,
        "messages": [
            {"role": "system", "content": systeme},
            {"role": "user", "content": contenu},
        ],
        "stream": False,
        "format": schema,
        "options": {"temperature": 0},
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

    # Sécurité : on force la catégorie à faire partie de la liste autorisée.
    if resultat.get("categorie") not in valeurs:
        resultat["categorie"] = "Non classé"
    resultat.setdefault("justification", "")
    return resultat


# --- Logique de tri (exécutée dans un thread de fond) -----------------------


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
          simulation: bool, cle_api: str, modele_ollama: str, hote_ollama: str,
          journaliser, arret, fini, progres=None):
    """Scanne les racines, classe chaque document et le range. Thread de fond.

    `progres(courant, total)` est appelé pour la barre de progression (optionnel).
    """
    def avancer(courant, total):
        if progres is not None:
            progres(courant, total)

    try:
        classer = _preparer_moteur(
            moteur, cle_api, modele_ollama, hote_ollama, journaliser)
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
    action = "Déplacé" if deplacer else "Copié"
    journaliser("")

    deja_dans_destination = destination.resolve()
    total = len(fichiers)
    compteur: dict[str, int] = {}
    echecs = 0
    ignores = 0
    lignes_rapport: list[tuple[str, str, str, str]] = []

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
            categorie = resultat["categorie"]
            justification = resultat.get("justification", "")

            dossier_cible = destination / _nom_dossier_sur(categorie)
            cible = chemin_destination_unique(dossier_cible, fichier.name)

            journaliser(f"    → {categorie}  ({justification})")
            if simulation:
                journaliser(f"    [simulation] irait dans : {dossier_cible}\n")
            else:
                dossier_cible.mkdir(parents=True, exist_ok=True)
                if deplacer:
                    shutil.move(str(fichier), str(cible))
                else:
                    shutil.copy2(str(fichier), str(cible))
                journaliser(f"    {action} dans : {dossier_cible}\n")

            compteur[categorie] = compteur.get(categorie, 0) + 1
            lignes_rapport.append(
                (str(fichier), categorie, justification, str(cible)))
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


class _ErreurMoteur(Exception):
    pass


def _preparer_moteur(moteur: str, cle_api: str, modele_ollama: str,
                     hote_ollama: str, journaliser):
    """Renvoie une fonction classer(nom, texte, categories) -> dict."""
    if moteur == "local":
        return classer_local

    if moteur == "ollama":
        modele = modele_ollama or OLLAMA_MODELE_DEFAUT
        hote = hote_ollama or OLLAMA_HOTE_DEFAUT
        journaliser(
            f"Moteur IA locale (Ollama) — modèle « {modele} » sur {hote}.\n"
            "Si rien ne se passe : installe Ollama (https://ollama.com), puis "
            f"dans un terminal lance « ollama pull {modele} ».\n"
        )
        return lambda nom, texte, cats: classer_ollama(
            nom, texte, cats, modele, hote)

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
    if not cle_api:
        journaliser(
            "ERREUR : aucune clé API. Colle ta clé Anthropic dans le champ "
            "'Clé API' (récupère-la sur https://console.anthropic.com), ou "
            "choisis le moteur « Local »."
        )
        raise _ErreurMoteur
    client = anthropic.Anthropic(api_key=cle_api)
    return lambda nom, texte, cats: classer_claude(client, nom, texte, cats)


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

        self.cadre_ollama = ttk.Frame(cadre)
        ttk.Label(self.cadre_ollama,
                  text="Modèle Ollama (ex. llama3.2, qwen2.5:3b, mistral) :").pack(anchor="w")
        self.var_modele = tk.StringVar(
            value=self.config.get("modele", OLLAMA_MODELE_DEFAUT))
        ttk.Entry(self.cadre_ollama, textvariable=self.var_modele).pack(
            fill="x", pady=(2, 0))
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
        ttk.Label(
            cadre,
            text=("Tes catégories (une par ligne). En mode Local, ajoute des "
                  "mots-clés après « : »."),
            font=("TkDefaultFont", 10, "bold"),
        ).pack(anchor="w", pady=(10, 0))
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

    def _demander_arret(self):
        self.arret.set()
        self.file_journal.put("Arrêt demandé…")

    def _lancer(self):
        # Étendue → racines.
        if self.var_etendue.get() == "pc":
            racines = lister_disques()
            if not racines:
                messagebox.showerror("Aucun disque", "Aucun disque détecté.")
                return
            if not messagebox.askyesno(
                "Scanner tout le PC ?",
                "Tu vas scanner TOUT le PC. Cela peut prendre du temps.\n\n"
                "Les dossiers système sont ignorés et, par défaut, les fichiers "
                "sont copiés (pas déplacés) en mode simulation.\n\nContinuer ?"):
                return
        else:
            if not self.dossiers_choisis:
                messagebox.showwarning(
                    "Aucun dossier", "Ajoute au moins un dossier à scanner.")
                return
            racines = [Path(d) for d in self.dossiers_choisis]

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
        cle_api = self.var_cle.get().strip()
        if moteur == "claude":
            if not cle_api:
                messagebox.showwarning(
                    "Clé API manquante",
                    "Colle ta clé API Anthropic, ou choisis le moteur « Local ».")
                return
            enregistrer_cle(cle_api)

        # Mémorise les réglages pour le prochain lancement.
        enregistrer_config({
            "etendue": self.var_etendue.get(),
            "dossiers_choisis": self.dossiers_choisis,
            "destination": destination_txt,
            "moteur": moteur,
            "modele": self.var_modele.get().strip(),
            "categories": self.txt_categories.get("1.0", "end").strip(),
            "simulation": self.var_simulation.get(),
            "deplacer": self.var_deplacer.get(),
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
                cle_api,
                self.var_modele.get().strip(),
                OLLAMA_HOTE_DEFAUT,
                self.file_journal.put,
                self.arret,
                lambda: self.after(0, self._reactiver),
                lambda c, t: self.file_progres.put((c, t)),
            ),
            daemon=True,
        ).start()

    def _reactiver(self):
        self.bouton_lancer.configure(state="normal")
        self.bouton_arret.configure(state="disabled")
        if self.derniere_destination is not None:
            self.bouton_ouvrir.configure(state="normal")


if __name__ == "__main__":
    Application().mainloop()
