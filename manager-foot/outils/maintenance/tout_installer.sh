#!/bin/sh
# Installe et met a jour tout (Linux / macOS), puis lance le jeu.
cd "$(dirname "$0")/../.." && exec python3 outils/tout_installer.py "$@"
