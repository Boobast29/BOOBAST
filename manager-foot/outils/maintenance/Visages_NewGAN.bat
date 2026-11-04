@echo off
rem Visages du pack NewGAN (portraits generes par IA) pour les joueurs sans photo.
rem Glisse le dossier du pack NewGAN sur ce fichier, ou : Visages_NewGAN.bat "C:\chemin\NewGAN"
rem Retirer : Visages_NewGAN.bat --retirer
cd /d "%~dp0..\.."
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\visages_newgan.py %*
pause
