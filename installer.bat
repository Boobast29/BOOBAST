@echo off
REM Installe les dependances puis lance l'outil de tri (Windows).
REM Utilisation : double-clic sur installer.bat, ou lancer depuis l'invite de commandes.
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo ERREUR : Python n'est pas installe. Installe-le depuis https://www.python.org
    echo Pense a cocher "Add Python to PATH" pendant l'installation.
    pause
    exit /b 1
)

echo ==^> Installation des dependances...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERREUR pendant l'installation des dependances.
    pause
    exit /b 1
)

if "%ANTHROPIC_API_KEY%"=="" (
    echo.
    echo ATTENTION : la variable ANTHROPIC_API_KEY n'est pas definie.
    echo Recupere une cle sur https://console.anthropic.com puis lance :
    echo     setx ANTHROPIC_API_KEY "ta-cle-ici"
    echo puis rouvre cette fenetre.
    echo.
)

echo ==^> Lancement de l'application...
python tri_documents.py
pause
