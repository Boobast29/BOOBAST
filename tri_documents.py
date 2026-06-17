#!/usr/bin/env python3
"""Tri intelligent de documents (PDF, Word, PowerPoint) par centre d'intérêt.

Petite application avec interface graphique : tu choisis un dossier, tu donnes
tes catégories, et l'outil lit le contenu de chaque document, demande à l'IA
(API Claude) dans quelle catégorie il va, puis range les fichiers dans des
sous-dossiers correspondants.

Lancement :
    python tri_documents.py

Nécessite la variable d'environnement ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import json
import os
import queue
import shutil
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk

# --- Lecture du contenu des documents --------------------------------------

# Nombre de caractères de contenu envoyés à l'IA par document. Un extrait
# suffit largement pour déterminer le thème, et ça maîtrise le coût/la vitesse.
EXTRAIT_MAX_CARACTERES = 6000

MODELE = "claude-opus-4-8"

EXTENSIONS_SUPPORTEES = {".pdf", ".docx", ".pptx"}


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


def extraire_texte(chemin: Path) -> str:
    """Renvoie un extrait du contenu textuel du document."""
    extension = chemin.suffix.lower()
    if extension == ".pdf":
        texte = lire_pdf(chemin)
    elif extension == ".docx":
        texte = lire_docx(chemin)
    elif extension == ".pptx":
        texte = lire_pptx(chemin)
    else:
        return ""
    return texte[:EXTRAIT_MAX_CARACTERES].strip()


# --- Classification via l'API Claude ----------------------------------------


def classer_document(client, nom_fichier: str, texte: str, categories: list[str]) -> dict:
    """Demande à Claude dans quelle catégorie ranger le document.

    Renvoie un dict {"categorie": <str>, "justification": <str>}. La catégorie
    renvoyée fait toujours partie des catégories fournies (contrainte par un
    schéma JSON), avec un repli sur "Non classé" si le contenu est illisible.
    """
    valeurs = categories + ["Non classé"]
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
        contenu = (
            f"Nom du fichier : {nom_fichier}\n\n"
            f"Extrait du contenu :\n{texte}"
        )
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


def trier(dossier: Path, categories: list[str], deplacer: bool, cle_api: str,
          journaliser, fini):
    """Parcourt le dossier, classe chaque document et le range. Thread de fond."""
    try:
        import anthropic
    except ImportError:
        import sys
        journaliser(
            "ERREUR : le paquet 'anthropic' n'est pas installé pour ce Python.\n"
            f"    Python utilisé : {sys.executable}\n"
            "    Installe les dépendances avec CE Python précis :\n"
            f'    "{sys.executable}" -m pip install anthropic pypdf python-docx python-pptx'
        )
        fini()
        return

    if not cle_api:
        journaliser(
            "ERREUR : aucune clé API. Colle ta clé Anthropic dans le champ "
            "'Clé API' (récupère-la sur https://console.anthropic.com)."
        )
        fini()
        return

    client = anthropic.Anthropic(api_key=cle_api)

    fichiers = [
        p for p in sorted(dossier.iterdir())
        if p.is_file() and p.suffix.lower() in EXTENSIONS_SUPPORTEES
    ]

    if not fichiers:
        journaliser("Aucun fichier PDF, Word (.docx) ou PowerPoint (.pptx) "
                    "trouvé dans ce dossier.")
        fini()
        return

    journaliser(f"{len(fichiers)} document(s) à trier.\n")
    action = "Déplacé" if deplacer else "Copié"

    for i, fichier in enumerate(fichiers, start=1):
        journaliser(f"[{i}/{len(fichiers)}] {fichier.name} — analyse…")
        try:
            texte = extraire_texte(fichier)
            resultat = classer_document(client, fichier.name, texte, categories)
            categorie = resultat["categorie"]
            justification = resultat.get("justification", "")

            dossier_cible = dossier / categorie
            dossier_cible.mkdir(exist_ok=True)
            destination = chemin_destination_unique(dossier_cible, fichier.name)

            if deplacer:
                shutil.move(str(fichier), str(destination))
            else:
                shutil.copy2(str(fichier), str(destination))

            journaliser(f"    → {categorie}  ({justification})")
            journaliser(f"    {action} dans : {dossier_cible}\n")
        except Exception as erreur:  # noqa: BLE001 - on continue malgré une erreur isolée
            journaliser(f"    ÉCHEC : {erreur}\n")

    journaliser("✅ Tri terminé.")
    fini()


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


# --- Interface graphique -----------------------------------------------------


class Application(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Tri intelligent de documents")
        self.geometry("720x600")
        self.minsize(640, 520)

        self.file_journal: queue.Queue[str] = queue.Queue()
        self._construire_interface()
        self.after(100, self._vider_journal)

    def _construire_interface(self):
        cadre = ttk.Frame(self, padding=12)
        cadre.pack(fill="both", expand=True)

        # Dossier
        ttk.Label(cadre, text="Dossier contenant tes documents :").pack(anchor="w")
        ligne = ttk.Frame(cadre)
        ligne.pack(fill="x", pady=(2, 10))
        self.var_dossier = tk.StringVar()
        ttk.Entry(ligne, textvariable=self.var_dossier).pack(
            side="left", fill="x", expand=True)
        ttk.Button(ligne, text="Parcourir…", command=self._choisir_dossier).pack(
            side="left", padx=(6, 0))

        # Clé API
        ttk.Label(
            cadre,
            text="Clé API Anthropic (depuis console.anthropic.com) — mémorisée après le 1er tri :",
        ).pack(anchor="w")
        self.var_cle = tk.StringVar(value=charger_cle())
        ttk.Entry(cadre, textvariable=self.var_cle, show="•").pack(
            fill="x", pady=(2, 10))

        # Catégories
        ttk.Label(
            cadre,
            text="Tes catégories (une par ligne) — ex. Travail, Études, Cuisine, Voyages :",
        ).pack(anchor="w")
        self.txt_categories = tk.Text(cadre, height=6)
        self.txt_categories.pack(fill="x", pady=(2, 10))
        self.txt_categories.insert("1.0", "Travail\nÉtudes\nPersonnel\nFinances")

        # Options
        self.var_deplacer = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            cadre,
            text="Déplacer les fichiers (décoché = les copier, originaux conservés)",
            variable=self.var_deplacer,
        ).pack(anchor="w", pady=(0, 10))

        # Bouton lancer
        self.bouton_lancer = ttk.Button(
            cadre, text="Lancer le tri", command=self._lancer)
        self.bouton_lancer.pack(anchor="w", pady=(0, 10))

        # Journal
        ttk.Label(cadre, text="Journal :").pack(anchor="w")
        self.journal = scrolledtext.ScrolledText(cadre, height=14, state="disabled")
        self.journal.pack(fill="both", expand=True, pady=(2, 0))

    def _choisir_dossier(self):
        dossier = filedialog.askdirectory(title="Choisis le dossier à trier")
        if dossier:
            self.var_dossier.set(dossier)

    def _ecrire(self, message: str):
        self.journal.configure(state="normal")
        self.journal.insert("end", message + "\n")
        self.journal.see("end")
        self.journal.configure(state="disabled")

    def _vider_journal(self):
        while not self.file_journal.empty():
            self._ecrire(self.file_journal.get_nowait())
        self.after(100, self._vider_journal)

    def _lancer(self):
        dossier_txt = self.var_dossier.get().strip()
        if not dossier_txt:
            messagebox.showwarning("Dossier manquant", "Choisis d'abord un dossier.")
            return
        dossier = Path(dossier_txt)
        if not dossier.is_dir():
            messagebox.showerror("Dossier invalide", "Ce dossier n'existe pas.")
            return

        categories = [
            ligne.strip()
            for ligne in self.txt_categories.get("1.0", "end").splitlines()
            if ligne.strip()
        ]
        if not categories:
            messagebox.showwarning(
                "Catégories manquantes", "Indique au moins une catégorie.")
            return

        cle_api = self.var_cle.get().strip()
        if not cle_api:
            messagebox.showwarning(
                "Clé API manquante",
                "Colle ta clé API Anthropic dans le champ 'Clé API'.\n"
                "Tu peux en créer une sur https://console.anthropic.com")
            return
        enregistrer_cle(cle_api)  # mémorise pour la prochaine fois

        self.bouton_lancer.configure(state="disabled")
        self.journal.configure(state="normal")
        self.journal.delete("1.0", "end")
        self.journal.configure(state="disabled")

        threading.Thread(
            target=trier,
            args=(
                dossier,
                categories,
                self.var_deplacer.get(),
                cle_api,
                self.file_journal.put,
                lambda: self.after(0, self._reactiver),
            ),
            daemon=True,
        ).start()

    def _reactiver(self):
        self.bouton_lancer.configure(state="normal")


if __name__ == "__main__":
    Application().mainloop()
