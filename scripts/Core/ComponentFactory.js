/**
 * Component Factory
 * Creates components with proper dependency injection
 * Manages component lifecycle and initialization
 */
class ComponentFactory {
    constructor(container) {
        this.container = container;
        this.components = new Map();
        this.logger = container.get('logger');
    }

    /**
     * Create a component instance with dependency injection
     * @param {string} componentName - Name of the component to create
     * @param {string} componentId - Unique identifier for this component instance
     * @param {Object} options - Additional configuration options
     * @returns {Object} Component instance
     */
    createComponent(componentName, componentId = null, options = {}) {
        const id = componentId || `${componentName}-${Date.now()}`;
        
        this.logger.info('Creating component', { componentName, componentId: id });

        let component;

        switch (componentName) {
            case 'PracticeSessionComponent':
                component = this.createPracticeSessionComponent(options);
                break;
                
            case 'HighlightingComponent':
                component = this.createHighlightingComponent(options);
                break;
                
            case 'ScoreManagementComponent':
                component = this.createScoreManagementComponent(options);
                break;
                
            case 'FocusModeComponent':
                component = this.createFocusModeComponent(options);
                break;
                
            default:
                throw new Error(`Unknown component type: ${componentName}`);
        }

        // Store component reference
        this.components.set(id, {
            instance: component,
            name: componentName,
            created: Date.now(),
            options
        });

        this.logger.info('Component created successfully', { componentName, componentId: id });
        return component;
    }

    /**
     * Create Practice Session Component
     */
    createPracticeSessionComponent(options) {
        const PracticeSessionComponent = window.PracticeSessionComponent;
        if (!PracticeSessionComponent) {
            throw new Error('PracticeSessionComponent class not loaded');
        }

        // Create scoped container for this component
        const scopedContainer = this.container.createScope();
        
        // Add component-specific services if needed
        if (options.customTimer) {
            scopedContainer.register('timer', () => options.customTimer);
        }

        return new PracticeSessionComponent(scopedContainer);
    }

    /**
     * Create Highlighting Component
     */
    createHighlightingComponent(options) {
        // Placeholder for future highlighting component
        const scopedContainer = this.container.createScope();
        
        return {
            container: scopedContainer,
            init() {
                this.highlightingService = this.container.get('highlightingService');
                this.stateManager = this.container.get('stateManager');
                this.logger = this.container.get('logger');
                
                this.logger.info('Highlighting component initialized');
            },
            destroy() {
                this.logger.info('Highlighting component destroyed');
            }
        };
    }

    /**
     * Create Score Management Component
     */
    createScoreManagementComponent(options) {
        // Placeholder for future score management component
        const scopedContainer = this.container.createScope();
        
        return {
            container: scopedContainer,
            init() {
                this.scoreService = this.container.get('scoreManagementService');
                this.stateManager = this.container.get('stateManager');
                this.logger = this.container.get('logger');
                
                this.logger.info('Score management component initialized');
            },
            destroy() {
                this.logger.info('Score management component destroyed');
            }
        };
    }

    /**
     * Create Focus Mode Component
     */
    createFocusModeComponent(options) {
        // Placeholder for future focus mode component
        const scopedContainer = this.container.createScope();
        
        return {
            container: scopedContainer,
            init() {
                this.stateManager = this.container.get('stateManager');
                this.logger = this.container.get('logger');
                
                // Subscribe to focus mode changes
                this.subscription = this.stateManager.subscribe('ui.focusMode', (focusMode) => {
                    this.onFocusModeChanged(focusMode);
                });
                
                this.logger.info('Focus mode component initialized');
            },
            
            onFocusModeChanged(focusMode) {
                this.logger.info('Focus mode changed', { focusMode });
                document.body.classList.toggle('focus-mode', focusMode);
            },
            
            destroy() {
                if (this.subscription) {
                    this.subscription.unsubscribe();
                }
                this.logger.info('Focus mode component destroyed');
            }
        };
    }

    /**
     * Get an existing component instance
     * @param {string} componentId - Component identifier
     * @returns {Object|null} Component instance or null if not found
     */
    getComponent(componentId) {
        const componentData = this.components.get(componentId);
        return componentData ? componentData.instance : null;
    }

    /**
     * Destroy a component and clean up resources
     * @param {string} componentId - Component identifier
     * @returns {boolean} True if component was destroyed, false if not found
     */
    destroyComponent(componentId) {
        const componentData = this.components.get(componentId);
        if (!componentData) {
            this.logger.warn('Cannot destroy component: not found', { componentId });
            return false;
        }

        this.logger.info('Destroying component', { 
            componentId, 
            componentName: componentData.name 
        });

        // Call destroy method if available
        if (typeof componentData.instance.destroy === 'function') {
            try {
                componentData.instance.destroy();
            } catch (error) {
                this.logger.error('Error during component destruction', error);
            }
        }

        // Remove from registry
        this.components.delete(componentId);
        
        this.logger.info('Component destroyed successfully', { componentId });
        return true;
    }

    /**
     * Destroy all components
     */
    destroyAllComponents() {
        this.logger.info('Destroying all components', { count: this.components.size });

        const componentIds = Array.from(this.components.keys());
        for (const componentId of componentIds) {
            this.destroyComponent(componentId);
        }
    }

    /**
     * Get list of all active components
     * @returns {Array} Array of component info objects
     */
    getActiveComponents() {
        return Array.from(this.components.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            created: data.created,
            options: data.options
        }));
    }

    /**
     * Initialize application components
     * This is called during application startup to create essential components
     */
    initializeApplicationComponents() {
        this.logger.info('Initializing application components');

        try {
            // Create practice session component
            const practiceComponent = this.createComponent('PracticeSessionComponent', 'main-practice-session');
            
            // Create focus mode component
            const focusComponent = this.createComponent('FocusModeComponent', 'main-focus-mode');
            focusComponent.init();

            this.logger.info('Application components initialized successfully');
            
            return {
                practiceSession: practiceComponent,
                focusMode: focusComponent
            };

        } catch (error) {
            this.logger.error('Failed to initialize application components', error);
            throw error;
        }
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentFactory;
} else if (typeof window !== 'undefined') {
    window.ComponentFactory = ComponentFactory;
}

export default ComponentFactory;
