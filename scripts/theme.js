/**
 * Theme Management for PlayTime Practice
 * Handles dark/light mode toggle with localStorage persistence
 */

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.body = document.body;
        // Do not cache icon refs permanently because Lucide may replace the nodes
        this.sunIcon = null;
        this.moonIcon = null;
        
        this.init();
    }
    
    // Resolve current icon elements (works before and after lucide.createIcons)
    _resolveIconRefs() {
        this.sunIcon = document.getElementById('sun-icon')
            || document.querySelector('svg.lucide-sun')
            || document.querySelector('[data-lucide="sun"]');
        this.moonIcon = document.getElementById('moon-icon')
            || document.querySelector('svg.lucide-moon')
            || document.querySelector('[data-lucide="moon"]');
    }

    _applyIconVisibility(theme) {
        // Ensure we have fresh refs each call
        this._resolveIconRefs();
        const showMoon = theme === 'dark';
        const showSun = !showMoon;
        if (this.sunIcon) this.sunIcon.classList.toggle('hidden', !showSun);
        if (this.moonIcon) this.moonIcon.classList.toggle('hidden', !showMoon);
    }
    
    init() {
        // Initialize icon set before we try to toggle visibility
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons(); } catch (_) {}
        }

        // URL override for theme (e.g., ?theme=dark) used by headless capture scripts
        const params = new URLSearchParams(window.location.search);
        const urlTheme = params.get('theme');
        const isValidUrlTheme = urlTheme === 'dark' || urlTheme === 'light';

        // Load saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('playTime-theme') || 'light';
        const initialTheme = isValidUrlTheme ? urlTheme : savedTheme;
        // Do not persist when driven by URL param to avoid surprising users
        this.setTheme(initialTheme, !isValidUrlTheme);
        
        // Add event listener for theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('playTime-theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                this.setTheme(newTheme, false);
            }
        });
    }
    
    toggleTheme() {
        const currentTheme = this.body.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme, true);
    }
    
    setTheme(theme, saveToStorage = true) {
        if (theme === 'dark') {
            this.body.classList.add('dark');
        } else {
            this.body.classList.remove('dark');
        }
        
        // Update icon states (sun vs moon) safely with lucide
        this._applyIconVisibility(theme);
        
        if (saveToStorage) {
            localStorage.setItem('playTime-theme', theme);
        }
        
        // Ensure PDF viewer stays light for readability
        this.ensurePdfViewerLight();
        
        // Dispatch custom event for other components that might need to react
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }
    
    ensurePdfViewerLight() {
        // Ensure PDF canvas and related elements stay light for sheet music readability
        const pdfCanvas = document.getElementById('pdf-canvas');
        const pdfContainer = document.querySelector('.pdf-viewer-container');
        const selectionOverlay = document.querySelector('.selection-overlay');
        
        if (pdfCanvas) {
            pdfCanvas.style.backgroundColor = 'white';
        }
        
        if (pdfContainer) {
            pdfContainer.style.backgroundColor = 'white';
            pdfContainer.style.color = 'black';
        }
        
        if (selectionOverlay) {
            // Ensure selection overlay works in both themes
            selectionOverlay.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'; // blue with opacity
        }
    }
    
    getCurrentTheme() {
        return this.body.classList.contains('dark') ? 'dark' : 'light';
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// For backward compatibility, expose toggle function globally
function toggleDarkMode() {
    if (window.themeManager) {
        window.themeManager.toggleTheme();
    }
}
