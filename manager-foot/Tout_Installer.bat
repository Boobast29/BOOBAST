@echo off
rem INSTALLE ET MET A JOUR TOUT en une fois : base mondiale (pack Football_Monde si present), donnees reelles,
rem photos, logos, maillots, palmares, championnats europeens, visages ; puis lance le jeu.
rem Internet necessaire. Peut se relancer a tout moment (mise a jour). Journal : donnees_jeu\journal_installation.txt
cd /d "%~dp0"
if not exist "outils\tout_installer.py" (
  echo Fichiers introuvables : extrais d'abord le zip complet ^(clic droit ^> Extraire tout^), puis relance ce fichier.
  pause
  exit /b 1
)
set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY where python >nul 2>nul && set PY=python
if not defined PY (
  echo Python est introuvable. Installe-le depuis https://www.python.org/downloads/ ^(coche "Add python.exe to PATH"^), puis relance ce fichier.
  pause
  exit /b 1
)
%PY% outils\tout_installer.py %*
pause
