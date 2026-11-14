@echo off
rem Fait démarrer Ada (le PC de la maison) toute seule à chaque ouverture de session Windows, sans fenêtre.
rem   scripts\autostart-windows.cmd          active le démarrage automatique
rem   scripts\autostart-windows.cmd off      le désactive
rem Tâche planifiée « Ada - PC de la maison », pour ton compte seulement (pas besoin d'être administrateur).
setlocal
set "VBS=%~dp0demarrer-ada.vbs"

if /i "%~1"=="off" (
  powershell -NoProfile -Command "Unregister-ScheduledTask -TaskName 'Ada - PC de la maison' -Confirm:$false"
  goto :eof
)

powershell -NoProfile -Command ^
  "$a = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('\"' + $env:VBS + '\"');" ^
  "$t = New-ScheduledTaskTrigger -AtLogOn -User ($env:USERDOMAIN + '\' + $env:USERNAME); $t.Delay = 'PT30S';" ^
  "$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Seconds 0);" ^
  "Register-ScheduledTask -TaskName 'Ada - PC de la maison' -Action $a -Trigger $t -Settings $s -Force | Out-Null"
if errorlevel 1 (
  echo Impossible de creer la tache. Ajoute plutot un raccourci vers "%VBS%" dans le dossier shell:startup.
  exit /b 1
)
echo Ada demarrera toute seule a chaque ouverture de session. Journal : %~dp0..\logs\ada.log
