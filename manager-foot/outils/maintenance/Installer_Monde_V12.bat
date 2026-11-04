@echo off
setlocal
cd /d "%~dp0..\.."
if not exist "outils\installation_simple.py" (
  echo Extrais le ZIP du code avant de lancer ce fichier.
  pause
  exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "outils\installation_simple.py"
) else (
  python "outils\installation_simple.py"
)
if errorlevel 1 (
  echo Installation interrompue. Lis le message ci-dessus.
  pause
  exit /b 1
)
pause
