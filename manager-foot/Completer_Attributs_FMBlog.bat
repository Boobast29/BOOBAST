@echo off
cd /d "%~dp0"
python outils\importer_fmblog.py --limite 1000 --workers 4
if errorlevel 1 goto fin
python outils\auditer_couverture_fmi.py
:fin
pause
