# Installation Windows : un seul raccourci pour installer, mettre à jour et jouer.
param([string]$Destination=(Join-Path $env:LOCALAPPDATA 'BOOBAST'),[string]$PackUrl='',[string]$Pack='',[switch]$SansLancer)
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$ProgressPreference='SilentlyContinue'
$Destination=[IO.Path]::GetFullPath($Destination)
$Repo='https://api.github.com/repos/Boobast29/BOOBAST'
function Get-File([string]$Url,[string]$Path) {
  for($n=0;$n -lt 3;$n++) {
    try { Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path -TimeoutSec 180 -Headers @{'User-Agent'='BOOBAST-install'}; return }
    catch { if($n -eq 2){throw}; Write-Host 'Connexion interrompue, nouvelle tentative...'; Start-Sleep -Seconds 2 }
  }
}
function Get-Python([string]$Folder) {
  $portable=Join-Path $Folder '.runtime\python\python.exe'
  if(Test-Path $portable){ & $portable -c 'import sys,sqlite3; sys.exit(0 if sys.version_info >= (3,12) else 1)' ; if($LASTEXITCODE -eq 0){return @($portable)} }
  foreach($name in @('python.exe','py.exe')) {
    $cmd=Get-Command $name -ErrorAction SilentlyContinue
    if($cmd -and $cmd.Source -notlike '*WindowsApps*') {
      $prefix=@();if($name -eq 'py.exe'){$prefix=@('-3')}
      & $cmd.Source @prefix -c 'import sys,sqlite3; sys.exit(0 if sys.version_info >= (3,12) else 1)' 2>$null
      if($LASTEXITCODE -eq 0){return @($cmd.Source)+$prefix}
    }
  }
  Write-Host 'Installation du moteur Python portable (sans droits administrateur)...'
  $arch=$env:PROCESSOR_ARCHITEW6432;if(-not $arch){$arch=$env:PROCESSOR_ARCHITECTURE}
  $runtime=@{
    'AMD64'=@('amd64','90905e64a840557d8c1bc4f5b74db3d7ee85e3ffb217611cac1c7813acea4159')
    'ARM64'=@('arm64','bbe116bb1248820359cbf25127ac5c7794ea161869d83686cfbc9a45203ff836')
    'x86'=@('win32','11a28e8c00a6d8f56b0a6164d52546133a9ed015a5b33e04536917e4fd6e306c')
  }[$arch]
  if(-not $runtime){throw 'Architecture Windows non prise en charge.'}
  $zip=Join-Path $env:TEMP ('boobast-python-'+[guid]::NewGuid()+'.zip')
  try {
    Get-File ('https://www.python.org/ftp/python/3.14.10/python-3.14.10-embed-'+$runtime[0]+'.zip') $zip
    if((Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant() -ne $runtime[1]){throw 'Archive Python corrompue : empreinte incorrecte.'}
    $target=Join-Path $Folder ('.runtime\python-stage-'+[guid]::NewGuid());New-Item -ItemType Directory -Force $target | Out-Null
    [IO.Compression.ZipFile]::ExtractToDirectory($zip,$target)
    $pth=Join-Path $target 'python314._pth'
    $utf8=New-Object System.Text.UTF8Encoding $false
    [IO.File]::WriteAllLines($pth,[string[]]@('python314.zip','.',(Join-Path $Folder 'outils'),'import site'),$utf8)
  } finally {Remove-Item $zip -Force -ErrorAction SilentlyContinue}
  $candidate=Join-Path $target 'python.exe'
  & $candidate -c "import sqlite3,ssl,zlib; c=sqlite3.connect(':memory:'); c.execute('create virtual table test using fts5(v)')"
  if($LASTEXITCODE -ne 0){throw 'Le moteur Python portable ne peut pas démarrer.'}
  $final=Join-Path $Folder '.runtime\python'
  if(Test-Path $final){$old=Join-Path $Folder ('.runtime\python-ancien-'+[guid]::NewGuid());Move-Item $final $old}
  Move-Item $target $final
  return @((Join-Path $final 'python.exe'))
}
try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  Write-Host 'BOOBAST - installation du jeu complet'
  New-Item -ItemType Directory -Force $Destination | Out-Null
  $health=$null
  try {$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8765/api/health' -TimeoutSec 2} catch {}
  if($health -and $health.application -eq 'BOOBAST' -and [string]::Equals($health.root.TrimEnd('\'),$Destination.TrimEnd('\'),[StringComparison]::OrdinalIgnoreCase)) {
    if($SansLancer){throw 'Ferme la fenêtre du jeu avant de mettre à jour ses données.'}
    Write-Host 'Le jeu est déjà ouvert. Réouverture du navigateur.';Start-Process 'http://127.0.0.1:8765/';return
  }

  $temporary=Join-Path $env:TEMP ('boobast-'+[guid]::NewGuid());New-Item -ItemType Directory $temporary | Out-Null
  try {
    $commit=(Invoke-RestMethod -Uri ($Repo+'/commits/Manager-foot') -Headers @{'User-Agent'='BOOBAST-install'}).sha
    if($commit -notmatch '^[a-f0-9]{40}$'){throw 'Révision GitHub invalide.'}
    $zip=Join-Path $temporary 'code.zip';Get-File ('https://codeload.github.com/Boobast29/BOOBAST/zip/'+$commit) $zip
    $stage=Join-Path $temporary 'code';New-Item -ItemType Directory $stage | Out-Null
    $archive=[IO.Compression.ZipFile]::OpenRead($zip)
    try {
      $roots=@($archive.Entries | Where-Object {$_.FullName -match '^[^/]+/manager-foot/index.html$'})
      if($roots.Count -ne 1){throw 'Le ZIP GitHub ne contient pas le jeu complet.'}
      $prefix=$roots[0].FullName.Substring(0,$roots[0].FullName.Length-'index.html'.Length)
      foreach($entry in $archive.Entries) {
        if(-not $entry.FullName.StartsWith($prefix) -or $entry.Name -eq ''){continue}
        $rel=$entry.FullName.Substring($prefix.Length)
        if($rel -match '(^|/)(\.\.|donnees_jeu|\.runtime|\.git)(/|$)' -or $rel.Contains(':') -or $rel.Contains('\')){throw 'Chemin non autorisé dans le code téléchargé.'}
        $dest=Join-Path $stage $rel
        New-Item -ItemType Directory -Force ([IO.Path]::GetDirectoryName($dest)) | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$dest,$true)
      }
    } finally {$archive.Dispose()}
    foreach($f in @('index.html','outils\lanceur.py','outils\serveur.py','Lancer_Manager_Foot.bat')){if(-not(Test-Path (Join-Path $stage $f))){throw ('Code incomplet : '+$f)}}
    foreach($match in [regex]::Matches((Get-Content (Join-Path $stage 'index.html') -Raw), '(?:src|href)=["'']([^"'']+\.(?:js|mjs|css))(?:\?[^"'']*)?["'']')) {
      $asset=$match.Groups[1].Value
      if($asset -notmatch '^https?://' -and -not(Test-Path (Join-Path $stage $asset))){throw ('Ressource du jeu absente : '+$asset)}
    }
    $Python=@(Get-Python $Destination);$prefix=@();if($Python.Count -gt 1){$prefix=$Python[1..($Python.Count-1)]}
    # Les données, images personnelles et sauvegardes ne sont pas dans le code mis à jour.
    $backup=Join-Path $Destination 'donnees_jeu\retour_bootstrap';$changed=@()
    try {
      foreach($f in Get-ChildItem $stage -File -Recurse) {
        $rel=$f.FullName.Substring($stage.Length+1);$dest=Join-Path $Destination $rel;$old=Join-Path $backup $rel;$existed=Test-Path $dest
        if($existed){New-Item -ItemType Directory -Force ([IO.Path]::GetDirectoryName($old))|Out-Null;Copy-Item $dest $old -Force}
        $changed+=,@($dest,$old,$existed)
        New-Item -ItemType Directory -Force ([IO.Path]::GetDirectoryName($dest))|Out-Null;Copy-Item $f.FullName $dest -Force
      }
    } catch {
      foreach($change in $changed){if($change[2]){Copy-Item $change[1] $change[0] -Force}else{Remove-Item $change[0] -Force -ErrorAction SilentlyContinue}};throw
    }
    New-Item -ItemType Directory -Force (Join-Path $Destination 'donnees_jeu') | Out-Null
    $meta=Join-Path $Destination 'donnees_jeu\launcher_state.json';$state=@{}
    if(Test-Path $meta){$previous=Get-Content $meta -Raw|ConvertFrom-Json;foreach($p in $previous.PSObject.Properties){$state[$p.Name]=$p.Value}}
    $state['code_commit']=$commit;$state|ConvertTo-Json -Depth 10|Set-Content -Encoding UTF8 $meta
    try {
      $w=New-Object -ComObject WScript.Shell;$shortcut=$w.CreateShortcut((Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'BOOBAST Manager Foot.lnk'))
      $shortcut.TargetPath=Join-Path $Destination 'Lancer_Manager_Foot.bat';$shortcut.WorkingDirectory=$Destination;$shortcut.Save()
    } catch {Write-Host ('Lanceur disponible : '+(Join-Path $Destination 'Lancer_Manager_Foot.bat'))}
    $argsGame=@((Join-Path $Destination 'outils\lanceur.py'),'--sans-maj')
    if($PackUrl){$argsGame+=@('--pack-url',$PackUrl)};if($Pack){$argsGame+=@('--pack',$Pack)};if($SansLancer){$argsGame+='--installer-seul'}
    & $Python[0] @prefix @argsGame
    if($LASTEXITCODE -ne 0){throw ('Installation incomplète (code '+$LASTEXITCODE+'). Relance le même raccourci : les fichiers valides sont conservés.')}
  } finally {Remove-Item $temporary -Force -Recurse -ErrorAction SilentlyContinue}
} catch {Write-Error ('BOOBAST : '+$_.Exception.Message);throw}
