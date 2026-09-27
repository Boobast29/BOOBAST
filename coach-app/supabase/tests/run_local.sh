#!/usr/bin/env bash
# Teste le schéma sur un Postgres local jetable : ./supabase/tests/run_local.sh <hôte-socket> <port>
set -euo pipefail
H=${1:-/var/tmp/qeapg}; P=${2:-5499}; DB=qea_test_$$
cd "$(dirname "$0")"
psql -h "$H" -p "$P" -U postgres -qc "create database $DB"
trap 'psql -h "$H" -p "$P" -U postgres -qc "drop database $DB" >/dev/null' EXIT
psql -h "$H" -p "$P" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase_mock.sql
PGOPTIONS="-c client_min_messages=warning" psql -h "$H" -p "$P" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f ../migrations/0001_qea_coach.sql
psql -h "$H" -p "$P" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 -f rls_test.sql 2>&1 | sed -E "s/^psql:rls_test.sql:[0-9]+: //; /^$/d"
