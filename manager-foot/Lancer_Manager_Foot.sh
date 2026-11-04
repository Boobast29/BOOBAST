#!/bin/sh
# Lanceur unique : mise à jour du code et des données, puis démarrage du jeu.
cd "$(dirname "$0")" || exit 1
exec python3 outils/lanceur.py "$@"
