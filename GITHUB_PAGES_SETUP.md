# GitHub Pages Setup Guide for PlayTime

## Automatic Setup (Recommended)

### Step 1: Push the deployment workflow
The deployment workflow has been created in `.github/workflows/deploy.yml`. When you push to the main branch, it will automatically build and deploy your app.

### Step 2: Enable GitHub Pages in your repository
1. Go to your repository on GitHub: https://github.com/ronheywood/playtime
2. Click on **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Save the settings

### Step 3: Push your changes and deploy
```bash
git add .
git commit -m "Add GitHub Pages deployment workflow and build tools"
git push origin main
```

## What happens next?

1. **Automatic Build**: When you push to main, GitHub Actions will:
   - Install dependencies
   - Run all tests
   - Build the application (create the `dist` folder)
   - Deploy to GitHub Pages

2. **Your app will be live at**: `https://ronheywood.github.io/playtime`

3. **Automatic updates**: Every push to main will trigger a new deployment

## Manual Setup (Alternative)

If you prefer to build locally and push the built files:

### Option A: Deploy dist folder to gh-pages branch
```bash
# Build locally
npm run build

# Install gh-pages utility
npm install -g gh-pages

# Deploy dist folder to gh-pages branch
gh-pages -d dist
```

### Option B: Use a separate repository for GitHub Pages
1. Create a new repository named `ronheywood.github.io`
2. Copy contents of `dist` folder to that repository
3. Push to enable GitHub Pages

## Troubleshooting

### Build fails in GitHub Actions
- Check the Actions tab for error details
- Ensure all tests pass locally: `npm test`
- Verify build works locally: `npm run build`

### Page not loading correctly
- Check that GitHub Pages is configured to use "GitHub Actions" as source
- Verify the app works locally by serving the dist folder:
  ```bash
  cd dist
  npx http-server . -p 8080
  ```

### Custom domain (optional)
If you want to use a custom domain:
1. Add a `CNAME` file to the `dist` folder during build
2. Configure DNS to point to `ronheywood.github.io`
3. Update repository settings to use custom domain

## Current Status

✅ Build tools configured
✅ Deployment workflow created
✅ Local build tested and working
⏳ Ready to push and enable GitHub Pages

## Next Steps

1. Commit and push these changes
2. Enable GitHub Pages in repository settings
3. Your app will be live in a few minutes!

---

**Note**: The first deployment might take 5-10 minutes. Subsequent deployments are usually faster (1-3 minutes).
