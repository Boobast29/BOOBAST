#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.9+ est requis."
  exit 1
fi
python3 -c 'import sys; sys.exit(sys.version_info < (3,9))' || { echo "Python 3.9+ est requis."; exit 1; }
exec python3 outils/tout_installer.py "$@"
