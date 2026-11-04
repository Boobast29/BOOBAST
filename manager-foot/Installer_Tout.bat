@echo off
rem Installation complete de Manager Foot (jeu a jour, Python, base, photos, logos, maillots, notes et fiches des joueurs reels).
rem Options a ajouter apres le nom : -Rapide (sans les longues collectes de fiches), -Pack "chemin du zip Football_Monde"
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installer_Tout.ps1" -Dossier "%~dp0." %*
pause
