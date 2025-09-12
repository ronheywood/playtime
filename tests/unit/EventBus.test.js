/**
 * EventBus Unit Tests
 * Tests for IEventBus interface, WebEventBus, CloudEventBus implementations
 * and MockEventBus (imported from tests/helpers)
 */

const { IEventBus, WebEventBus, CloudEventBus, createEventBus } = require('../../scripts/Core/EventBus');
const MockEventBus = require('../helpers/MockEventBus');

describe('EventBus System', () => {

  describe('IEventBus Interface', () => {
    test('should define required interface methods', () => {
      const interfaceMethods = [
        'on', 'once', 'off', 'emit', 'getLast', 'clear',
        'connectToCloud', 'disconnectFromCloud', 'isCloudConnected'
      ];

      interfaceMethods.forEach(method => {
        expect(typeof IEventBus.prototype[method]).toBe('function');
      });
    });
  });

describe('WebEventBus', () => {
    let eventBus;

    beforeEach(() => {
      eventBus = new WebEventBus();
    });

    afterEach(() => {
      if (eventBus.clear) eventBus.clear();
    });

    test('should subscribe and emit events', () => {
      const callback = jest.fn();
      const testData = { message: 'test' };

      eventBus.on('test:event', callback);
      eventBus.emit('test:event', testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });

    test('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const testData = { value: 42 };

      eventBus.on('multi:event', callback1);
      eventBus.on('multi:event', callback2);
      eventBus.emit('multi:event', testData);

      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).toHaveBeenCalledWith(testData);
    });

    test('should support event context', () => {
      const context = { id: 'test-context' };
      const callback = jest.fn();

      eventBus.on('context:event', callback, context);
      eventBus.emit('context:event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should unsubscribe specific listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('unsubscribe:event', callback1);
      eventBus.on('unsubscribe:event', callback2);
      eventBus.off('unsubscribe:event', callback1);

      eventBus.emit('unsubscribe:event', {});

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should support once listeners', () => {
      const callback = jest.fn();

      eventBus.once('once:event', callback);
      eventBus.emit('once:event', { first: true });
      eventBus.emit('once:event', { second: true });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ first: true });
    });

    test('should store and retrieve last event data', () => {
      const firstData = { count: 1 };
      const secondData = { count: 2 };

      eventBus.emit('last:event', firstData);
      expect(eventBus.getLast('last:event')).toEqual(firstData);

      eventBus.emit('last:event', secondData);
      expect(eventBus.getLast('last:event')).toEqual(secondData);
    });

    test('should clear specific events', () => {
      const callback = jest.fn();

      eventBus.on('clear:event', callback);
      eventBus.on('keep:event', callback);
      eventBus.clear('clear:event');

      eventBus.emit('clear:event', {});
      eventBus.emit('keep:event', {});

      expect(callback).toHaveBeenCalledTimes(1); // Only keep:event
    });

    test('should clear all events', () => {
      const callback = jest.fn();

      eventBus.on('event1', callback);
      eventBus.on('event2', callback);
      eventBus.clear();

      eventBus.emit('event1', {});
      eventBus.emit('event2', {});

      expect(callback).not.toHaveBeenCalled();
    });

    // Skip DOM-specific tests in Node.js environment
    const isBrowserEnv = typeof window !== 'undefined' && typeof CustomEvent !== 'undefined';

    (isBrowserEnv ? test : test.skip)('should emit DOM events for backward compatibility', () => {
      const domCallback = jest.fn();
      window.addEventListener('dom:event', domCallback);

      eventBus.emit('dom:event', { dom: true });

      expect(domCallback).toHaveBeenCalled();
      const event = domCallback.mock.calls[0][0];
      expect(event.type).toBe('dom:event');
      expect(event.detail).toEqual({ dom: true });

      window.removeEventListener('dom:event', domCallback);
    });

    test('should handle cloud methods as placeholders', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await eventBus.connectToCloud('test-url');
      expect(result).toBe(false);

      eventBus.disconnectFromCloud();
      const connected = eventBus.isCloudConnected();
      expect(connected).toBe(false);

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    test('should accept and use injected logger', () => {
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
      };

      const eventBusWithLogger = new WebEventBus(mockLogger);

      // Test that logger is used for warnings
      eventBusWithLogger.connectToCloud('test-url');
      expect(mockLogger.warn).toHaveBeenCalledWith('Cloud synchronization not yet implemented. This is a future feature.');

      eventBusWithLogger.disconnectFromCloud();
      expect(mockLogger.warn).toHaveBeenCalledWith('Cloud synchronization not yet implemented. This is a future feature.');

      // Test that logger is used for errors
      const errorCallback = () => { throw new Error('Test error'); };
      eventBusWithLogger.on('error:test', errorCallback);
      eventBusWithLogger.emit('error:test', {});

      expect(mockLogger.error).toHaveBeenCalledWith('EventBus: Error in listener for error:test:', expect.any(Error));
    });
  });

  describe('MockEventBus', () => {
    let eventBus;

    beforeEach(() => {
      eventBus = new MockEventBus();
    });

    afterEach(() => {
      eventBus.reset();
    });

    test('should track emitted events', () => {
      eventBus.emit('track:event', { tracked: true });
      eventBus.emit('another:event', { value: 42 });

      const emitted = eventBus.getEmittedEvents();
      expect(emitted).toHaveLength(2);
      expect(emitted[0].eventName).toBe('track:event');
      expect(emitted[0].data).toEqual({ tracked: true });
      expect(emitted[1].eventName).toBe('another:event');
    });

    test('should provide listener information', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('listeners:event', callback1);
      eventBus.on('listeners:event', callback2);

      const listeners = eventBus.getListeners('listeners:event');
      expect(listeners).toHaveLength(2);

      const allListeners = eventBus.getListeners();
      expect(allListeners.has('listeners:event')).toBe(true);
    });

    test('should support cloud method mocks', async () => {
      const result = await eventBus.connectToCloud('mock-url', { option: 'test' });
      expect(result).toBe(true);

      eventBus.disconnectFromCloud();
      expect(eventBus.isCloudConnected()).toBe(false);

      const emitted = eventBus.getEmittedEvents();
      expect(emitted).toContainEqual(
        expect.objectContaining({
          eventName: 'cloud:connect',
          data: { hubUrl: 'mock-url', options: { option: 'test' } }
        })
      );
    });

    test('should reset properly', () => {
      eventBus.on('reset:event', jest.fn());
      eventBus.emit('reset:event', {});

      eventBus.reset();

      expect(eventBus.getListeners('reset:event')).toHaveLength(0);
      expect(eventBus.getEmittedEvents()).toHaveLength(0);
      expect(eventBus.getLast('reset:event')).toBeUndefined();
    });

    test('should accept and use injected logger', () => {
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
      };

      const eventBusWithLogger = new MockEventBus(mockLogger);

      // Test that logger is used for errors
      const errorCallback = () => { throw new Error('Test error'); };
      eventBusWithLogger.on('error:test', errorCallback);
      eventBusWithLogger.emit('error:test', {});

      expect(mockLogger.error).toHaveBeenCalledWith('MockEventBus: Error in listener for error:test:', expect.any(Error));
    });
  });

  describe('CloudEventBus', () => {
    let eventBus;

    beforeEach(() => {
      eventBus = new CloudEventBus();
    });

    afterEach(() => {
      eventBus.clear();
      eventBus.disconnectFromCloud();
    });

    test('should simulate cloud connection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await eventBus.connectToCloud('test-hub-url');
      expect(result).toBe(true);
      expect(eventBus.isCloudConnected()).toBe(true);

      expect(consoleSpy).toHaveBeenCalledWith('Cloud EventBus connected to test-hub-url');

      consoleSpy.mockRestore();
    });

    test('should handle cloud disconnection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      eventBus.disconnectFromCloud();
      expect(eventBus.isCloudConnected()).toBe(false);

      consoleSpy.mockRestore();
    });

    test('should emit to cloud when connected', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate connection
      eventBus.connectToCloud('test-url');

      eventBus.emit('cloud:event', { cloud: true });

      expect(consoleSpy).toHaveBeenCalledWith('Cloud EventBus: Emitted cloud:event to cloud');

      consoleSpy.mockRestore();
    });

    test('should not emit to cloud when disconnected', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      eventBus.emit('disconnected:event', { local: true });

      // Should not log cloud emission
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Cloud EventBus: Emitted disconnected:event to cloud')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createEventBus Factory', () => {
    test('should create WebEventBus by default', () => {
      const eventBus = createEventBus();
      expect(eventBus).toBeInstanceOf(WebEventBus);
    });

    test('should create WebEventBus explicitly', () => {
      const eventBus = createEventBus('web');
      expect(eventBus).toBeInstanceOf(WebEventBus);
    });

    test('should create CloudEventBus', () => {
      const eventBus = createEventBus('cloud');
      expect(eventBus).toBeInstanceOf(CloudEventBus);
    });

    test('should fallback to WebEventBus for unknown types', () => {
      const eventBus = createEventBus('unknown');
      expect(eventBus).toBeInstanceOf(WebEventBus);
    });

    test('should accept logger parameter in factory function', () => {
      const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
      };

      const webBus = createEventBus('web', mockLogger);
      expect(webBus).toBeInstanceOf(WebEventBus);
      expect(webBus._logger).toBe(mockLogger);

      const cloudBus = createEventBus('cloud', mockLogger);
      expect(cloudBus).toBeInstanceOf(CloudEventBus);
      expect(cloudBus._logger).toBe(mockLogger);
    });
  });

  describe('Cross-Implementation Compatibility', () => {
    const implementations = [
      { name: 'WebEventBus', factory: () => new WebEventBus() },
      { name: 'MockEventBus', factory: () => new MockEventBus() },
      { name: 'CloudEventBus', factory: () => new CloudEventBus() }
    ];

    implementations.forEach(({ name, factory }) => {
      describe(`${name} Interface Compliance`, () => {
        let eventBus;

        beforeEach(() => {
          eventBus = factory();
        });

        afterEach(() => {
          if (eventBus.clear) eventBus.clear();
          if (eventBus.disconnectFromCloud) eventBus.disconnectFromCloud();
        });

        test('should implement all IEventBus methods', () => {
          const requiredMethods = [
            'on', 'once', 'off', 'emit', 'getLast', 'clear',
            'connectToCloud', 'disconnectFromCloud', 'isCloudConnected'
          ];

          requiredMethods.forEach(method => {
            expect(typeof eventBus[method]).toBe('function');
          });
        });

        test('should handle basic event lifecycle', () => {
          const callback = jest.fn();
          const testData = { test: 'data' };

          eventBus.on('lifecycle:event', callback);
          eventBus.emit('lifecycle:event', testData);
          expect(eventBus.getLast('lifecycle:event')).toEqual(testData);

          eventBus.off('lifecycle:event', callback);
          eventBus.emit('lifecycle:event', { different: 'data' });
          expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
        });

        test('should handle cloud methods gracefully', async () => {
          // All implementations should handle cloud methods without throwing
          await expect(eventBus.connectToCloud('test')).resolves.not.toThrow();
          expect(() => eventBus.disconnectFromCloud()).not.toThrow();
          expect(typeof eventBus.isCloudConnected()).toBe('boolean');
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle callback errors gracefully', () => {
      const eventBus = new WebEventBus();
      const errorCallback = jest.fn(() => { throw new Error('Test error'); });
      const normalCallback = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('error:event', errorCallback);
      eventBus.on('error:event', normalCallback);

      eventBus.emit('error:event', {});

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'EventBus: Error in listener for error:event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      eventBus.clear();
    });

    test('should handle invalid event names', () => {
      const eventBus = new WebEventBus();

      expect(() => {
        eventBus.on('', jest.fn());
        eventBus.emit('', {});
      }).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle many listeners efficiently', () => {
      const eventBus = new WebEventBus();
      const callbacks = [];

      // Add many listeners
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        eventBus.on('performance:event', callback);
      }

      const startTime = Date.now();
      eventBus.emit('performance:event', { load: 'test' });
      const endTime = Date.now();

      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // All callbacks should be called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledWith({ load: 'test' });
      });

      eventBus.clear();
    });

    test('should handle rapid event emission', () => {
      const eventBus = new WebEventBus();
      const callback = jest.fn();

      eventBus.on('rapid:event', callback);

      // Emit many events rapidly
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('rapid:event', { count: i });
      }

      expect(callback).toHaveBeenCalledTimes(1000);
      eventBus.clear();
    });
  });
});
