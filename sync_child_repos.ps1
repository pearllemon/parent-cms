# PowerShell script to synchronize updates from the parent CMS repository to all child repositories
# Location: parent-cms/sync_child_repos.ps1

$ParentPath = (Get-Location).Path
$ChildReposPath = "F:/MCP For Pearl Lemon/Lovable Project/Childs-Sites"
$LogFile = Join-Path $ParentPath "sync_child_repos.log"

# Load GitHub PAT from .env file or environment
$GithubPat = ""
$EnvFile = Join-Path $ParentPath ".env"
$RootEnvFile = "F:/MCP For Pearl Lemon/Lovable Project/.env"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "VITE_GITHUB_PAT\s*=\s*(.*)") {
            $GithubPat = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
}
if (-not $GithubPat -and (Test-Path $RootEnvFile)) {
    Get-Content $RootEnvFile | ForEach-Object {
        if ($_ -match "GITHUB_PAT\s*=\s*(.*)") {
            $GithubPat = $Matches[1].Trim().Trim('"').Trim("'")
        }
        elseif ($_ -match "GITHUB_CLASSIC_TOKEN\s*=\s*(.*)") {
            $GithubPat = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
}
if (-not $GithubPat) {
    $GithubPat = $env:VITE_GITHUB_PAT
}
if (-not $GithubPat) {
    $GithubPat = $env:GITHUB_PAT
}

$GitBaseUrl = "https://github.com/pearllemon"
if ($GithubPat) {
    $GitBaseUrl = "https://oauth2:$($GithubPat)@github.com/pearllemon"
}

# Child Repos list
$ChildRepos = @(
    "real-estate-investment-advisor.co.uk",
    "personalinjurynycity.com",
    "trailrunningtours.co.uk",
    "thecoldemailagency.co.uk",
    "robloxgamedevelopment.uk",
    "bubbleteacatering.uk",
    "plcommercialcleaningservices.co.uk",
    "troncmasterservices.co.uk",
    "emailmarketingagency.uk",
    "event-management-company.uk",
    "lifeinsuranceleadgenagency.co.uk",
    "financialleadgenerationagency.co.uk",
    "plumbingleadgenerationagency.co.uk",
    "pl-commission-closers.com",
    "landlordslawyeruk",
    "realestatepropertymanagement.co.uk",
    "corporatecateringlondon.uk",
    "theleadgenerationagency.uk",
    "deepak-shukla",
    "breeamassessment"
)

# Helper: Write timestamped message to console and log file
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

Write-Log "--- Starting sync of child repositories ---"

# Ensure child-repos directory exists
if (-Not (Test-Path $ChildReposPath)) {
    Write-Log "Creating missing child-repos directory at $ChildReposPath"
    New-Item -ItemType Directory -Path $ChildReposPath | Out-Null
}

# 1. Read Parent Package.json dependencies
$parentPackagePath = Join-Path $ParentPath "package.json"
$parentPackage = Get-Content -Raw -Path $parentPackagePath | ConvertFrom-Json

foreach ($repoName in $ChildRepos) {
    $repoPath = Join-Path $ChildReposPath $repoName
    $gitDir = Join-Path $repoPath ".git"
    Write-Log "---------------------------------------------"
    Write-Log "Processing child repo: $repoName"
    Write-Log "---------------------------------------------"

    # Clone repo if .git does not exist
    if (-Not (Test-Path $gitDir)) {
        $remoteUrl = "$GitBaseUrl/$repoName.git"
        Write-Log "Cloning $repoName from $remoteUrl"
        git clone $remoteUrl $repoPath 2>&1 | ForEach-Object { Write-Log $_ }
        if (-Not (Test-Path $gitDir)) {
            Write-Log "Failed to clone $repoName. Skipping."
            continue
        }
    }

    # Pull latest changes first
    Set-Location $repoPath
    Write-Log "Pulling latest changes for $repoName"
    git pull origin main 2>&1 | ForEach-Object { Write-Log $_ }
    Set-Location $ParentPath

    # Synchronize CMS directories (overwrite/copy)
    $CmsDirs = @(
        "supabase",
        "src/cms-core",
        "src/cms-managed",
        "src/components/admin",
        "src/pages/admin",
        "src/admin-bundle",
        "src/lib"
    )

    foreach ($dir in $CmsDirs) {
        $srcDir = Join-Path $ParentPath $dir
        $destDir = Join-Path $repoPath $dir
        
        if (Test-Path $srcDir) {
            Write-Log "Syncing directory: $dir"
            if (-Not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir | Out-Null
            }
            # Copy all files, overwriting. Using robocopy for robustness.
            # Do NOT purge the destination if it has other files, but for these specific CMS dirs, we can mirror them.
            $robocopyArgs = @(
                "$srcDir",
                "$destDir",
                "/E",
                "/PURGE", # Mirrored exactly since these are 100% CMS directories
                "/XD", ".git"
            )
            robocopy @robocopyArgs | Out-Null
        }
    }

    # Synchronize specific CMS files
    $CmsFiles = @(
        "src/components/site/FormRenderer.tsx",
        "src/components/site/ThemeBlocksRenderer.tsx",
        "src/components/ThemeTokensInjector.tsx",
        "src/components/ComponentCloudSync.tsx",
        "src/components/PageTracker.tsx",
        "src/components/PopupManager.tsx",
        "src/components/RedirectsGate.tsx",
        "src/components/SiteHeadInjection.tsx",
        "src/components/PageSchemaInjector.tsx",
        "vite-plugin-cms-snapshot.ts",
        "vite.admin.config.ts"
    )

    foreach ($file in $CmsFiles) {
        $srcFile = Join-Path $ParentPath $file
        $destFile = Join-Path $repoPath $file
        if (Test-Path $srcFile) {
            Write-Log "Syncing file: $file"
            $destParent = Split-Path $destFile -Parent
            if (-Not (Test-Path $destParent)) {
                New-Item -ItemType Directory -Path $destParent | Out-Null
            }
            Copy-Item -Path $srcFile -Destination $destFile -Force
        }
    }

    # Safe merge package.json dependencies
    $childPackagePath = Join-Path $repoPath "package.json"
    if (Test-Path $childPackagePath) {
        Write-Log "Merging package.json dependencies..."
        $childPackage = Get-Content -Raw -Path $childPackagePath | ConvertFrom-Json
        
        # Merge dependencies
        if (-not $childPackage.dependencies) { $childPackage | Add-Member -MemberType NoteProperty -Name "dependencies" -Value (New-Object PSObject) }
        foreach ($prop in $parentPackage.dependencies.psobject.Properties) {
            if (-not $childPackage.dependencies.$($prop.Name) -or $childPackage.dependencies.$($prop.Name) -ne $prop.Value) {
                $childPackage.dependencies | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
            }
        }
        
        # Merge devDependencies
        if (-not $childPackage.devDependencies) { $childPackage | Add-Member -MemberType NoteProperty -Name "devDependencies" -Value (New-Object PSObject) }
        foreach ($prop in $parentPackage.devDependencies.psobject.Properties) {
            if (-not $childPackage.devDependencies.$($prop.Name) -or $childPackage.devDependencies.$($prop.Name) -ne $prop.Value) {
                $childPackage.devDependencies | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
            }
        }

        # Save merged package.json back safely without BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($childPackagePath, ($childPackage | ConvertTo-Json -Depth 100), $utf8NoBom)
    }

    # Append .admin-theme to index.css if not present
    $childCssPath = Join-Path $repoPath "src/index.css"
    if (Test-Path $childCssPath) {
        $cssContent = Get-Content -Raw -Path $childCssPath
        if (-not $cssContent.Contains(".admin-theme")) {
            Write-Log "Appending .admin-theme to src/index.css"
            $adminThemeCss = @"

/* Isolated Admin Theme */
.admin-theme {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%; 
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
"@
            Add-Content -Path $childCssPath -Value $adminThemeCss
        }
    }

    # Update App.tsx Routing and Imports
    $childAppPath = Join-Path $repoPath "src/App.tsx"
    $parentAppPath = Join-Path $ParentPath "src/App.tsx"
    if ((Test-Path $childAppPath) -and (Test-Path $parentAppPath)) {
        Write-Log "Updating App.tsx with parent admin routes..."
        $childAppContent = Get-Content -Raw -Path $childAppPath
        $parentAppContent = Get-Content -Raw -Path $parentAppPath

        # Extract admin imports from parent
        # Match from "import AdminShell" to the end of the admin imports block (e.g. GenericCRUD)
        if ($parentAppContent -match "(import AdminShell[\s\S]*?import GenericCRUD from[\s\S]*?;)") {
            $parentAdminImports = $Matches[1]
            
            # Append ParentOnly definition so it is available in child sites
            $parentAdminImports += "`n`nconst IS_CHILD = (import.meta.env.VITE_CMS_MODE || `"parent`") === `"child`";`nconst ParentOnly = ({ element }: { element: any }) => IS_CHILD ? <Navigate to=`"/admin`" replace /> : element;"

            # Replace admin imports in child App.tsx
            if ($childAppContent -match "(import AdminShell[\s\S]*?import GenericCRUD from[\s\S]*?;)") {
                $childAppContent = $childAppContent -replace [regex]::Escape($Matches[1]), $parentAdminImports
            } else {
                # Fallback: insert parent admin imports before the first Route or App definition
                $childAppContent = $parentAdminImports + "`n" + $childAppContent
            }
        }

        # Extract admin routes from parent
        # Match from "{/* Admin CMS */}" to the closing "</Route>" of the admin shell
        if ($parentAppContent -match "(\{\/\* Admin CMS \*\/\}[\s\S]*?<\/Route>)") {
            $parentAdminRoutes = $Matches[1]

            # Replace admin routes in child App.tsx
            if ($childAppContent -match "(\{\/\* Admin CMS \*\/\}[\s\S]*?<\/Route>)") {
                $childAppContent = $childAppContent -replace [regex]::Escape($Matches[1]), $parentAdminRoutes
            }
        }

        # Write updated App.tsx back
        $childAppContent | Out-File -FilePath $childAppPath -Encoding utf8
    }

    # Commit and push changes
    Set-Location $repoPath
    $status = git status --porcelain
    if ($status) {
        Write-Log "Changes detected in $repoName, committing..."
        git add -A | ForEach-Object { Write-Log $_ }
        git commit -m "Sync CMS from parent (non-destructive)" | ForEach-Object { Write-Log $_ }
        git push origin main | ForEach-Object { Write-Log $_ }
    } else {
        Write-Log "No changes to commit for $repoName"
    }
    Set-Location $ParentPath
}

Write-Log "--- Sync completed ---"
