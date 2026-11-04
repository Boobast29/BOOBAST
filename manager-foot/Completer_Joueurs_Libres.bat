@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Collecte les joueurs explicitement libres dans la source FM26.
echo Les fiches deja enregistrees sont reutilisees. Les joueurs sous contrat ne sont pas liberes.
where py >nul 2>nul
if errorlevel 1 (
  python outils\enrichir_effectifs.py --libres-seulement --pages-libres 0
) else (
  py -3 outils\enrichir_effectifs.py --libres-seulement --pages-libres 0
)
pause
