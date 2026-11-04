#!/bin/sh
# ============================================================
#  Manager Foot : installation complete en une commande (Linux / macOS)
#  Telecharge (ou met a jour) le jeu sans toucher a donnees_jeu, puis installe TOUT : base mondiale, Transfermarkt,
#  ClubElo, maillots, Wikidata (photos, logos, entraineurs), palmares, nationalites, visages, fiches FM26 detaillees
#  (notes / attributs) de tous les joueurs des clubs, reserves et joueurs libres. Puis lance le jeu.
#
#  curl -fsSL https://raw.githubusercontent.com/Boobast29/BOOBAST/claude/tender-hawking-cnluv6/manager-foot/installer_tout.sh | sh
#  Variables : DOSSIER=~/ManagerFoot  BRANCHE=claude/tender-hawking-cnluv6  ; arguments passes a tout_installer.py
#  (ex. --rapide, --pack chemin.zip)
# ============================================================
set -e
DOSSIER="${DOSSIER:-$HOME/ManagerFoot}"
BRANCHE="${BRANCHE:-claude/tender-hawking-cnluv6}"
command -v python3 >/dev/null 2>&1 || { echo "Python 3 est requis : installe-le (paquet python3), puis relance."; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl est requis."; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unzip est requis."; exit 1; }
TMP="$(mktemp -d)"
echo "==> Telechargement du jeu ($BRANCHE)"
curl -fsSL "https://github.com/Boobast29/BOOBAST/archive/refs/heads/$BRANCHE.zip" -o "$TMP/jeu.zip"
unzip -q "$TMP/jeu.zip" -d "$TMP"
SRC="$(find "$TMP" -maxdepth 3 -type d -name manager-foot | head -n 1)"
[ -n "$SRC" ] && [ -f "$SRC/outils/tout_installer.py" ] || { echo "Archive inattendue."; exit 1; }
mkdir -p "$DOSSIER"
# copie sans effacer : donnees_jeu (base, photos, sauvegardes) n'est jamais touche
( cd "$SRC" && find . -path ./donnees_jeu -prune -o -type f -print | while IFS= read -r f; do mkdir -p "$DOSSIER/$(dirname "$f")"; cp -f "$f" "$DOSSIER/$f"; done )
rm -rf -- "$TMP"
echo "==> Jeu installe dans $DOSSIER"
echo "==> Installation de tout (les collectes de fiches peuvent durer plusieurs heures ; relancer reprend ou ca s'etait arrete)"
cd "$DOSSIER" && exec python3 outils/tout_installer.py "$@"
