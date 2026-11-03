@echo off
rem Lance le serveur local puis ouvre le jeu dans le navigateur par defaut.
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
start "" http://127.0.0.1:8765/
%PY% outils\serveur.py
pause
