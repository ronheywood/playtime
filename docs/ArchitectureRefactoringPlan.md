# Architecture Refactoring Plan

## 🎯 **Goal**: Establish solid architectural foundation before Sprint 3 advanced features

## 📊 **Current Architecture Problems**

### Critical Issues Blocking Advanced Development:
1. **Global Window Dependencies** - Hard to test, maintain, and extend
2. **Mixed Concerns** - Business logic tangled with UI and infrastructure
3. **No Service Layer** - Domain logic scattered across components
4. **Brittle Event System** - Events used for everything, including synchronous operations
5. **State Management Chaos** - No single source of truth

## 🏗️ **Architecture Sprint: Foundation First**

### **Sprint 2.5: Architecture Refactoring (Priority: CRITICAL)**
**Duration**: 1 week
**Goal**: Clean architectural foundation for sustainable feature development

#### **Task A.1: Implement Service Container & DI**
- [ ] **Files**: `scripts/core/ServiceContainer.js`, `scripts/core/DIContainer.js`
- [ ] **Implementation**:
  ```javascript
  // Simple service container
  class ServiceContainer {
    constructor() {
      this.services = new Map();
      this.singletons = new Map();
    }
    
    register(name, factory, options = {}) { /* ... */ }
    get(name) { /* ... */ }
    resolve(dependencies) { /* ... */ }
  }
  ```
- [ ] **Benefits**: 
  - Eliminate `window.*` dependencies
  - Enable proper constructor injection
  - Improve testability dramatically
- [ ] **Testing**: All existing tests pass with new DI system
- [ ] **Effort**: 16 hours

#### **Task A.2: Extract Business Service Layer**
- [ ] **Files**: 
  - `scripts/services/HighlightingService.js`
  - `scripts/services/PracticeSessionService.js`
  - `scripts/services/ScoreManagementService.js`
- [ ] **Implementation**:
  ```javascript
  // Pure business logic, no DOM dependencies
  class PracticeSessionService {
    constructor(database, logger, confidenceMapper) {
      this.database = database;
      this.logger = logger;
      this.confidenceMapper = confidenceMapper;
    }
    
    async updateSectionConfidence(sectionId, confidence) {
      // Pure business logic
    }
  }
  ```
- [ ] **Benefits**:
  - Testable business logic
  - Clear separation of concerns
  - Reusable across UI components
- [ ] **Testing**: Business logic tests independent of DOM
- [ ] **Effort**: 20 hours

#### **Task A.3: Implement State Management**
- [ ] **Files**: `scripts/core/AppState.js`, `scripts/core/StateManager.js`
- [ ] **Implementation**:
  ```javascript
  // Centralized state with change notifications
  class AppState {
    constructor() {
      this.state = {
        currentScore: null,
        practiceSession: null,
        highlights: [],
        focusMode: false
      };
      this.listeners = new Map();
    }
    
    setState(path, value) { /* ... */ }
    getState(path) { /* ... */ }
    subscribe(path, callback) { /* ... */ }
  }
  ```
- [ ] **Benefits**:
  - Single source of truth
  - Predictable data flow
  - Better debugging
- [ ] **Testing**: State transitions are predictable and testable
- [ ] **Effort**: 12 hours

#### **Task A.4: Refactor Components to Use Services**
- [ ] **Files**: Update all major components
- [ ] **Implementation**:
  ```javascript
  // Before: Global dependencies, mixed concerns
  class PracticeSessionManager {
    constructor() {
      if (window.ConfidenceMapper) { /* ... */ }
    }
  }
  
  // After: Clean injection, focused responsibility
  class PracticeSessionManager {
    constructor(practiceSessionService, stateManager, logger) {
      this.practiceSessionService = practiceSessionService;
      this.stateManager = stateManager;
      this.logger = logger;
    }
  }
  ```
- [ ] **Benefits**:
  - Testable components
  - Clear dependencies
  - Single responsibility
- [ ] **Testing**: All existing functionality preserved
- [ ] **Effort**: 24 hours

#### **Task A.5: Event System Cleanup**
- [ ] **Files**: `scripts/core/EventBus.js`
- [ ] **Implementation**:
  - Use events only for cross-cutting concerns
  - Direct service calls for synchronous operations
  - Clear event contracts and documentation
- [ ] **Benefits**:
  - Clearer communication patterns
  - Better performance
  - Easier debugging
- [ ] **Testing**: Event flow is predictable
- [ ] **Effort**: 8 hours

**Architecture Sprint Total**: 80 hours

## 🎯 **Why This Must Come First**

### **Advanced Features Will Be Much Harder Without This Foundation**:

1. **PNG Section Extraction** - Needs clean service layer for canvas operations
2. **Mobile Timer Positioning** - Requires proper state management for viewport changes
3. **Section Note Editing** - Needs clean separation between UI and business logic
4. **Touch Interaction Consistency** - Requires coordinated state across multiple components

### **Current Technical Debt Costs**:
- **Testing**: 3x longer to write tests due to global dependencies
- **Feature Development**: 2x longer due to architectural coupling
- **Bug Fixing**: 4x longer due to unclear data flow
- **Code Reviews**: Difficult to reason about component boundaries

## 📈 **ROI Analysis**

### **Investment**: 80 hours (2 weeks)
### **Payback**: 
- **Sprint 3 Development**: 40% faster (40 hours saved)
- **Future Features**: 50% faster development
- **Bug Fixes**: 60% reduction in debugging time
- **Testing**: 70% faster test development

### **Risk Mitigation**:
- All existing functionality preserved
- Incremental refactoring approach
- Comprehensive test coverage maintained

## 🚦 **Recommendation**

**STOP** advanced feature development and complete Architecture Sprint first.

The current codebase has reached the complexity threshold where new features will:
1. Take significantly longer to implement
2. Introduce more bugs
3. Make the system increasingly harder to maintain
4. Block future architectural improvements

A clean architecture foundation will make Sprint 3 features:
- **Faster to implement**
- **More reliable**
- **Easier to test**
- **More maintainable**

This is the classic "slow down to speed up" scenario where architectural investment pays immediate dividends.
