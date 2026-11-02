@echo off
rem Importe ou met a jour la base (reprise automatique, sans doublon).
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\importer_monde.py %*
pause
