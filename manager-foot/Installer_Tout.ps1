# ============================================================
#  Manager Foot : installation complete en une commande (Windows, PowerShell)
#  1. Installe Python s'il manque (winget).
#  2. Telecharge la derniere version du jeu depuis GitHub et la met a jour sans toucher a tes donnees
#     (donnees_jeu : base, photos, sauvegardes restent en place).
#  3. Lance l'installation de TOUT : base mondiale (pack Football_Monde le plus recent), Transfermarkt, ClubElo,
#     maillots, Wikidata (photos, logos, entraineurs), palmares, nationalites, visages des joueurs sans photo,
#     fiches FM26 detaillees (notes / attributs) de tous les joueurs des clubs, reserves et joueurs libres.
#  4. Cree un raccourci « Manager Foot » sur le Bureau, puis lance le jeu.
#
#  Utilisation (PowerShell) :
#    & ([scriptblock]::Create((irm https://raw.githubusercontent.com/Boobast29/BOOBAST/claude/tender-hawking-cnluv6/manager-foot/Installer_Tout.ps1)))
#  ou, depuis le dossier du jeu : double-clic sur Installer_Tout.bat (met a jour ce dossier-la)
#  Options : -Dossier "C:\Jeux\ManagerFoot"  -Branche "Manager-foot"  -Rapide (sans les longues collectes de fiches)
#            -Pack "C:\...\Football_Monde_JSON_Visuels_v12.zip"
# ============================================================
param(
  [string]$Dossier = "$env:USERPROFILE\ManagerFoot",
  [string]$Branche = "claude/tender-hawking-cnluv6",
  [string]$Pack = "",
  [switch]$Rapide
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
function Etape($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }

# ---------- 1. Python ----------
Etape "Verification de Python"
function TrouverPython {
  foreach ($c in @(@("py", "-3"), @("python"), @("python3"))) {
    $pre = @(); if ($c.Count -gt 1) { $pre = $c[1..($c.Count - 1)] }
    try { $v = & $c[0] @pre --version 2>&1; if ($LASTEXITCODE -eq 0 -and "$v" -match "Python 3") { return @{ exe = $c[0]; pre = $pre } } } catch {}
  }
  return $null
}
$py = TrouverPython
if (-not $py) {
  Write-Host "Python absent : installation via winget..."
  try {
    winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements --silent
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    $py = TrouverPython
  } catch {}
  if (-not $py) {
    Write-Host "Impossible d'installer Python automatiquement. Installe-le depuis https://www.python.org/downloads/ (coche 'Add python.exe to PATH'), puis relance ce script." -ForegroundColor Red
    Read-Host "Entree pour fermer"; exit 1
  }
}
$pyPre = $py.pre
Write-Host "Python OK : $(& $py.exe @pyPre --version)"

# ---------- 2. Jeu (telechargement ou mise a jour) ----------
Etape "Telechargement de la derniere version du jeu ($Branche)"
$tmp = Join-Path $env:TEMP ("managerfoot_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
$zip = Join-Path $tmp "jeu.zip"
$url = "https://github.com/Boobast29/BOOBAST/archive/refs/heads/$Branche.zip"
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $tmp -Force
$src = Get-ChildItem -Path $tmp -Directory | Where-Object { Test-Path (Join-Path $_.FullName "manager-foot\outils\tout_installer.py") } | Select-Object -First 1
if (-not $src) { Write-Host "Archive inattendue : dossier manager-foot introuvable." -ForegroundColor Red; Read-Host "Entree pour fermer"; exit 1 }
New-Item -ItemType Directory -Path $Dossier -Force | Out-Null
# copie sans effacer : donnees_jeu (base, photos, sauvegardes) n'est jamais touche
robocopy (Join-Path $src.FullName "manager-foot") $Dossier /E /XD donnees_jeu /NFL /NDL /NJH /NJS /NP | Out-Null
Remove-Item -Recurse -Force $tmp
Write-Host "Jeu installe dans $Dossier"

# ---------- 3. Tout installer ----------
Etape "Installation de tout (base, photos, logos, maillots, notes et fiches des joueurs reels...)"
Write-Host "Les collectes de fiches peuvent durer plusieurs heures la premiere fois. Tu peux arreter (Ctrl+C) et relancer : ca reprend ou ca s'etait arrete."
$arguments = @("outils\tout_installer.py", "--sans-lancer")
if ($Rapide) { $arguments += "--rapide" }
if ($Pack) { $arguments += @("--pack", $Pack) }
Push-Location $Dossier
try { & $py.exe @pyPre @arguments } finally { Pop-Location }

# ---------- 4. Raccourci et lancement ----------
Etape "Raccourci sur le Bureau"
try {
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath("Desktop")) "Manager Foot.lnk"))
  $lnk.TargetPath = Join-Path $Dossier "Lancer_Manager_Foot.bat"
  $lnk.WorkingDirectory = $Dossier
  $lnk.Save()
  Write-Host "Raccourci « Manager Foot » cree sur le Bureau."
} catch { Write-Host "Raccourci non cree (sans gravite)." }

Etape "Lancement du jeu"
Start-Process -FilePath (Join-Path $Dossier "Lancer_Manager_Foot.bat") -WorkingDirectory $Dossier
Write-Host "Termine. Bilan detaille : $Dossier\donnees_jeu\journal_installation.txt" -ForegroundColor Green
