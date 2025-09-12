# Event Bus Migration Strategy

## 📊 **Current Event System Analysis**

### **Events Currently Declared (10+ events)**
```javascript
// From scripts/constants.js
EVENTS = {
  CONFIDENCE_CHANGED: 'playtime:confide## 🚀 **Expected Benefits**

### **Immediate Benefits (Week 1)**
- ✅ **Easier testing**: EventBus mocking vs DOM mocking
- ✅ **Cleaner code**: Centralized event management
- ✅ **Better debugging**: Event logging and inspection
- ✅ **Memory management**: Systematic listener cleanup

### **Cross-Platform Benefits (Future)**
- ✅ **iOS ready**: EventBus interface works with UIKit notifications
- ✅ **Business logic portable**: Services use EventBus, not DOM
- ✅ **Platform abstraction**: Easy to swap WebEventBus for NativeEventBus

### **Cloud Synchronization Benefits (Future)**
- ✅ **Real-time sync**: SignalR integration for cross-device synchronization
- ✅ **Offline resilience**: Local events queue when cloud disconnected
- ✅ **Multi-device support**: Share practice sessions across devices
- ✅ **Collaborative features**: Real-time annotation sharing,
  LAYOUT_CHANGED: 'playtime:layout-changed',
  PAGE_CHANGED: 'playtime:page-changed',
  SCORE_SELECTED: 'playtime:score-selected',
  SCORE_CREATED: 'playtime:score-created',
  SCORE_SELECT_COMMAND: 'playtime:score-select-command',
  HIGHLIGHT_ANNOTATION_REQUESTED: 'playtime:highlight-annotation-requested',
  HIGHLIGHT_ANNOTATION_SAVED: 'playtime:highlight-annotation-saved',
  HIGHLIGHT_ANNOTATION_CANCELLED: 'playtime:highlight-annotation-cancelled',
  // Plus additional events found in codebase:
  // - playtime:practice-session-start
  // - playtime:practice-session-exit
  // - playtime:highlight-focus-requested
  // - playtime:highlight-focus-exited
  // - playtime:practice-plan-saved
  // - playtime:practice-plan-updated
  // - playtime:initialized
}
```

### **Current Usage Patterns**
- **Direct DOM coupling**: `window.dispatchEvent()`, `document.dispatchEvent()`
- **Inconsistent targets**: Mix of `window` and `document`
- **Manual event construction**: `new CustomEvent(eventName, { detail })`
- **Global listeners**: `window.addEventListener('playtime:*', handler)`
- **Event buffer system**: Already exists in `constants.js` for late subscribers

### **Problems Identified**
1. **Testing difficulty**: Direct DOM events hard to mock in unit tests
2. **Inconsistent patterns**: Mix of window/document targets
3. **No centralized management**: Events scattered across modules
4. **Cross-platform blocker**: DOM-specific patterns prevent iOS port
5. **Memory leaks**: No systematic cleanup of event listeners

## 🎯 **Migration Strategy**

### **Phase 1: Event Bus Infrastructure (Week 1, 3 hours)**

#### **Step 1.1: Create EventBus Interface**
- ✅ **COMPLETED**: `scripts/core/EventBus.js` created
- ✅ **TESTS COMPLETED**: 36/37 tests passing (1 DOM test skipped in Node.js environment)
- **Features**:
  - `IEventBus` interface for cross-platform contract
  - `WebEventBus` implementation with DOM compatibility
  - `MockEventBus` for testing
  - Factory function for different environments

#### **Step 1.2: Register EventBus in DI Container**
```javascript
// scripts/Core/ServiceContainer.js
register('eventBus', () => new WebEventBus());
```

#### **Step 1.3: Add EventBus to PlayTimeApplication**
```javascript
// scripts/Core/PlayTimeApplication.js
constructor() {
  this.eventBus = new WebEventBus();
  // Expose globally for backward compatibility
  window.PlayTimeEventBus = this.eventBus;
}
```

### **Phase 2: Core Module Migration (Week 1, 5 hours)**

#### **Step 2.1: Migrate PlayTimeApplication.js**
**Current patterns**:
```javascript
// OLD: Direct DOM events
window.dispatchEvent(new CustomEvent('playtime:confidence-changed', { detail: { color } }));
document.dispatchEvent(new CustomEvent('playtime:initialized', { detail: { application: this } }));
```

**New patterns**:
```javascript
// NEW: EventBus abstraction
this.eventBus.emit('playtime:confidence-changed', { color });
this.eventBus.emit('playtime:initialized', { application: this });
```

#### **Step 2.2: Migrate Practice Planner**
**Current patterns**:
```javascript
// OLD: Direct DOM listener
window.addEventListener('playtime:score-selected', this.handleScoreSelected.bind(this));
```

**New patterns**:
```javascript
// NEW: EventBus with cleanup
this.eventBus.on('playtime:score-selected', this.handleScoreSelected, this);
```

#### **Step 2.3: Update Constants.js Integration**
```javascript
// scripts/constants.js - Add EventBus integration
if (typeof window !== 'undefined' && window.PlayTimeEventBus) {
  // Bridge existing event buffer to EventBus
  const eventBus = window.PlayTimeEventBus;

  // Override dispatchEvent to use EventBus
  const originalDispatch = window.dispatchEvent;
  window.dispatchEvent = function(event) {
    if (event.type.startsWith('playtime:')) {
      eventBus.emit(event.type, event.detail);
    }
    return originalDispatch.call(this, event);
  };
}
```

### **Phase 3: Testing Migration (Week 2, 6 hours)**

#### **Step 3.1: Update Unit Tests**
**Current mocking**:
```javascript
// OLD: Complex DOM mocking
global.window.dispatchEvent = jest.fn();
global.window.addEventListener = jest.fn();
```

**New mocking**:
```javascript
// NEW: Simple EventBus mocking
const mockEventBus = new MockEventBus();
container.register('eventBus', () => mockEventBus);
```

#### **Step 3.2: Update Integration Tests**
**Current setup**:
```javascript
// OLD: DOM event simulation
window.dispatchEvent(new CustomEvent('playtime:layout-changed'));
```

**New setup**:
```javascript
// NEW: EventBus direct calls
eventBus.emit('playtime:layout-changed');
```

#### **Step 3.3: Add EventBus-specific Tests**
```javascript
// Test EventBus functionality
describe('EventBus', () => {
  it('should emit and receive events', () => {
    const eventBus = new MockEventBus();
    const callback = jest.fn();

    eventBus.on('test:event', callback);
    eventBus.emit('test:event', { data: 'test' });

    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

### **Phase 4: Module-by-Module Migration (Week 2, 6 hours)**

#### **Step 4.1: Migrate Highlighting System**
**Files to update**:
- `scripts/highlighting/highlighting.js`
- `scripts/highlighting/HighlightEventCoordinator.js`
- `scripts/highlighting/HighlightPersistenceService.js`

#### **Step 4.2: Migrate Layout System**
**Files to update**:
- `scripts/layout/layout-commands.js`
- `scripts/layout/focus-mode-handler.js`

#### **Step 4.3: Migrate Practice System**
**Files to update**:
- `scripts/Practice/practice-session-manager.js`
- `scripts/Practice/practice-session-starter.js`

### **Phase 5: Cleanup & Optimization (Week 2, 2 hours)**

#### **Step 5.1: Remove Legacy Patterns**
- Remove direct `window.dispatchEvent` calls
- Remove direct `window.addEventListener` calls for playtime:* events
- Update documentation

#### **Step 5.2: Performance Optimization**
```javascript
// EventBus performance optimizations
class OptimizedEventBus extends WebEventBus {
  constructor() {
    super();
    this._emitQueue = [];
    this._isEmitting = false;
  }

  emit(eventName, data) {
    // Batch rapid events
    this._emitQueue.push({ eventName, data });

    if (!this._isEmitting) {
      this._processQueue();
    }
  }

  async _processQueue() {
    this._isEmitting = true;

    while (this._emitQueue.length > 0) {
      const event = this._emitQueue.shift();
      await super.emit(event.eventName, event.data);
    }

    this._isEmitting = false;
  }
}
```

### **Phase 6: Cloud Synchronization (Future Feature)**

#### **SignalR Integration Architecture**
```javascript
// Future CloudEventBus usage
const eventBus = createEventBus('cloud');

// Connect to Azure SignalR service
await eventBus.connectToCloud('https://playtime-signalr.azurewebsites.net/hub', {
  accessTokenFactory: () => getAuthToken(),
  transport: signalR.HttpTransportType.WebSockets
});

// Events now sync across all connected devices
eventBus.emit('playtime:highlight-created', highlightData);
// -> Automatically sent to cloud and broadcast to other devices
```

#### **Cloud Event Flow**
1. **Local Event**: User creates highlight on device A
2. **Cloud Sync**: EventBus sends to SignalR hub
3. **Broadcast**: Hub broadcasts to all connected devices
4. **Remote Update**: Device B receives and updates UI
5. **Conflict Resolution**: Timestamp-based conflict resolution

#### **Offline Resilience**
- **Queue Events**: When offline, events queue locally
- **Auto-Reconnect**: Automatic reconnection with exponential backoff
- **Sync on Connect**: Bulk sync queued events when connection restored
- **Conflict Handling**: Server-side conflict resolution for concurrent edits

## 📈 **Expected Benefits**

### **Immediate Benefits (Week 1)**
- ✅ **Easier testing**: EventBus mocking vs DOM mocking
- ✅ **Cleaner code**: Centralized event management
- ✅ **Better debugging**: Event logging and inspection
- ✅ **Memory management**: Systematic listener cleanup

### **Cross-Platform Benefits (Future)**
- ✅ **iOS ready**: EventBus interface works with UIKit notifications
- ✅ **Business logic portable**: Services use EventBus, not DOM
- ✅ **Platform abstraction**: Easy to swap WebEventBus for NativeEventBus

### **Performance Benefits**
- ✅ **Reduced DOM coupling**: Fewer DOM traversals
- ✅ **Better memory management**: Explicit listener lifecycle
- ✅ **Event batching**: Optimized for high-frequency events

## 🔧 **Implementation Timeline**

### **Week 1: Foundation (8 hours)**
- [x] Create EventBus interface and implementations (3h)
- [ ] Register EventBus in DI container (1h)
- [ ] Migrate PlayTimeApplication.js (2h)
- [ ] Migrate Practice Planner (2h)

### **Week 2: Migration & Testing (12 hours)**
- [ ] Update unit tests to use EventBus mocking (3h)
- [ ] Update integration tests (3h)
- [ ] Migrate remaining modules (4h)
- [ ] Cleanup legacy patterns (2h)

### **Week 3-4: Validation & Polish (8 hours)**
- [ ] Full test suite validation
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Cross-platform interface validation

## 🎯 **Success Metrics**

### **Technical Metrics**
- ✅ **Test mocking**: Reduce from 25 lines to 3 lines for event setup
- ✅ **Event consistency**: 100% events use EventBus (0 direct DOM events)
- ✅ **Memory leaks**: 0 event listener leaks in tests
- ✅ **Cross-platform readiness**: EventBus interface platform-agnostic

### **Developer Experience**
- ✅ **Debugging**: Event inspection and logging
- ✅ **Testing**: Simple EventBus mocking
- ✅ **Development**: Consistent event patterns
- ✅ **Maintenance**: Centralized event management

## 🚨 **Risk Mitigation**

### **Backward Compatibility**
- EventBus emits DOM events for existing listeners
- Global `window.PlayTimeEventBus` exposure
- Gradual migration approach

### **Testing Strategy**
- MockEventBus for unit tests
- Integration tests validate end-to-end
- Performance tests for event throughput

### **Rollback Plan**
- Keep DOM event system as fallback
- Feature flags for EventBus vs DOM events
- Gradual rollout with monitoring

## 📋 **Migration Checklist**

### **Pre-Migration**
- [x] EventBus interface created
- [ ] All current events documented
- [ ] Test coverage baseline established
- [ ] Performance benchmarks taken

### **Migration Phase**
- [ ] DI container updated
- [ ] Core modules migrated
- [ ] Tests updated
- [ ] Integration validated

### **Post-Migration**
- [ ] Legacy patterns removed
- [ ] Documentation updated
- [ ] Performance validated
- [ ] Cross-platform interface ready

This migration transforms PlayTime's event system from a DOM-coupled, hard-to-test system into a clean, cross-platform abstraction that enables better testing, maintainability, and future iOS development.
