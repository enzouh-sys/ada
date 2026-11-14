' Lance Ada (le PC de la maison) sans fenêtre : `npm run dev` en arrière-plan, journal dans logs\ada.log.
' Utilisé par la tâche « Ada - PC de la maison » au démarrage de Windows (scripts\autostart-windows.cmd).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
If Not fso.FolderExists(dir & "\logs") Then fso.CreateFolder(dir & "\logs")
CreateObject("WScript.Shell").Run "cmd /c cd /d """ & dir & """ && npm run dev >> logs\ada.log 2>&1", 0, False
