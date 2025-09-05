/**
 * Simple Service Container for Dependency Injection
 * Eliminates global window dependencies and enables clean testing
 */
class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.instances = new Map();
    }

    /**
     * Register a service with the container
     * @param {string} name - Service identifier
     * @param {Function} factory - Factory function that creates the service
     * @param {Object} options - Configuration options
     * @param {boolean} options.singleton - Whether to create only one instance
     * @param {Array<string>} options.dependencies - Array of dependency names
     */
    register(name, factory, options = {}) {
        if (typeof factory !== 'function') {
            throw new Error(`Service factory for '${name}' must be a function`);
        }

        this.services.set(name, {
            factory,
            singleton: options.singleton || false,
            dependencies: options.dependencies || []
        });

        return this;
    }

    /**
     * Register a singleton service
     * @param {string} name - Service identifier  
     * @param {Function} factory - Factory function
     * @param {Array<string>} dependencies - Dependency names
     */
    singleton(name, factory, dependencies = []) {
        return this.register(name, factory, { singleton: true, dependencies });
    }

    /**
     * Get a service instance
     * @param {string} name - Service identifier
     * @returns {*} Service instance
     */
    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' is not registered`);
        }

        const service = this.services.get(name);

        // Return existing singleton instance if available
        if (service.singleton && this.instances.has(name)) {
            return this.instances.get(name);
        }

        // Resolve dependencies
        const dependencies = this.resolveDependencies(service.dependencies);
        
        // Create instance
        const instance = service.factory(...dependencies);

        // Store singleton instance
        if (service.singleton) {
            this.instances.set(name, instance);
        }

        return instance;
    }

    /**
     * Resolve an array of dependency names to instances
     * @param {Array<string>} dependencyNames - Array of service names
     * @returns {Array} Array of resolved service instances
     */
    resolveDependencies(dependencyNames) {
        return dependencyNames.map(name => this.get(name));
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service identifier
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Remove a service registration
     * @param {string} name - Service identifier
     */
    remove(name) {
        this.services.delete(name);
        this.instances.delete(name);
    }

    /**
     * Clear all services and instances
     */
    clear() {
        this.services.clear();
        this.instances.clear();
    }

    /**
     * Get all registered service names
     * @returns {Array<string>}
     */
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }

    /**
     * Create a scoped container that inherits from this one
     * Useful for request-scoped services or testing
     * @returns {ServiceContainer}
     */
    createScope() {
        const scope = new ServiceContainer();
        
        // Copy service registrations (but not instances)
        for (const [name, service] of this.services) {
            scope.services.set(name, service);
        }
        
        return scope;
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceContainer;
} else if (typeof window !== 'undefined') {
    window.ServiceContainer = ServiceContainer;
}
