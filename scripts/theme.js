/**
 * Theme Management for PlayTime Practice
 * Handles dark/light mode toggle with localStorage persistence
 */

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.sunIcon = document.getElementById('sun-icon');
        this.moonIcon = document.getElementById('moon-icon');
        this.body = document.body;
        
        this.init();
    }
    
    init() {
        // Load saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('playTime-theme') || 'light';
        this.setTheme(savedTheme, false); // false = don't save to localStorage again
        
        // Add event listener for theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('playTime-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light', false);
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
            if (this.sunIcon) this.sunIcon.classList.add('hidden');
            if (this.moonIcon) this.moonIcon.classList.remove('hidden');
        } else {
            this.body.classList.remove('dark');
            if (this.sunIcon) this.sunIcon.classList.remove('hidden');
            if (this.moonIcon) this.moonIcon.classList.add('hidden');
        }
        
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
