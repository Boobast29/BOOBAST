@echo off
setlocal
cd /d "%~dp0..\.."
if not exist "outils\lanceur.py" (
  echo Fichier outils\lanceur.py absent. Extrais le dossier manager-foot complet.
  exit /b 1
)
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo Python 3 est requis : https://www.python.org/downloads/
  exit /b 1
)
%PY% outils\lanceur.py
exit /b %errorlevel%
