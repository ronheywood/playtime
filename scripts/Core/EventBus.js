/**
 * Event Bus Interface and Implementation
 * Provides cross-platform event abstraction for PlayTime
 */

// Event Bus Interface (cross-platform contract)
class IEventBus {
  /**
   * Subscribe to an event
   * @param {string} eventName - Event name
   * @param {function} callback - Event handler function
   * @param {object} context - Optional context for handler
   */
  on(eventName, callback, context) {}

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} eventName - Event name
   * @param {function} callback - Event handler function
   * @param {object} context - Optional context for handler
   */
  once(eventName, callback, context) {}

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {function} callback - Event handler function
   * @param {object} context - Optional context for handler
   */
  off(eventName, callback, context) {}

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {*} data - Event data/payload
   */
  emit(eventName, data) {}

  /**
   * Get the last emitted data for an event
   * @param {string} eventName - Event name
   * @returns {*} Last event data
   */
  getLast(eventName) {}

  /**
   * Clear all listeners for an event or all events
   * @param {string} eventName - Optional event name to clear
   */
  clear(eventName) {}

  /**
   * FUTURE: Connect to cloud service for real-time synchronization
   * @param {string} hubUrl - SignalR hub URL
   * @param {object} options - Connection options
   */
  connectToCloud(hubUrl, options) {}

  /**
   * FUTURE: Disconnect from cloud service
   */
  disconnectFromCloud() {}

  /**
   * FUTURE: Check if connected to cloud service
   * @returns {boolean} Connection status
   */
  isCloudConnected() {}
}

// Web Event Bus Implementation
class WebEventBus extends IEventBus {
  constructor(logger = null) {
    super();
    this._listeners = new Map();
    this._lastEvents = new Map();
    // Handle both browser and Node.js environments
    this._target = (typeof window !== 'undefined') ? window :
                   (typeof global !== 'undefined') ? global : this;
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

    const listeners = this._listeners.get(eventName);
    const listener = { callback, context };

    listeners.push(listener);

    // Also register with DOM for backward compatibility (if available)
    if (this._target && typeof this._target.addEventListener === 'function') {
      this._target.addEventListener(eventName, (event) => {
        callback.call(context || this, event);
      });
    }

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
    // Store last event data
    this._lastEvents.set(eventName, data);

    // Create and dispatch DOM event for backward compatibility (if available)
    if (typeof CustomEvent !== 'undefined' && this._target && typeof this._target.dispatchEvent === 'function') {
      try {
        const event = new CustomEvent(eventName, { detail: data });
        this._target.dispatchEvent(event);
      } catch (error) {
          this._logger.error(`EventBus: Failed to dispatch event ${eventName}:`, error);
      }
    }

    // Also call registered listeners directly
    if (this._listeners.has(eventName)) {
      const listeners = this._listeners.get(eventName);
      listeners.forEach(listener => {
        try {
          listener.callback.call(listener.context || this, data);
        } catch (error) {
          this._logger.error(`EventBus: Error in listener for ${eventName}:`, error);
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
    }
    return this;
  }

  // FUTURE: Cloud synchronization methods (SignalR integration)
  connectToCloud(hubUrl, options = {}) {
    // Placeholder for future SignalR integration
    this._logger.warn('Cloud synchronization not yet implemented. This is a future feature.');
    return Promise.resolve(false);
  }

  disconnectFromCloud() {
    // Placeholder for future SignalR integration
    this._logger.warn('Cloud synchronization not yet implemented. This is a future feature.');
  }

  isCloudConnected() {
    // Placeholder for future SignalR integration
    return false;
  }
}

// FUTURE: Cloud Event Bus Implementation (SignalR integration)
class CloudEventBus extends WebEventBus {
  constructor(logger = null) {
    super(logger);
    this._cloudConnection = null;
    this._hubUrl = null;
    this._isConnected = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 5;
  }

  async connectToCloud(hubUrl, options = {}) {
    try {
      // FUTURE: SignalR integration
      // This would load SignalR library and establish connection
      // const connection = new signalR.HubConnectionBuilder()
      //   .withUrl(hubUrl, options)
      //   .withAutomaticReconnect()
      //   .build();

      // For now, simulate connection
      this._hubUrl = hubUrl;
      this._isConnected = true;
      this._cloudConnection = {}; // Placeholder

      this._logger.info(`Cloud EventBus connected to ${hubUrl}`);

      // FUTURE: Set up cloud event handlers
      // connection.on('ReceiveEvent', (eventName, data) => {
      //   this._handleCloudEvent(eventName, data);
      // });

      return true;
    } catch (error) {
      this._logger.error('Failed to connect to cloud:', error);
      this._isConnected = false;
      return false;
    }
  }

  disconnectFromCloud() {
    if (this._cloudConnection) {
      // FUTURE: SignalR disconnect
      // this._cloudConnection.stop();
      this._cloudConnection = null;
      this._isConnected = false;
      this._hubUrl = null;
      this._logger.info('Cloud EventBus disconnected');
    }
  }

  isCloudConnected() {
    return this._isConnected;
  }

  emit(eventName, data) {
    // Emit locally first
    super.emit(eventName, data);

    // FUTURE: Also emit to cloud if connected
    if (this._isConnected && this._cloudConnection) {
      try {
        // FUTURE: SignalR send
        // this._cloudConnection.invoke('SendEvent', eventName, data);
        this._logger.info(`Cloud EventBus: Emitted ${eventName} to cloud`);
      } catch (error) {
        this._logger.error('Failed to emit to cloud:', error);
        // FUTURE: Implement retry logic
      }
    }

    return this;
  }

  _handleCloudEvent(eventName, data) {
    // FUTURE: Handle incoming cloud events
    // Only emit locally if not originated from this instance
    this._logger.info(`Cloud EventBus: Received ${eventName} from cloud`);
    super.emit(eventName, data);
  }

  _handleReconnect() {
    if (this._reconnectAttempts < this._maxReconnectAttempts && this._hubUrl) {
      this._reconnectAttempts++;
      this._logger.info(`Cloud EventBus: Attempting reconnect (${this._reconnectAttempts}/${this._maxReconnectAttempts})`);

      setTimeout(() => {
        this.connectToCloud(this._hubUrl);
      }, 1000 * this._reconnectAttempts); // Exponential backoff
    }
  }
}

// Factory function to create appropriate EventBus
function createEventBus(type = 'web', logger = null) {
  switch (type) {
    case 'web':
      return new WebEventBus(logger);
    case 'cloud':
      return new CloudEventBus(logger);
    default:
      return new WebEventBus(logger);
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IEventBus, WebEventBus, CloudEventBus, createEventBus };
}

if (typeof window !== 'undefined') {
  window.EventBus = { IEventBus, WebEventBus, CloudEventBus, createEventBus };
}
