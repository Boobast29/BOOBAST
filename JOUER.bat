@echo off
setlocal
 title BOOBAST - Manager Foot
pushd "%~dp0"
if errorlevel 1 (
  echo Impossible d'ouvrir le dossier du jeu. Decompresse tout le ZIP avant de lancer.
  pause
  exit /b 1
)
if not exist "manager-foot\Lancer_Manager_Foot.bat" (
  echo Le dossier du jeu est incomplet.
  echo Decompresse tout le ZIP GitHub, puis ouvre JOUER.bat dans le dossier extrait.
  pause
  popd
  exit /b 1
)
call "manager-foot\Lancer_Manager_Foot.bat" %*
set "BOOBAST_EXIT=%ERRORLEVEL%"
popd
exit /b %BOOBAST_EXIT%
