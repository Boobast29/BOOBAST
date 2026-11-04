@echo off
rem Ouvre le navigateur seulement lorsque le serveur est pret.
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\serveur.py --ouvrir
pause
