@echo off
setlocal
cd /d "%~dp0..\.."
if not exist "outils\installer_donnees.py" (
  echo Extrais le depot complet avant de lancer ce fichier.
  pause
  exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 outils\installer_donnees.py %*
) else (
  python outils\installer_donnees.py %*
)
if errorlevel 1 (
  echo Installation en echec. Lis le message ci-dessus.
  pause
  exit /b 1
)
pause
