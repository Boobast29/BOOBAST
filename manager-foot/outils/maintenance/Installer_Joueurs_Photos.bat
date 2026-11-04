@echo off
cd /d "%~dp0..\.."
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\installer_donnees.py %*
if errorlevel 1 echo Installation interrompue. Consulte le message ci-dessus.
pause
