# PlayTime Deployment Guide

This guide covers multiple ways to package and deploy your PlayTime music practice application to various hosting providers.

## 🚀 Quick Start

### Option 1: Using PowerShell (Recommended for Windows)

```powershell
# Package the application
.\build.ps1 -Task Package

# Create deployable archive
.\build.ps1 -Task Archive
```

### Option 2: Using npm scripts

```bash
# Build the application
npm run build

# Create package for deployment
npm run package
```

### Option 3: Using Node.js build script (Cross-platform)

```bash
# Package the application
node build.js package

# Create archive ready for deployment
node build.js archive
```

## 📦 What Gets Packaged

The build process creates a `dist/` directory containing:

- `index.html` - Main application entry point
- `scripts/` - All JavaScript files
- `styles/` - All CSS files  
- `db/` - Database implementation files
- `web.config` - IIS server configuration
- `.htaccess` - Apache server configuration
- `package.json` - Distribution metadata
- `README.md` - Deployment instructions

## 🌐 Deployment Options

### Static Hosting Providers

#### Netlify
1. Run `npm run build` to create the dist folder
2. Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)
3. Or use Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir dist
   ```

#### Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run `npm run build`
3. Deploy: `vercel --prod`
4. The `vercel.json` file configures SPA routing and headers

#### GitHub Pages
1. Run `npm run build`
2. Copy contents of `dist/` to your GitHub Pages repository
3. Enable Pages in repository Settings > Pages

#### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login`
3. Run `npm run build`
4. Deploy: `firebase deploy`
5. The `firebase.json` file configures hosting settings

### Traditional Web Servers

#### Apache Server
1. Run `npm run build`
2. Upload contents of `dist/` to your web directory
3. The included `.htaccess` handles:
   - SPA routing (redirects to index.html)
   - GZIP compression
   - Cache headers
4. Ensure `mod_rewrite` and `mod_deflate` modules are enabled

#### IIS Server
1. Run `npm run build`
2. Upload contents of `dist/` to your web directory
3. The included `web.config` handles:
   - MIME type mappings
   - Default documents
   - 404 redirects to index.html
4. Ensure URL Rewrite module is installed

#### Nginx Server
1. Run `npm run build`
2. Use the included `nginx.conf` as a reference
3. Configure your server to serve files from `dist/`
4. Set up SPA routing to fallback to index.html

### Container Deployment

#### Docker
1. Use the included `Dockerfile`:
   ```bash
   docker build -t playtime .
   docker run -p 3000:3000 playtime
   ```

2. The Dockerfile:
   - Builds the application in a Node.js container
   - Serves files using Nginx
   - Includes security headers and caching
   - Runs as non-root user

#### Docker Compose
```yaml
version: '3.8'
services:
  playtime:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

## ⚙️ Configuration Files

The project includes configuration for popular hosting providers:

- `netlify.toml.template` - Netlify configuration (rename to `netlify.toml`)
- `vercel.json` - Vercel configuration
- `firebase.json` - Firebase Hosting configuration
- `Dockerfile` + `nginx.conf` - Docker/container deployment
- `web.config` - IIS configuration (auto-generated)
- `.htaccess` - Apache configuration (auto-generated)

## 🔐 Security Features

All deployment configurations include:

- **Content Security Policy** headers
- **X-Frame-Options** to prevent clickjacking
- **X-Content-Type-Options** to prevent MIME sniffing
- **X-XSS-Protection** for older browsers
- **Cache headers** for optimal performance

## 📊 Build Output

After running the build process, you'll see:

```
✅ Package created successfully in ./dist/
  📊 Total files: [count]
  💾 Package size: [size] KB
```

## 🚨 Troubleshooting

### Build Fails
- Ensure all tests pass: `npm test`
- Check Node.js version (>=16.0.0 required)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Deployment Issues
- **404 on refresh**: Ensure SPA routing is configured (redirect all routes to index.html)
- **CORS errors**: Serve from the same domain or configure CORS headers
- **Assets not loading**: Check that base path is configured correctly

### Performance Issues
- **Large bundle size**: The app is intentionally minimal, but you can further optimize by:
  - Minifying JavaScript (add build step)
  - Optimizing images (if any are added)
  - Using a CDN for external dependencies

## 📝 Customization

### Adding Build Steps
To add minification or other build steps, modify:

1. **PowerShell**: Add to the `Package` task in `psakefile.ps1`
2. **Node.js**: Add to the `packageApp` function in `build.js`
3. **npm**: Add pre/post scripts to `package.json`

### Environment Variables
For different deployment environments, you can:

1. Create environment-specific build scripts
2. Use different configuration files
3. Modify the build process to inject environment-specific values

## 🆘 Support

If you encounter issues:

1. Check the build output for specific error messages
2. Verify your hosting provider's requirements
3. Test the built application locally:
   ```bash
   cd dist
   npx http-server . -p 3000
   ```

## 📚 Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
