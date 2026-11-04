@echo off
setlocal
set "PYTHONUTF8=1"
cd /d "%~dp0"
set "BOOBAST_GAME=%~dp0"
if exist ".runtime\python\python.exe" (
  ".runtime\python\python.exe" "outils\lanceur.py" %*
  goto bilan
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)" >nul 2>nul
  if not errorlevel 1 (
    py -3 "outils\lanceur.py" %*
    goto bilan
  )
)
for /f "delims=" %%P in ('where python 2^>nul ^| findstr /v /i /c:"WindowsApps"') do (
  "%%P" -c "import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)" >nul 2>nul
  if not errorlevel 1 (
    set "BOOBAST_PYTHON=%%P"
    goto python_trouve
  )
)
goto installation_python
:python_trouve
"%BOOBAST_PYTHON%" "outils\lanceur.py" %*
goto bilan
:installation_python
powershell -NoProfile -Command "$s=(Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/Boobast29/BOOBAST/Manager-foot/Installer.ps1').Content; & ([scriptblock]::Create($s)) -Destination $env:BOOBAST_GAME"
:bilan
if errorlevel 1 (
  echo.
  echo Installation interrompue. Le detail est dans donnees_jeu\journal_lanceur.txt
  echo Relance ce meme fichier pour reprendre.
  pause
  exit /b 1
)
exit /b 0
