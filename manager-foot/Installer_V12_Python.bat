@echo off
rem Compatibilite V12 : le lanceur unique trouve/importera le ZIP et demarrera ensuite le jeu.
call "%~dp0Lancer_Manager_Foot.bat" %*
exit /b %errorlevel%
