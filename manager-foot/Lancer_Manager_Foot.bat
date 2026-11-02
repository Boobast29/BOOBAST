@echo off
rem Lance le serveur local puis ouvre le jeu dans le navigateur par defaut.
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
if not exist "donnees_jeu\monde.db" (
  echo Base mondiale absente : import du pack Football_Monde ^(une seule fois, quelques minutes^)...
  %PY% outils\importer_monde.py || (echo Import impossible. Indique le dossier : %PY% outils\importer_monde.py --donnees CHEMIN\Football_Monde & pause & exit /b 1)
)
start "" http://127.0.0.1:8765/
%PY% outils\serveur.py
pause
