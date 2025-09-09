/**
 * Mock Event Bus for Testing
 * Provides a testable implementation of IEventBus for unit tests
 */

// Import IEventBus interface (we'll need to reference it)
class MockEventBus {
  constructor(logger = null) {
    this._listeners = new Map();
    this._emitted = [];
    this._lastEvents = new Map();
    // Use injected logger or default to console
    this._logger = logger || {
      error: (...args) => console.error(...args),
      warn: (...args) => console.warn(...args),
      info: (...args) => console.log(...args),
      debug: (...args) => console.log(...args)
    };
  }

  on(eventName, callback, context) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }
    this._listeners.get(eventName).push({ callback, context });
    return this;
  }

  once(eventName, callback, context) {
    const onceCallback = (data) => {
      this.off(eventName, onceCallback, context);
      callback.call(context || this, data);
    };
    return this.on(eventName, onceCallback, context);
  }

  off(eventName, callback, context) {
    if (!this._listeners.has(eventName)) return this;

    const listeners = this._listeners.get(eventName);
    const filtered = listeners.filter(listener =>
      !(listener.callback === callback &&
        (!context || listener.context === context))
    );

    if (filtered.length === 0) {
      this._listeners.delete(eventName);
    } else {
      this._listeners.set(eventName, filtered);
    }

    return this;
  }

  emit(eventName, data) {
    this._emitted.push({ eventName, data, timestamp: Date.now() });
    this._lastEvents.set(eventName, data);

    if (this._listeners.has(eventName)) {
      const listeners = this._listeners.get(eventName);
      listeners.forEach(listener => {
        try {
          listener.callback.call(listener.context || this, data);
        } catch (error) {
          this._logger.error(`MockEventBus: Error in listener for ${eventName}:`, error);
        }
      });
    }

    return this;
  }

  getLast(eventName) {
    return this._lastEvents.get(eventName);
  }

  clear(eventName) {
    if (eventName) {
      this._listeners.delete(eventName);
      this._lastEvents.delete(eventName);
    } else {
      this._listeners.clear();
      this._lastEvents.clear();
      this._emitted = [];
    }
    return this;
  }

  // Mock implementations for cloud methods
  connectToCloud(hubUrl, options = {}) {
    this._emitted.push({
      eventName: 'cloud:connect',
      data: { hubUrl, options },
      timestamp: Date.now()
    });
    return Promise.resolve(true);
  }

  disconnectFromCloud() {
    this._emitted.push({
      eventName: 'cloud:disconnect',
      data: {},
      timestamp: Date.now()
    });
  }

  isCloudConnected() {
    return false; // Mock always returns false
  }

  // Mock-specific methods
  getEmittedEvents() {
    return [...this._emitted];
  }

  getListeners(eventName) {
    return eventName ? this._listeners.get(eventName) || [] : this._listeners;
  }

  reset() {
    this.clear();
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockEventBus;
}

if (typeof window !== 'undefined') {
  window.MockEventBus = MockEventBus;
}
