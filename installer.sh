#!/usr/bin/env bash
# Installe les dépendances puis lance l'outil de tri (macOS / Linux).
# Utilisation : ./installer.sh
set -e

cd "$(dirname "$0")"

# Trouver une commande Python disponible
if command -v python3 >/dev/null 2>&1; then
    PY=python3
elif command -v python >/dev/null 2>&1; then
    PY=python
else
    echo "ERREUR : Python n'est pas installé. Installe-le depuis https://www.python.org"
    exit 1
fi

echo "==> Installation des dépendances…"
"$PY" -m pip install -r requirements.txt

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo
    echo "ATTENTION : la variable ANTHROPIC_API_KEY n'est pas définie."
    echo "Récupère une clé sur https://console.anthropic.com puis lance :"
    echo "    export ANTHROPIC_API_KEY=\"ta-clé-ici\""
    echo
fi

echo "==> Lancement de l'application…"
exec "$PY" tri_documents.py
