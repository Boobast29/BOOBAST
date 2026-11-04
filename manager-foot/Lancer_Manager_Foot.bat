@echo off
rem Lance le serveur local du jeu ; le navigateur s'ouvre tout seul quand le serveur est pret.
rem Laisse cette fenetre ouverte pendant la partie (la fermer arrete le jeu).
cd /d "%~dp0"
if not exist "outils\serveur.py" (
  echo Fichiers introuvables : extrais d'abord le zip complet ^(clic droit ^> Extraire tout^), puis relance ce fichier depuis le dossier extrait.
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
%PY% outils\serveur.py --ouvrir
echo.
echo Le serveur s'est arrete. Si une erreur est affichee ci-dessus, envoie une capture.
pause
