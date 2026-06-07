Set objShell = CreateObject("Shell.Application")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' ShellExecute parametros: archivo, argumentos, directorio_trabajo, accion (runas = admin), estilo_ventana (0 = oculta)
objShell.ShellExecute "pythonw.exe", Chr(34) & "client.py" & Chr(34), strPath, "runas", 0
