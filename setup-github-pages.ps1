#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Configure GitHub Pages for PlayTime repository

.DESCRIPTION
    This script helps configure GitHub Pages settings for automatic deployment.
    Requires GitHub CLI (gh) to be installed and authenticated.

.EXAMPLE
    .\setup-github-pages.ps1
#>

Write-Host "🚀 GitHub Pages Setup for PlayTime" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if gh CLI is available
try {
    $ghVersion = gh --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GitHub CLI found" -ForegroundColor Green
    } else {
        throw "GitHub CLI not found"
    }
} catch {
    Write-Host "❌ GitHub CLI not found. Please install it from: https://cli.github.com/" -ForegroundColor Red
    Write-Host "   Or follow the manual setup instructions in GITHUB_PAGES_SETUP.md" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a git repository
try {
    $gitRepo = git remote get-url origin 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git repository found: $gitRepo" -ForegroundColor Green
    } else {
        throw "Not a git repository"
    }
} catch {
    Write-Host "❌ Not in a git repository or no origin remote found" -ForegroundColor Red
    exit 1
}

# Check authentication
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GitHub CLI authenticated" -ForegroundColor Green
    } else {
        Write-Host "❌ GitHub CLI not authenticated. Please run: gh auth login" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ GitHub CLI authentication failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuring GitHub Pages..." -ForegroundColor Yellow

try {
    # Enable GitHub Pages with GitHub Actions source
    Write-Host "🔧 Enabling GitHub Pages with GitHub Actions source..." -ForegroundColor Blue
    
    # Note: GitHub CLI doesn't have direct pages configuration yet, so we'll provide instructions
    Write-Host "⚠️  GitHub CLI doesn't support pages configuration yet." -ForegroundColor Yellow
    Write-Host "   Please follow these manual steps:" -ForegroundColor White
    Write-Host ""
    Write-Host "   1. Go to your repository settings:" -ForegroundColor White
    Write-Host "      https://github.com/ronheywood/playtime/settings/pages" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   2. Under 'Source', select 'GitHub Actions'" -ForegroundColor White
    Write-Host ""
    Write-Host "   3. Save the settings" -ForegroundColor White
    Write-Host ""
    
    # Check if we should commit and push
    $hasChanges = git status --porcelain 2>$null
    if ($hasChanges) {
        Write-Host "📦 You have uncommitted changes. Would you like to commit and push them now?" -ForegroundColor Yellow
        $response = Read-Host "   Commit and push? (y/n)"
        
        if ($response -eq 'y' -or $response -eq 'Y') {
            Write-Host "📝 Committing changes..." -ForegroundColor Blue
            git add .
            git commit -m "Add GitHub Pages deployment workflow and packaging tools"
            
            Write-Host "⬆️  Pushing to GitHub..." -ForegroundColor Blue
            git push origin main
            
            Write-Host ""
            Write-Host "✅ Changes pushed successfully!" -ForegroundColor Green
            Write-Host "   Your deployment will start automatically." -ForegroundColor Green
            Write-Host "   Check progress at: https://github.com/ronheywood/playtime/actions" -ForegroundColor Cyan
        }
    } else {
        Write-Host "✅ No uncommitted changes found." -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🎉 Setup complete!" -ForegroundColor Green
    Write-Host "   Once GitHub Pages is enabled, your app will be available at:" -ForegroundColor White
    Write-Host "   https://ronheywood.github.io/playtime" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   First deployment typically takes 5-10 minutes." -ForegroundColor Yellow
    Write-Host "   Subsequent deployments are faster (1-3 minutes)." -ForegroundColor Yellow

} catch {
    Write-Host "❌ Configuration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
