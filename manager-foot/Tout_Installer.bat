@echo off
setlocal
cd /d "%~dp0"
if not exist "outils\tout_installer.py" (
  echo Extrais d'abord le dossier complet du jeu, puis relance Tout_Installer.bat.
  pause
  exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; sys.exit(sys.version_info ^< (3,9))" >nul 2>nul
  if not errorlevel 1 goto python_launcher
)
where python >nul 2>nul
if not errorlevel 1 (
  python -c "import sys; sys.exit(sys.version_info ^< (3,9))" >nul 2>nul
  if not errorlevel 1 goto python_path
)
echo Python 3.9 ou plus recent est introuvable.
echo Installe Python depuis https://www.python.org/downloads/ et coche Add python.exe to PATH.
pause
exit /b 1
:python_launcher
py -3 "outils\tout_installer.py" %*
goto fin
:python_path
python "outils\tout_installer.py" %*
:fin
set "RC=%errorlevel%"
echo.
if not "%RC%"=="0" echo Installation partielle ou en erreur. Lis le bilan ci-dessus et donnees_jeu\journal_installation.txt.
pause
exit /b %RC%
