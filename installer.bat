@echo off
REM Installe les dependances puis lance l'outil de tri (Windows).
REM Utilisation : double-clic sur installer.bat, ou lancer depuis l'invite de commandes.
cd /d "%~dp0"

REM Choisir l'interpreteur : on prefere le lanceur "py" (cible le Python le plus
REM recent installe), sinon on se rabat sur "python". Install ET lancement
REM utilisent ensuite le MEME interpreteur, ce qui evite l'erreur
REM "le paquet 'anthropic' n'est pas installe".
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY (
    where python >nul 2>nul && set "PY=python"
)
if not defined PY (
    echo ERREUR : Python n'est pas installe. Installe-le depuis https://www.python.org
    echo Pense a cocher "Add Python to PATH" pendant l'installation.
    pause
    exit /b 1
)

echo ==^> Interpreteur utilise :
%PY% -c "import sys; print(sys.version); print(sys.executable)"

echo ==^> Installation des dependances...
%PY% -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERREUR pendant l'installation des dependances.
    echo Si le message parle de "wheel" ou "no matching distribution", ta version
    echo de Python est peut-etre trop recente : installe Python 3.12 ou 3.13.
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
%PY% tri_documents.py
pause
