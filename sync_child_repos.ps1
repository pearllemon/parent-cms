# PowerShell script to synchronize updates from the parent CMS repository to all child repositories
# Save this file as sync_child_repos.ps1 inside the parent-cms root directory.
# Usage: Run the script from the parent-cms root. It will clone missing child repos,
# copy updated files (excluding .git), commit, and push the changes.

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
$ParentPath = (Get-Location).Path               # Assume script is run from parent-cms root
$ChildReposPath = "F:/MCP For Pearl Lemon/Lovable Project/Childs-Sites"
$GitBaseUrl = "https://github.com/pearllemon"   # Adjust if your remote URL differs
$LogFile = Join-Path $ParentPath "sync_child_repos.log"

# Helper: Write timestamped message to console and log file
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

Write-Log "--- Starting sync of child repositories ---"

# Ensure child-repos directory exists (may be a symbolic link)
if (-Not (Test-Path $ChildReposPath)) {
    Write-Log "Creating missing child-repos directory at $ChildReposPath"
    New-Item -ItemType Directory -Path $ChildReposPath | Out-Null
}

# Iterate over each subdirectory (each child repo)
Get-ChildItem -Path $ChildReposPath -Directory | ForEach-Object {
    $repoName = $_.Name
    $repoPath = $_.FullName
    $gitDir = Join-Path $repoPath ".git"
    Write-Log "Processing child repo: $repoName"

    # Clone repo if .git does not exist
    if (-Not (Test-Path $gitDir)) {
        $remoteUrl = "$GitBaseUrl/$repoName.git"
        Write-Log "Cloning $repoName from $remoteUrl"
        git clone $remoteUrl $repoPath 2>&1 | ForEach-Object { Write-Log $_ }
    }

    # Synchronize files from parent to child repo, excluding .git in the source
    Write-Log "Synchronizing files to $repoName"
    $robocopyArgs = @(
        "$ParentPath",
        "$repoPath",
        "/E",          # copy subdirectories, including empty ones
        "/PURGE",      # delete files/dirs in destination that no longer exist in source
        "/XD", ".git", # exclude .git folder from source (parent repo)
        "/XF", "sync_child_repos.ps1" # do not copy the sync script itself
    )
    $rc = robocopy @robocopyArgs | ForEach-Object { Write-Log $_ }

    # Commit and push changes if there are any
    Set-Location $repoPath
    $status = git status --porcelain
    if ($status) {
        Write-Log "Changes detected in $repoName, committing..."
        git add -A | ForEach-Object { Write-Log $_ }
        git commit -m "Sync from parent CMS" | ForEach-Object { Write-Log $_ }
        git push origin main | ForEach-Object { Write-Log $_ }
    } else {
        Write-Log "No changes to commit for $repoName"
    }
    Set-Location $ParentPath
}

Write-Log "--- Sync completed ---"
