#!/bin/sh
# Ancien nom conservé pour compatibilité : transfert au lanceur unique.
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
exec "$DIR/Lancer_Manager_Foot.sh" "$@"
