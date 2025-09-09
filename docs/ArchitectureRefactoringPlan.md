# Architecture Refactoring Plan

## 🎯 **Goal**: Establish solid architectural foundation for sustainable web development with cross-platform options preserved

**Architecture Decision (Sep 9, 2025)**: Pragmatic hybrid approach based on expected value analysis
- **Investment**: Smart abstractions (8h) instead of full platform abstraction (24h)  
- **Expected Value**: +18 hours risk-adjusted return
- **Strategy**: Improve web development immediately while preserving cross-platform potential

## 📊 **Current Architecture Problems**

### Critical Issues Blocking Advanced Development:
1. **Global Window Dependencies** - Hard to test, maintain, and extend
2. **Mixed Concerns** - Business logic tangled with UI and infrastructure
3. **No Service Layer** - Domain logic scattered across components
4. **Brittle Event System** - Events used for everything, including synchronous operations
5. **State Management Chaos** - No single source of truth
6. **Template Complexity** - String concatenation HTML with embedded logic
7. **Event Binding Nightmare** - Manual DOM event management everywhere
8. **Component Reuse** - No component abstraction or reusability

## 🔧 **Framework Evaluation: Minimal Solutions for Maximum Impact**

### **Complexity Areas Requiring Framework Support**:

#### **1. Templating & Partials**
**Current Pain**: String concatenation with embedded logic
```javascript
// Current nightmare in practice-session-manager.js
dialog.innerHTML = `
    <h3>Section Complete!</h3>
    <div class="confidence-buttons">
        <button data-confidence="red" class="confidence-btn ${currentConfidence === 'red' ? 'active' : ''}">
            Needs Work
        </button>
        <!-- More template hell... -->
    </div>
`;
```

#### **2. Event Binding & DOM Management**  
**Current Pain**: Manual event listeners everywhere
```javascript
// Current approach - brittle and verbose
confidenceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Complex state management...
    });
});
```

#### **3. State/Data Binding**
**Current Pain**: Manual DOM updates and state synchronization
```javascript
// Current approach - error-prone
highlightElement.dataset.confidence = confidenceEnum.toString();
highlightElement.dataset.color = newConfidenceColor;
// ... manual class management
```

### **� Framework Recommendations: Minimal & Focused**

#### **Option A: Vanilla JS with Clean Patterns (RECOMMENDED)**
**Size**: 0KB framework overhead | **Learning Curve**: None | **Disruption**: Minimal

**Why Vanilla JS with Clean Patterns is Best**:
- **Cross-Platform Ready**: No framework lock-in means iOS port is straightforward
- **Pure Business Logic**: Services work identically across platforms
- **Replaceable UI Layer**: DOM utilities can be swapped for native UI
- **Zero Dependencies**: No framework version conflicts or security vulnerabilities
- **Maximum Performance**: No framework overhead or bundle size
- **Enforced Architecture**: No framework coupling forces clean separation

**Implementation Pattern**:
```javascript
// Cross-platform business service
class ConfidenceUpdateService {
  constructor(practiceSession, database, eventBus) {
    this.practiceSession = practiceSession;
    this.database = database;
    this.eventBus = eventBus;
  }
  
  async updateConfidence(sectionId, confidence) {
    // Pure business logic - works on any platform
    await this.database.updateSection(sectionId, { confidence });
    this.practiceSession.setConfidence(sectionId, confidence);
    this.eventBus.emit('confidence:updated', { sectionId, confidence });
  }
}

// Simple DOM utilities (web-specific but isolated and replaceable)
const DOM = {
  create: (tag, props) => Object.assign(document.createElement(tag), props),
  select: (selector) => document.querySelector(selector),
  updateText: (selector, text) => DOM.select(selector).textContent = text,
  toggleClass: (selector, className, condition) => 
    DOM.select(selector).classList.toggle(className, condition),
  show: (selector) => DOM.select(selector).classList.add('visible'),
  hide: (selector) => DOM.select(selector).classList.remove('visible')
};

// Web UI component (easily replaceable for native iOS)
class ConfidenceDialog {
  constructor(confidenceService) {
    this.service = confidenceService;
    this.initializeEvents();
  }
  
  initializeEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('.confidence-btn')) {
        this.handleConfidenceClick(e.target);
      }
    });
  }
  
  async handleConfidenceClick(button) {
    const confidence = button.dataset.confidence;
    const sectionId = this.currentSectionId;
    
    await this.service.updateConfidence(sectionId, confidence);
    this.hide();
  }
  
  show(sectionData) {
    this.currentSectionId = sectionData.id;
    DOM.updateText('#section-title', sectionData.title);
    DOM.show('#confidence-dialog');
  }
  
  hide() {
    DOM.hide('#confidence-dialog');
  }
}
```

**Benefits for Cross-Platform Strategy**:
- ✅ **Business Logic 100% Portable**: Services work identically on iOS
- ✅ **UI Layer Replaceable**: DOM utilities → UIKit is straightforward  
- ✅ **No Framework Migration**: No Alpine.js → React Native complexity
- ✅ **Clean Testing**: Pure services without framework dependencies
- ✅ **Zero Bundle Overhead**: No 15KB framework penalty

#### **Option B: Alpine.js (Cross-Platform Risk)**
**Size**: 15KB gzipped | **Learning Curve**: Minimal | **Cross-Platform**: ❌ Poor

**Why Alpine.js Creates Problems**:
- **Web-Specific Lock-in**: `x-data`, `x-text` patterns don't translate to iOS
- **Business Logic Contamination**: Alpine components mix UI and domain logic
- **Framework Migration Cost**: Switching to React Native requires full rewrite
- **Testing Complexity**: Alpine components harder to test than pure services

**Alpine.js Example (Shows the Problem)**:
```html
<!-- Alpine approach mixes concerns -->
<div x-data="{ 
  confidence: 'medium',
  async updateConfidence(level) {
    // Business logic mixed with UI component
    await fetch('/api/confidence', { 
      method: 'POST', 
      body: JSON.stringify({ level }) 
    });
    this.confidence = level;
  }
}">
  <button @click="updateConfidence('high')">High Confidence</button>
</div>
```

**Cross-Platform Issues**:
- Business logic embedded in `x-data` can't be reused on iOS
- `@click` event binding is web-specific
- Alpine's reactive state doesn't translate to UIKit
- No clear service layer separation

#### **Option C: Lit (Web Components)**
**Size**: 5KB gzipped | **Learning Curve**: Medium | **Cross-Platform**: ⚠️ Moderate

**Why Lit Has Mixed Value**:
- **Web Standards**: True web components are future-proof
- **Shadow DOM**: May complicate PDF.js canvas integration
- **Component Portability**: Concept translates but implementation doesn't

**Cross-Platform Assessment**:
- Component architecture concepts transfer to iOS
- Shadow DOM and custom elements are web-only
- Business logic can be extracted but requires discipline

### **🏆 RECOMMENDATION: Smart Abstractions + Vanilla JS Patterns**

**Revised Strategy**: 
1. **Essential Abstractions**: Event bus, storage interface, business logic extraction (immediate web benefits + cross-platform ready)
2. **Vanilla JS with Clean Patterns**: No framework lock-in, better cross-platform readiness
3. **Simple DOM Utilities**: Replaceable helper functions instead of framework coupling
4. **Document Portability Debt**: Track web-specific patterns for potential future migration

**Why No Framework**:
1. **Cross-Platform Readiness**: Business logic 100% portable, UI layer easily replaceable
2. **Zero Framework Lock-in**: Can add React/Vue/SwiftUI later without rewriting business logic  
3. **Simpler Testing**: Pure services are easier to test than framework components
4. **Smaller Bundle**: No 15KB framework overhead
5. **Enforced Separation**: No framework coupling forces clean architecture

**Implementation Pattern**:
```javascript
// Cross-platform ready business logic
class ConfidenceDialogService {
  constructor(eventBus, practiceSessionService) {
    this.eventBus = eventBus;
    this.practiceSessionService = practiceSessionService;
  }
  
  async completeSection(sectionId, confidence) {
    // Pure business logic - works on any platform
    await this.practiceSessionService.updateConfidence(sectionId, confidence);
    this.eventBus.emit('section:completed', { sectionId, confidence });
  }
}

// Simple, replaceable DOM utilities (web-specific but isolated)
class DOMHelper {
  static create(tag, props = {}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    return el;
  }
  
  static updateText(selector, text) {
    document.querySelector(selector).textContent = text;
  }
  
  static toggleClass(selector, className, condition) {
    document.querySelector(selector).classList.toggle(className, condition);
  }
}

// Web-specific UI layer (easily replaceable for iOS)
class ConfidenceDialogUI {
  constructor(service, domHelper) {
    this.service = service;
    this.dom = domHelper;
    this.initializeDOM();
  }
  
  initializeDOM() {
    // Simple DOM manipulation - no framework coupling
    this.dialog = document.getElementById('confidence-dialog');
    this.setupEventListeners();
  }
  
  show(sectionData) {
    this.dom.updateText('#section-title', sectionData.title);
    this.dialog.classList.add('visible');
  }
}
```

---

---

## 🎯 **TECHNICAL DEBT PRIORITY MATRIX (Impact vs Effort)**

### **QUICK WINS (High Impact, Low Effort) - DO FIRST**
1. **🚀 Extract File Upload Logic from PlayTimeApplication** 
   - **Impact**: 🔥🔥🔥 (Unblocks testing, enables feature development)
   - **Effort**: ⚡ 4 hours
   - **ROI**: 8.75x
   - **Blocks**: New file upload features, clean testing

2. **🚀 Eliminate Global Database Access (window.PlayTimeDB)**
   - **Impact**: 🔥🔥🔥 (Fixes architecture inconsistency, improves testing)
   - **Effort**: ⚡ 6 hours  
   - **ROI**: 5.83x
   - **Blocks**: Proper dependency injection, clean test patterns

### **HIGH-IMPACT PROJECTS (High Impact, Medium Effort) - DO SECOND**
3. **🔥 Fix Component Integration Testing Architecture**
   - **Impact**: 🔥🔥🔥🔥 (Reduces test complexity 80%, enables TDD)
   - **Effort**: ⚡⚡ 8 hours
   - **ROI**: 5.0x
   - **Blocks**: Sustainable testing, component reuse

4. **🔥 Implement Centralized State Management**
   - **Impact**: 🔥🔥🔥🔥 (Enables advanced features, fixes data flow)
   - **Effort**: ⚡⚡⚡ 12 hours
   - **ROI**: 3.67x
   - **Blocks**: PNG extraction, mobile features, complex UI

### **MAJOR INFRASTRUCTURE (High Impact, High Effort) - PLAN CAREFULLY**
5. **🔥 Implement Service Container & Dependency Injection**
   - **Impact**: 🔥🔥🔥🔥🔥 (Foundation for all future work)
   - **Effort**: ⚡⚡⚡⚡ 16 hours
   - **ROI**: 3.44x
   - **Blocks**: Everything - this is architectural foundation

6. **🔥 Extract Business Service Layer**
   - **Impact**: 🔥🔥🔥🔥🔥 (50% faster feature development)
   - **Effort**: ⚡⚡⚡⚡⚡ 20 hours
   - **ROI**: 2.75x
   - **Blocks**: Clean domain logic, advanced features

### **FRAMEWORK ENHANCEMENT (Medium Impact, Medium Effort) - DO LATER**
7. **Clean DOM Utilities & Patterns** (Vanilla JS approach)
   - **Impact**: 🔥🔥🔥 (Eliminates manual DOM manipulation without framework lock-in)
   - **Effort**: ⚡⚡ 8-10 hours
   - **ROI**: 3.0x
   - **Blocks**: Complex UI features, maintainable templates
   - **Cross-Platform Benefit**: UI patterns easily replaceable for iOS

## 📊 **RECOMMENDED EXECUTION SEQUENCE**

### **Week 1: Quick Wins (10 hours total)**
- Day 1-2: Extract File Upload Logic (4h) 
- Day 3-4: Eliminate Global Database Access (6h)
- **Result**: Clean architecture patterns established, testing improved

### **Week 2: High-Impact Projects (20 hours total)**  
- Day 1-2: Fix Component Integration Testing (8h)
- Day 3-5: Implement Centralized State Management (12h)
- **Result**: Sustainable testing, clean data flow

### **Week 3-4: Major Infrastructure (36 hours total)**
- Week 3: Implement Service Container & DI (16h)
- Week 4: Extract Business Service Layer (20h)
- **Result**: Solid architectural foundation

### **Week 5: Clean UI Patterns (Optional)**
- Vanilla JS DOM utilities for improved UI patterns
- **Result**: Modern, maintainable UI layer without framework lock-in

## 📋 **Detailed Framework Research Results**

### **Alpine.js Deep Dive**
**Bundle Size**: ~10KB gzipped | **Trust Score**: 6.6/10 | **Code Examples**: 364

**Key Features Addressing Our Complexity**:
- **Reactive Data Binding**: `x-data="{ confidence: 'medium' }"` eliminates manual state management
- **Declarative Events**: `@click="updateConfidence()"` replaces `addEventListener` patterns  
- **Template Directives**: `x-text`, `x-show`, `x-if`, `x-for` eliminate `innerHTML` manipulation
- **Component System**: `Alpine.data()` provides reusable component definitions
- **Progressive Enhancement**: Works with existing HTML structure

**Alpine vs Current Manual Approach**:
```html
<!-- Current: Manual DOM manipulation -->
<div id="practice-dialog">
  <span id="confidence-display"></span>
  <button onclick="updateConfidence()">Update</button>
</div>
<script>
function updateConfidence() {
  const display = document.getElementById('confidence-display');
  display.textContent = newValue; // Manual DOM update
}
</script>

<!-- Alpine: Declarative and reactive -->
<div x-data="{ confidence: 'medium', showDialog: false }">
  <span x-text="confidence"></span>
  <button @click="confidence = 'high'">Update</button>
  <div x-show="showDialog" x-transition>Dialog content</div>
</div>
```

### **Lit Analysis**
**Bundle Size**: 5KB gzipped | **Trust Score**: 7.8/10 | **Code Examples**: 350

**Strengths**:
- Web Components standard
- Excellent TypeScript support
- Scoped CSS with shadow DOM
- Reactive properties system

**Concerns for PlayTime**:
- Requires component architecture refactoring
- Shadow DOM may complicate PDF.js canvas integration
- Higher learning curve for web components

### **Stimulus Analysis**  
**Bundle Size**: ~8KB gzipped | **Trust Score**: 7.6/10 | **Code Examples**: 138

**Strengths**:
- Progressive enhancement philosophy
- Controller-based organization
- Excellent for server-rendered apps

**Concerns for PlayTime**:
- Less declarative than Alpine
- Requires more JavaScript structure
- Manual DOM updates still needed

### **Alpine.js Implementation Strategy**

#### **Phase 1: Practice Session Dialogs (Sprint 3.1)**
Replace manual DOM manipulation in practice completion dialogs:

```javascript
// Current: scripts/Practice/practice-session-manager.js
showSectionCompletionDialog(section) {
  const dialog = document.createElement('div');
  dialog.innerHTML = this.generateDialogHTML(section);
  // ... manual event binding, state management
}

// Alpine: Component definition
Alpine.data('practiceDialog', () => ({
  section: null,
  confidence: 'medium',
  showDialog: false,
  
  openDialog(sectionData) {
    this.section = sectionData;
    this.confidence = sectionData.confidence || 'medium';
    this.showDialog = true;
  },
  
  setConfidence(level) {
    this.confidence = level;
  },
  
  completeSection() {
    // Dispatch completion event with data
    this.$dispatch('section-completed', {
      section: this.section,
      confidence: this.confidence
    });
    this.showDialog = false;
  }
}));
```

# Current Structure Analysis

## What We Have Now:
```
/scripts/
├── practice/
│   ├── practice-session-manager.js    # 400+ lines of mixed concerns
│   ├── practice-session-starter.js
│   └── practice-plan-persistence-service.js
├── highlighting/
│   ├── highlighting.js                # DOM + business logic mixed
│   ├── HighlightElement.js
│   └── ConfidenceMapper.js
├── layout/
│   ├── pdf-viewer.js
│   └── focus-mode.js
├── score/
│   └── score-management.js
└── core/
    ├── main.js                        # Bootstrap script
    ├── logger.js
    └── database.js
```

## ✅ Update: DI Container & Database Provisioning (2025-09-06)

Status: Done (verified by tests and bootstrap)

Summary:
- The application now initializes a Service/DI container (`scripts/Core/Infrastructure/ServiceContainer.js` + `DIContainer.js`).
- The database is provided by the DI container as a registered singleton named `database`.
  - In the browser build the IndexedDB-backed implementation is used.
  - In the test environment the in-memory implementation (`scripts/db/MemoryDatabase.js`) is injected by tests via the DI container.
- `scripts/main.js` was refactored to create/initialize the database, initialize DI, then obtain the `database` from DI and pass it to modules instead of directly reading `window.PlayTimeDB`.

Why this matters:
- Avoids dynamic ES module imports in the Node/Jest test environment.
- Makes tests deterministic and fast by using an injected in-memory DB.
- Provides a clear migration path to remove global `window.PlayTimeDB` / `window.db` usages.

Quick checklist (current coverage):
- [x] DI container available at runtime (bootstrapped in `main.js`).
- [x] `database` registered in DI and returned by `diContainer.get('database')`.
- [x] Tests configured to inject `createMemoryDatabase` into the DI container (no dynamic imports during tests).
- [x] `main.js` uses DI-provided `database` locally and only exposes globals as a temporary compatibility layer.

Next immediate steps:
1. Replace remaining direct reads of `window.PlayTimeDB` and `window.db` across modules with constructor injection from DI (priority: high, small PRs).
2. Convert UI/global factory singletons (PDF viewer, score list, highlighting, layout commands) to DI registrations and constructor parameters.
3. Remove global fallbacks (`window.PlayTimeDB` / `window.db`) once all consumers accept DI-provided `database`.
4. Add a short migration guide in this document showing how to convert a component to accept a `database` via DI (example + test).

Verification: full test suite passed after the DI/database refactor (39 suites / 399 tests as of 2025-09-06).


## What We Want (Domain-Driven):
```
/scripts/
├── Practice/
│   ├── UI/                           # Alpine.js components
│   │   ├── PracticeSessionComponent.js
│   │   ├── ConfidenceDialogComponent.js
│   │   └── TimerComponent.js
│   ├── Application/                  # Use cases & orchestration
│   │   ├── PracticeSessionService.js
│   │   └── PracticeSessionManager.js
│   ├── Domain/                       # Business logic & entities
│   │   ├── PracticeSession.js
│   │   ├── PracticeSection.js
│   │   └── ConfidenceLevel.js
│   └── Infrastructure/               # Database & external services
│       ├── PracticePersistence.js
│       └── PracticeDatabase.js
├── Highlighting/
│   ├── UI/
│   ├── Application/
│   ├── Domain/
│   └── Infrastructure/
├── Score/
│   ├── UI/
│   ├── Application/
│   ├── Domain/
│   └── Infrastructure/
├── Layout/
│   ├── UI/
│   ├── Application/
│   ├── Domain/
│   └── Infrastructure/
└── Core/
    ├── Infrastructure/
    │   ├── ServiceContainer.js
    │   ├── StateManager.js
    │   ├── AppState.js
    │   └── EventSystem.js
    └── PlayTimeApplication.js        # Replaces main.js
```

# Architecture Migration Strategy

## Migration Phases

### Phase 1: Domain-Driven Structure Setup (Week 1)
**Goal**: Create new folder structure and move files without breaking functionality

#### Step 1.1: Create New Domain Structure ✅
```bash
mkdir -p scripts/Practice/{UI,Application,Domain,Infrastructure}
mkdir -p scripts/Highlighting/{UI,Application,Domain,Infrastructure}  
mkdir -p scripts/Score/{UI,Application,Domain,Infrastructure}
mkdir -p scripts/Layout/{UI,Application,Domain,Infrastructure}
mkdir -p scripts/Core/Infrastructure
```

#### Step 1.2: Move Core Infrastructure ✅
```bash
# Move our new architecture files
mv scripts/core/ServiceContainer.js scripts/Core/Infrastructure/
mv scripts/core/DIContainer.js scripts/Core/Infrastructure/
mv scripts/services/AppState.js scripts/Core/Infrastructure/
mv scripts/services/StateManager.js scripts/Core/Infrastructure/
mv scripts/services/EventSystemManager.js scripts/Core/Infrastructure/
mv scripts/PlayTimeApplication.js scripts/Core/
```

#### Step 1.3: Extract Practice Domain (Replace practice-session-manager.js)
```javascript
// scripts/Practice/Domain/PracticeSession.js
class PracticeSession {
    constructor(id, planId, scoreId, sections) {
        this.id = id;
        this.planId = planId;
        this.scoreId = scoreId;
        this.sections = sections;
        this.currentSection = 0;
        this.startTime = new Date();
        this.status = 'active';
    }
    
    moveToNextSection() {
        if (this.currentSection < this.sections.length - 1) {
            this.currentSection++;
            return true;
        }
        this.status = 'completed';
        return false;
    }
    
    getCurrentSection() {
        return this.sections[this.currentSection];
    }
    
    isComplete() {
        return this.status === 'completed';
    }
}

// scripts/Practice/Domain/PracticeSection.js  
class PracticeSection {
    constructor(highlightId, page, strategy, targetTime) {
        this.highlightId = highlightId;
        this.page = page;
        this.strategy = strategy;
        this.targetTime = targetTime;
        this.confidence = null;
        this.actualTime = null;
        this.notes = '';
    }
    
    complete(confidence, actualTime, notes = '') {
        this.confidence = confidence;
        this.actualTime = actualTime;
        this.notes = notes;
    }
}

// scripts/Practice/Application/PracticeSessionService.js
// Move business logic from practice-session-manager.js here

// scripts/Practice/Infrastructure/PracticePersistence.js  
// Move database operations from practice-session-manager.js here

// scripts/Practice/UI/PracticeSessionComponent.js
// Already created - this replaces the UI parts of practice-session-manager.js
```

### Phase 2: Migration Execution (Week 2)
**Goal**: Replace old files with new architecture one domain at a time

#### Step 2.1: Practice Domain Migration
1. **Extract from practice-session-manager.js**:
   - Business logic → `Practice/Application/PracticeSessionService.js`
   - Database operations → `Practice/Infrastructure/PracticePersistence.js`
   - Domain entities → `Practice/Domain/`
   - UI operations → `Practice/UI/PracticeSessionComponent.js`

2. **Update imports in dependent files**
3. **Create compatibility layer** for gradual migration
4. **Delete practice-session-manager.js** once fully migrated

#### Step 2.2: Update main.js → PlayTimeApplication.js
```javascript
// scripts/Core/PlayTimeApplication.js
class PlayTimeApplication {
    constructor() {
        this.container = new ServiceContainer();
        this.setupServices();
        this.initializeModules();
    }
    
    setupServices() {
        // Register all services with container
        this.container.register('practiceSessionService', PracticeSessionService);
        this.container.register('highlightingService', HighlightingService);
        // ... other services
    }
    
    initializeModules() {
        // Initialize each domain module
        this.practiceModule = new PracticeModule(this.container);
        this.highlightingModule = new HighlightingModule(this.container);
        this.scoreModule = new ScoreModule(this.container);
        this.layoutModule = new LayoutModule(this.container);
    }
    
    start() {
        // Start the application
        this.practiceModule.initialize();
        this.highlightingModule.initialize();
        this.scoreModule.initialize();
        this.layoutModule.initialize();
    }
}

// Update main.js to just bootstrap:
// main.js
import PlayTimeApplication from './Core/PlayTimeApplication.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new PlayTimeApplication();
    app.start();
});
```

### Phase 3: Alpine.js Integration (Week 3-4)
**Goal**: Replace manual DOM manipulation with Alpine.js in UI layer only

## File Deletion Checklist

### Files to Delete After Migration:
- [ ] `scripts/Practice/practice-session-manager.js` → Replaced by Practice domain
- [ ] `scripts/Practice/practice-session-starter.js` → Logic moved to PracticeSessionService
- [ ] `scripts/highlighting/highlighting.js` → Split into Highlighting domain
- [ ] `scripts/components/PracticeSessionComponent.js` → Moved to Practice/UI/
- [ ] `scripts/services/` folder → Moved to domain-specific Application layers
- [ ] `scripts/core/main.js` → Replaced by PlayTimeApplication.js

### Compatibility During Migration:
```javascript
// scripts/compatibility/legacy-exports.js
// Temporary compatibility layer during migration
window.PracticeSessionManager = function(logger, highlighting, timer, starter, persistence, database) {
    // Delegate to new architecture
    const container = window.app.container;
    return container.get('practiceSessionComponent');
};
```

## Boundary Enforcement Strategy

### Clear Dependency Rules:
1. **UI** can only import from **Application** layer (never Domain/Infrastructure)
2. **Application** can import **Domain** and **Infrastructure** 
3. **Domain** can only import other **Domain** entities (no external dependencies)
4. **Infrastructure** can import **Domain** for implementing interfaces

### Boundary Validation:
```javascript
// scripts/tools/boundary-check.js
// Tool to validate no cross-boundary imports
const validateBoundaries = (filePath, imports) => {
    const layer = getLayer(filePath);
    const invalidImports = imports.filter(imp => !isValidImport(layer, imp));
    if (invalidImports.length > 0) {
        throw new Error(`Boundary violation in ${filePath}: ${invalidImports}`);
    }
};
```

## Migration Execution Plan

### Week 1: Structure + Core
- [ ] Create folder structure
- [ ] Move Core infrastructure files  
- [ ] Update imports for Core files
- [ ] Test that application still boots

### Week 2: Practice Domain Migration  
- [ ] Extract Practice entities from practice-session-manager.js
- [ ] Create Practice/Application/PracticeSessionService.js
- [ ] Create Practice/Infrastructure/PracticePersistence.js
- [ ] Move Practice/UI/PracticeSessionComponent.js
- [ ] Update DI container to use new Practice services
- [ ] Delete practice-session-manager.js
- [ ] Test practice functionality

### Week 3: Other Domains
- [ ] Migrate Highlighting domain
- [ ] Migrate Score domain  
- [ ] Migrate Layout domain
- [ ] Delete old files

### Week 4: Alpine.js Integration
- [ ] Add Alpine.js to UI components
- [ ] Remove manual DOM manipulation
- [ ] Final cleanup and testing

This provides a concrete path from current messy architecture to clean domain-driven design with clear deletion checkpoints.

#### **Phase 2: Highlighting System (Sprint 3.2)**
Replace data-attribute state management with reactive properties:

```html
<div x-data="highlightManager()" class="pdf-container">
  <!-- Highlight overlay -->
  <div class="highlight-overlay">
    <template x-for="highlight in highlights" :key="highlight.id">
      <div :class="`highlight highlight--${highlight.confidence}`"
           :style="positionStyles(highlight.coords)"
           @click="selectHighlight(highlight)"
           x-show="highlight.visible"></div>
    </template>
  </div>
  
  <!-- Highlight editor -->
  <div x-show="selectedHighlight" x-transition class="highlight-editor">
    <div class="confidence-selector">
      <template x-for="level in ['low', 'medium', 'high']" :key="level">
        <button @click="updateHighlightConfidence(level)"
                :class="{ active: selectedHighlight.confidence === level }"
                x-text="level"></button>
      </template>
    </div>
  </div>
</div>
```

#### **Phase 3: PDF Viewer Integration (Sprint 3.3)**
Progressive enhancement of existing PDF.js integration:

```javascript
Alpine.data('pdfViewer', () => ({
  pages: [],
  currentPage: 1,
  loading: true,
  highlights: [],
  
  async initializePdfJs() {
    // Existing PDF.js initialization
    this.loading = false;
  },
  
  addHighlight(pageNumber, coords, confidence = 'medium') {
    this.highlights.push({
      id: Date.now(),
      pageNumber,
      coords,
      confidence,
      visible: true
    });
  },
  
  positionStyles(coords) {
    return {
      left: `${coords.x}px`,
      top: `${coords.y}px`,
      width: `${coords.width}px`,
      height: `${coords.height}px`
    };
  }
}));
```

### **Migration Benefits**

1. **Eliminates Manual DOM Manipulation**: 
   - No more `innerHTML` patterns (found 15+ instances)
   - No more manual `addEventListener` calls (found 25+ instances)

2. **Reactive State Management**: 
   - Automatic UI updates when data changes
   - Eliminates manual data-attribute synchronization

3. **Declarative Event Handling**: 
   - `@click` replaces manual event binding
   - Built-in event modifiers (`.prevent`, `.stop`, `.outside`)

4. **Component Organization**: 
   - `Alpine.data()` provides clean component boundaries
   - Reusable dialog and highlight components

5. **Maintains Performance**: 
   - 10KB bundle size is negligible
   - No virtual DOM overhead

6. **Progressive Enhancement**: 
   - Can be introduced incrementally
   - Existing functionality remains intact during migration

### **Implementation Timeline**

- **Sprint 3.1 (Week 1-2)**: Practice dialog Alpine migration
- **Sprint 3.2 (Week 3-4)**: Highlighting system reactive conversion  
- **Sprint 3.3 (Week 5-6)**: PDF viewer Alpine integration
- **Sprint 3.4 (Week 7-8)**: Cleanup remaining manual DOM patterns

This addresses the core complexity issues identified in the architecture analysis while maintaining PlayTime's lightweight philosophy and enabling sustainable development of advanced features.

---

## 🏗️ **Revised Architecture Sprint: Foundation + Framework**

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
  ***Example: 
  A bug in the highliighting state. 
  User clicks Highlight Sections and the UI allows drawing on the canvas
  Button changes to "Exit Highlighting"
  The bug is becauase focus mode and practice mode independently disable highlighting - the button text remains "Exit Highlighting"
  but the application state is already changed
  We need one flow to enable and disable highlighting that can be triggered by many events in the UI
  ***
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

## Case Study: Pragmatic UI changes added to PracticeSessionStarter (2025-09-07)

Summary
- During a bug fix to restore touch behavior for Practice and Focus modes we added UI-manipulation code (toggle text updates, confidence panel hiding, viewer-level CSS class changes) into `scripts/Practice/practice-session-starter.js` and `scripts/layout/focus-mode-handler.js`.
- These changes were pragmatic and made the immediate UAT scenario pass, but they violated separation of concerns: the Practice starter now directly manipulates Highlighting UI state.

Why this is a problem
- Coupling: Practice startup logic should orchestrate practice-related services (layout, timer, persistence), not UI state for other features. Mixing these concerns makes the module harder to test and maintain.
- Hidden side effects: Other code paths that enable/disable highlighting expect a single authoritative flow. By updating UI state in multiple places we create race conditions and UI drift (e.g., toggle text out-of-sync with real highlighting state).
- Technical debt: Small, fast fixes like this accumulate into brittle patches that block future refactors and make it harder to migrate to a DI/AppState model.

What we did instead (and why we reverted)
- We initially added the UI updates to quickly unblock UAT. After reviewing the architecture implications we reverted the change and restored the original, minimal behavior in `practice-session-starter.js` and `focus-mode-handler.js`.
- The correct long-term fix is to centralize UI state changes behind a service or AppState (see 'State Management' and 'Boundary Enforcement Strategy'). Practice/session/focus code should call a single service (e.g., HighlightingService.disable()) and that service should update UI and publish state changes.

Recommended concrete follow-ups
1. Implement a small `HighlightingService` that exposes `enable()`, `disable()`, and `getState()` and centralizes DOM updates (toggle text, confidence panel visibility, `highlighting-active` class).
2. Inject `HighlightingService` into modules that need it (Practice starter, Focus handler, main.js) rather than calling `document.*` directly.
3. Add unit tests that assert the UI state is controlled only by `HighlightingService` (prevent regressions).
4. Add a lint rule or code-review checklist item: "Do not manipulate UI for other features inside domain modules; use services or events." 

This case study is recorded here to capture the trade-off we made and the learning: pragmatic fixes are fine short-term, but they must be reconciled by an architectural follow-up to avoid rot.
