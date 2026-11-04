@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
echo Complete les attributs des joueurs des clubs du jeu, reserves comprises.
echo La collecte peut etre longue. Chaque fiche validee est conservee pour reprendre plus tard.
where py >nul 2>nul
if errorlevel 1 (
  python outils\enrichir_effectifs.py --tout
) else (
  py -3 outils\enrichir_effectifs.py --tout
)
pause
