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

            # Remove any existing IS_CHILD and ParentOnly definitions from child to prevent duplicates
            $childAppContent = $childAppContent -replace 'const\s+IS_CHILD\s*=\s*[^;]+;', ''
            $childAppContent = $childAppContent -replace 'const\s+ParentOnly\s*=\s*[^;]+;', ''

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

    # Write BREEAM homepage seed migration specifically for the BREEAM site
    if ($repoName -eq "breeamassessment") {
        Write-Log "Writing BREEAM-specific homepage seed migration..."
        $migrationDir = Join-Path $repoPath "supabase/migrations"
        if (-not (Test-Path $migrationDir)) {
            New-Item -ItemType Directory -Path $migrationDir -Force | Out-Null
        }
        $migrationPath = Join-Path $migrationDir "20260629000000_seed_breeam_homepage.sql"
        $sqlContent = @"
-- Seed BREEAM site settings if empty
INSERT INTO public.site_settings (id, site_name, site_url)
VALUES ('default', 'Breeam Assessment UK', 'https://breeamassessment.co.uk')
ON CONFLICT (id) DO NOTHING;

-- Seed BREEAM homepage
DO $$
DECLARE
    v_site_id TEXT;
    v_html_body TEXT := '<div class="space-y-20 pb-12">
  <!-- Hero Section -->
  <section class="relative bg-slate-900 text-white py-24 px-6 overflow-hidden">
    <div class="absolute inset-0 opacity-25 bg-[url(''https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'')] bg-cover bg-center"></div>
    <div class="relative max-w-5xl mx-auto space-y-6 text-center">
      <span class="inline-block text-xs font-bold uppercase tracking-widest text-orange-500">UK Sustainable Certification</span>
      <h1 class="text-4xl md:text-6xl font-extrabold font-display tracking-tight leading-tight max-w-4xl mx-auto">
        BREEAM Assessment & Sustainability Services
      </h1>
      <p class="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
        Expert BREEAM assessments, pre-assessments, and sustainability consulting to help you achieve environmental certification and enhance your building''s green credentials.
      </p>
      <div class="pt-4">
        <a href="#contact" class="inline-block bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-orange-500/25 hover:translate-y-[-2px] active:translate-y-0">
          Get in Touch
        </a>
      </div>
    </div>
  </section>

  <!-- Sectors We Serve -->
  <section class="max-w-6xl mx-auto px-6">
    <div class="text-center space-y-3 mb-12">
      <h2 class="text-3xl font-extrabold font-display text-slate-900">Sectors We Serve</h2>
      <p class="text-sm text-slate-500 max-w-xl mx-auto">
        We provide tailored sustainability solutions across commercial, residential, and industrial construction projects.
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">C</div>
        <h3 class="font-bold text-lg text-slate-900">Commercial</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          We specialize in commercial projects, providing solutions that cater to businesses of all sizes to create functional, compliant commercial spaces.
        </p>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">R</div>
        <h3 class="font-bold text-lg text-slate-900">Residential</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Our residential services focus on building and renovating homes that combine comfort, style, functionality, and high BREEAM ratings.
        </p>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">I</div>
        <h3 class="font-bold text-lg text-slate-900">Industrial</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          We provide industrial construction services designed to meet the specific needs of manufacturing, operations, and water use reduction.
        </p>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">M</div>
        <h3 class="font-bold text-lg text-slate-900">Management</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Our project management services ensure your sustainability and construction goals are completed on time and within budget.
        </p>
      </div>
    </div>
  </section>

  <!-- Core BREEAM Services -->
  <section class="bg-slate-50 py-16 px-6 border-t border-b border-slate-100">
    <div class="max-w-6xl mx-auto">
      <div class="text-center space-y-3 mb-12">
        <h2 class="text-3xl font-extrabold font-display text-slate-900">Our BREEAM Services</h2>
        <p class="text-sm text-slate-500 max-w-xl mx-auto">
          Comprehensive sustainability assessments and consultancy services for all stages of your building''s lifecycle.
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">BREEAM Consultant</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Guiding projects through sustainability standards, improving compliance, design efficiency, certification success, and environmental performance.
            </p>
          </div>
          <a href="/breeam-consultant" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">Pre-Assessment</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Evaluating building design early to provide a clear roadmap, improve sustainability, ensure compliance, and reduce long-term costs.
            </p>
          </div>
          <a href="/breeam-pre-assessment" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">New Construction Assessor</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Ensuring compliance, maximizing credits, reducing environmental impact, and achieving successful certification for new developments.
            </p>
          </div>
          <a href="/breeam-new-construction-assessor" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">BREEAM In-Use</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Evaluating existing operational buildings to improve sustainability, energy efficiency, occupant well-being, and long-term asset value.
            </p>
          </div>
          <a href="/breeam-in-use-assessments" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">Assessor London</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              London-based assessors providing local expertise to guide construction projects through successful certification and compliance.
            </p>
          </div>
          <a href="/breeam-assessor-london" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">Lifecycle Assessment (LCA)</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Evaluating environmental impacts across a building''s entire lifecycle to enable sustainable decisions, compliance, and carbon reduction.
            </p>
          </div>
          <a href="/lifecycle-assessment-lca-services" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQs Section -->
  <section class="max-w-4xl mx-auto px-6">
    <div class="text-center space-y-3 mb-12">
      <h2 class="text-3xl font-extrabold font-display text-slate-900">Frequently Asked Questions</h2>
      <p class="text-sm text-slate-500 max-w-xl mx-auto">
        Find answers to common questions about BREEAM assessments and building certifications in the UK.
      </p>
    </div>
    <div class="space-y-4">
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">What is a BREEAM assessment?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          A BREEAM assessment is a sustainability evaluation for buildings, measuring environmental performance across energy efficiency, water usage, waste management, and indoor environmental quality. It helps building owners reduce operating costs and enhance sustainability.
        </p>
      </details>
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">How does BREEAM work?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          BREEAM evaluates buildings at each stage of their lifecycle—from design to operation. Points are awarded across multiple sustainability categories, and the total score determines the certification level, ranging from Pass to Outstanding. This ensures compliance with recognized environmental standards.
        </p>
      </details>
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">Is BREEAM used in the UK?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          Yes, BREEAM is widely adopted across the UK and is the leading sustainability assessment method for buildings. Many commercial and residential developers use BREEAM to meet regulatory requirements and achieve energy efficiency and net zero goals.
        </p>
      </details>
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">How much does a BREEAM assessment cost?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          Costs vary depending on building size, type, complexity, and desired certification level. At BREEAM Assessment UK, we provide customised quotes to ensure accurate pricing and value for your project.
        </p>
      </details>
    </div>
  </section>
</div>';
BEGIN
    SELECT id::text INTO v_site_id FROM public.site_settings LIMIT 1;
    
    IF v_site_id IS NULL THEN
        v_site_id := 'default';
    END IF;

    -- Insert or update the homepage (slug: '')
    INSERT INTO public.imported_posts (
        site_id, 
        title, 
        slug, 
        type, 
        body, 
        render_mode, 
        status, 
        source,
        publish_date
    )
    VALUES (
        v_site_id,
        'BREEAM Assessment Services | Sustainable Certification UK',
        '',
        'page',
        v_html_body,
        'html',
        'published',
        'seed',
        now()
    )
    ON CONFLICT (site_id, slug) 
    DO UPDATE SET 
        body = EXCLUDED.body, 
        title = EXCLUDED.title,
        render_mode = EXCLUDED.render_mode,
        status = EXCLUDED.status,
        updated_at = now();
END $$;
"@
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($migrationPath, $sqlContent, $utf8NoBom)
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
