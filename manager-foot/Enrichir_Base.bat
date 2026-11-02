@echo off
rem Enrichit la base avec des donnees reelles ouvertes (internet necessaire) :
rem  1. reep (CC0) : liens vers Wikidata  2. transfermarkt-datasets (CC0) : entraineurs, stades, valeurs, contrats
rem  3. Wikidata : entraineurs de tous les niveaux, logos et photos libres, effectifs des divisions sans joueurs notes
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\importer_reep.py || goto fin
%PY% outils\importer_transfermarkt.py
%PY% outils\importer_clubelo.py
%PY% outils\enrichir_wikidata.py %*
:fin
pause
