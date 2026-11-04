@echo off
rem Importe un pack graphique Football Manager deja telecharge (visages, logos, maillots) pour ton usage personnel.
rem Exemple : Importer_Pack_FM.bat --pack "C:\Packs\Logos" --liste "C:\Packs\clubs.html" --type logos
cd /d "%~dp0..\.."
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\importer_pack_fm.py %*
pause
