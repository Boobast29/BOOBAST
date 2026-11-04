@echo off
rem Visages generes par IA pour les joueurs sans photo.
rem  - Stable Diffusion sur ton PC (AUTOMATIC1111 ou Forge lance avec --api) : double-clic
rem  - DeepInfra (payant) : Generer_Visages_IA.bat --moteur deepinfra --cle TA_CLE
rem  - Essai sans generer : Generer_Visages_IA.bat --essai
cd /d "%~dp0..\.."
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% outils\generer_visages_ia.py %*
pause
