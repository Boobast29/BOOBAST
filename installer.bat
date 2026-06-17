@echo off
REM Installe les dependances puis lance l'outil de tri (Windows).
REM Utilisation : double-clic sur installer.bat, ou lancer depuis l'invite de commandes.
REM IMPORTANT : ce fichier doit etre dans le MEME dossier que tri_documents.py.
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

REM Verifier que le programme principal est bien a cote de ce script.
if not exist "tri_documents.py" (
    echo ERREUR : "tri_documents.py" est introuvable dans ce dossier :
    echo     %CD%
    echo.
    echo Place installer.bat et tri_documents.py dans le MEME dossier, puis relance.
    echo Contenu actuel du dossier :
    dir /b
    pause
    exit /b 1
)

echo ==^> Interpreteur utilise :
%PY% -c "import sys; print(sys.version); print(sys.executable)"

echo ==^> Installation des dependances...
REM On installe par nom (pas besoin de requirements.txt) : plus robuste.
%PY% -m pip install --upgrade pip
%PY% -m pip install anthropic pypdf python-docx python-pptx
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
