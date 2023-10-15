
# Check if the current user has administrator privileges
$isAdmin = [bool]([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups -match "S-1-5-32-544")

# If not an administrator, re-run the script with elevated privileges
if (-not $isAdmin) {
    # Define the arguments for the new elevated session
    $argArray = @()
    $argArray += $MyInvocation.MyCommand.Definition
    $argArray += $args
    $argString = $argArray -join ' '

    # Start a new elevated PowerShell process
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File $($argString)" -Verb RunAs
    Exit
}

# Spice it up for the user
Write-Host ",------.                       ,--.                 "
Write-Host "|  .--. ' ,--,--.,--.--. ,---. |  | ,---. ,--. ,--. "
Write-Host "|  '--' |' ,-.  ||  .--'(  .-' |  || .-. : \  '  /  "
Write-Host "|  | --' \ '-'  ||  |   .-'  ``)|  |\   --.  \   '   "
Write-Host "``--'      ``--``--'``--'   ``----' ``--' ``----'.-'  /    "
Write-Host "                                          ``---'     "

# Change to this script dir
$scriptpath = $MyInvocation.MyCommand.Path 
$dir = Split-Path $scriptpath
Write-Host "Executing in $dir"
$mainPath = "$dir\Parsley\"

# Write to Program Files
Write-Host "Writing to Program Files"
$programFilesPath = "C:\Program Files\"
New-Item -Path "$programFilesPath" -ItemType Directory -Force 
Copy-Item -Path "$mainPath" -Destination "$programFilesPath" -Recurse -Force

# Create desktop shortcut
Write-Host "Creating desktop shortcut"
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$TargetFile = "$programFilesPath\Parsley\Parsley.exe"  # Replace with the path to your .exe file

# Turn off readonly attribute on config and cache
Write-Host "Disabling readonly attribute on config.json"
$config_path = "$programFilesPath\Parsley\resources\config.json"
$cache_path = "$programFilesPath\Parsley\resources\cache.txt"
Set-ItemProperty $config_path -name IsReadOnly -value $false
Set-ItemProperty $cache_path -name IsReadOnly -value $false

# Grant read and write permissions to all users
Write-Host "Lowering privilages on config.json"
$acl = Get-Acl $config_path
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users", "FullControl", "Allow")
$acl.AddAccessRule($rule)
Set-Acl -Path $config_path -AclObject $acl

$acl = Get-Acl $cache_path
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Users", "FullControl", "Allow")
$acl.AddAccessRule($rule)
Set-Acl -Path $cache_path -AclObject $acl
Write-Host "Permissions for $cache_path have been modified to allow read and write access for all users."

$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Parsley.lnk")
$Shortcut.TargetPath = $TargetFile
$Shortcut.Save()