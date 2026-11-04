@echo off
rem Ancien nom conserve pour compatibilite : le lanceur unique gere installation, mises a jour et demarrage.
call "%~dp0Lancer_Manager_Foot.bat" %*
exit /b %errorlevel%
