# PlayTime TODO List

## 🚨 **CRITICAL: Architecture Sprint Required Before Advanced Features**

> **⚠️ DEVELOPMENT HALT RECOMMENDATION**: The current architectural technical debt has reached a critical threshold. Advanced features should be postponed until core architectural issues are resolved. See `docs/ArchitectureRefactoringPlan.md` for detailed analysis.

## 🏗️ Architecture & Technical Debt (PRIORITY 1 - BLOCKING)

- [ ] **🔥 CRITICAL: Implement Service Container & Dependency Injection** 
  - [ ] Replace all `window.*` global dependencies with proper constructor injection
  - [ ] Create lightweight service container to manage component lifecycle  
  - [ ] Eliminate fragile patterns like `if (typeof window !== 'undefined' && window.ConfidenceMapper)`
  - [ ] Enable clean, testable component initialization
  - [ ] **Impact**: Currently blocking advanced feature development and making testing 3x harder
  - [ ] **Effort**: 16 hours
  - [ ] **Files**: `scripts/core/ServiceContainer.js`, update all major components

- [ ] **🔥 CRITICAL: Extract Business Service Layer**
  - [ ] Move domain logic out of UI components into pure service classes
  - [ ] Create `HighlightingService`, `PracticeSessionService`, `ScoreManagementService`
  - [ ] Eliminate DOM dependencies from business logic
  - [ ] **Impact**: Will make advanced features 50% faster to implement and test
  - [ ] **Effort**: 20 hours  
  - [ ] **Files**: `scripts/services/*.js`

- [ ] **🔥 CRITICAL: Implement Centralized State Management**
  - [ ] Replace scattered state with single source of truth
  - [ ] Stop using DOM attributes as primary state storage
  - [ ] Add state change notifications and proper data flow
  - [ ] **Impact**: Required for complex features like PNG extraction and mobile timer positioning
  - [ ] **Effort**: 12 hours
  - [ ] **Files**: `scripts/core/AppState.js`, `scripts/core/StateManager.js`

- [ ] **🔥 CRITICAL: Resolve ES Module vs CommonJS Conflicts**
  - [ ] Fix mixed module system causing "Unexpected token 'export'" errors in Jest tests
  - [ ] Core files (DIContainer, IndexedDBDatabase) use ES modules but tests need CommonJS
  - [ ] Either standardize on CommonJS with proper exports or configure Jest for ES modules
  - [ ] **Impact**: Blocking database layer testing, IndexedDB integration tests impossible
  - [ ] **Evidence**: Failed tests in highlight-deletion sprint, had to skip IndexedDBDatabase unit tests
  - [ ] **Effort**: 8 hours - standardize module system across codebase
  - [ ] **Files**: `scripts/Core/Infrastructure/*.js`, `scripts/db/*.js`, Jest configuration

**Total Architecture Sprint**: 88 hours (2+ weeks) - **MUST COMPLETE BEFORE SPRINT 3**

## 🚀 Implementation Priority Queue (AFTER Architecture Sprint)

### **🎹 Practice Session Enhancements** - Based on Real Piano Practice Feedback
> **Note**: These advanced features require the architecture sprint to be completed first for sustainable implementation.

- [ ] **Section Completion Dialog Improvements**
  - [ ] Change "rate this session" to "rate this section" 
  - [ ] Display section name in completion dialog
  - [ ] Enable editing/updating section notes during completion

- [ ] **Strategy Implementation Enhancement** 
  - [ ] True section isolation for "Chunking" strategy (prevent playing non-target measures)
  - [ ] Extract highlighted section as PNG for complete visual isolation
  - [ ] Investigate visual barriers or stronger focus techniques

- [ ] **Mobile Practice Optimization**
  - [ ] Timer positioning that survives pinch zoom operations
  - [ ] Extend screen wake lock to focus mode (not just practice sessions)
  - [ ] Consistent touch scroll/pinch zoom availability unless highlighting active

- [ ] **Focus Mode UI Refinement**
  - [ ] Remove additional distracting UI elements during focus
  - [ ] Enhanced visual isolation techniques

### **Remaining Core Features**
2. **Color Coding** - Implement highlight color assignment
3. **Highlight Persistence** - Save/load highlights to IndexedDB
4. **Section Selection** - Make highlights clickable/selectable

### Scores & Repertoire Mode (new)

- [ ] **Extract Scores list into standalone section** (placed before current practice modes)
  - [ ] Scores should be categorised as **"Learning"** (works-in-progress) and **"Repertoire"** (performance pieces)
  - [ ] Provide filters/tags on the score list UI to switch between Learning and Repertoire views
  - [ ] Show indicators on score cards (fresh, maintaining, stale, rusty) and last-practiced metadata

- [ ] **Repertoire Practice Mode**
  - [ ] Treat repertoire practice as a distinct practice mode focused on whole-section performance with page-turn support
  - [ ] During a Repertoire session the app presents the full score (or sequential pages) and supports seamless page turns
  - [ ] After a performance the user can mark specific sections as needing revision (adds them to Learning or a revision plan)
  - [ ] Acceptance: User can start a Repertoire practice from a score card, perform through the piece with page turns, and mark sections for later revision
  - [ ] Effort: 12-20 hours
  - [ ] Files: `scripts/score-list.js`, `scripts/repertoire-mode.js` (new), UI templates in `layout/` and `Practice/`, `db/*` updates for practice history and revision flags

- [ ] **Smart prompts & warmups**
  - [ ] After a 25-minute cumulative practice session (or user-configured interval) optionally prompt the user with a Repertoire piece to play through as a cooldown/warmdown
  - [ ] Provide a lightweight "Warm up with Repertoire" option on app startup or on returning to the app
  - [ ] Acceptance: After a qualifying practice session the app will suggest a Repertoire piece; on return the user can choose a quick warm-up repertoire run


### Phase 1: Basic PDF Upload & Display
- [ ] **File Upload Handler** (scripts/main.js)
  - [x] Listen for file input change events
  - [x] Display selected filename in `.pdf-viewer-container`
  - [ ] Set a file name alias
  - [ ] Basic file validation (PDF type, size limits)

- [x] **IndexedDB Storage** (db/**.js)
  - [x] Initialize PlayTimeDB with pdfFiles object store
  - [x] Save uploaded PDF files with metadata
  - [x] Retrieve stored PDF list
  - [x] Database abstractions for and browser - more later (eg: firebase)

- [x] **PDF Rendering** (scripts/pdf-viewer.js)
  - [x] Integrate PDF.js library
  - [x] Render first page of PDF to `#pdf-canvas`
  - [x] Basic page navigation (prev/next buttons)

### Phase 2: Score Management
- [x] **Score List Display**
  - [x] Show list of uploaded scores in `#scores-list`
  - [x] Click to select and open score
  - [ ] Delete/manage existing scores

### Phase 3: Section Highlighting
- [x] **Drawing Interface** (scripts/highlighting.js)
  - [x] Mouse/touch rectangle selection on PDF canvas
  - [x] Visual feedback during selection (`.selection-overlay`)
  - [x] Color coding system (green/amber/red)

- [x] **Highlight Persistence**
  - [x] Save highlights to IndexedDB with PDF reference
  - [x] Load and display saved highlights
  - [x] Add description and notes to highlight
  - [ ] Edit/delete existing highlights

### Inline Text Markers (fingering, underlines, small notes)

- [ ] **Add support for inline text markers** (different from practice-section highlights)
  - [ ] Allow users to place short text markers (e.g. fingering numbers, underlines, small rhythmic cues, melodic notes) directly over the PDF canvas
  - [ ] Markers must be positioned relative to the PDF canvas coordinates (not the page DOM) so they stay aligned when pages or layouts change
  - [ ] Markers must scale and reposition correctly when the canvas is zoomed or translated (match PDF.js scale/transform)
  - [ ] Markers should be visually distinct from section highlights (smaller UI, editable text, optional underline/line annotations)
  - [ ] Provide editing UI: add, move, resize, change text, delete
  - [ ] Persist markers to IndexedDB alongside highlights (link to score + page + canvas transform metadata)
  - [ ] Acceptance: User can add a fingering number or short note that stays correctly positioned and scaled while zooming and when reopening the score
  - [ ] Effort: 6-10 hours
  - [ ] Files: `scripts/text.js` (new), `db/*` persistence updates, UI: templates in `layout/` or `Practice/` where applicable


### Phase 4: Practice Features
  - [x] Focus whole score (See todo-focus-mode.html for an example)
  - [x] Zoom/crop view to highlighted section
  - [x] Exit focus mode back to full view
  - [x] Section navigation next
  - [x] **Practice Session Timer & Manager** ✅ COMPLETED
    - [x] Timer completion with dialog options (continue/repeat/end)
    - [x] Session orchestration and state management
    - [x] Confidence update dialogs at section completion
    - [x] Screen wake lock functionality for uninterrupted practice
    - [x] Practice session timer with mobile-optimized positioning

- [ ] **Extract Highlighted Section as PNG**
  - [ ] Module to extract selected rectangle from PDF canvas and convert to PNG
  - [ ] Store PNG in IndexedDB, linked to score and highlight metadata
  - [ ] Replace full score canvas with extracted PNG for focused practice
  - [ ] Research: Use HTMLCanvasElement's getContext('2d').drawImage to copy region, then toDataURL('image/png') for export
  - [ ] Consider using Blob for efficient storage and retrieval
  - [ ] Integrate with existing highlighting workflow (scripts/highlighting.js)
  - [ ] Ensure compatibility with PDF.js rendering and scaling
  - [ ] Acceptance: User can practice only the selected trouble spot, avoiding other areas of the score
  - [ ] Note: Start with PNG images as the simplest solution. If image quality or scaling issues arise during testing, consider investigating SVG extraction using PDF.js SVGGraphics. So far, canvas quality at 300% zoom has been excellent, so PNG extraction is likely sufficient for most use cases.

 - [ ] **Score list practice plan behavior**
   - [ ] Show an indicator on score card in score list if a practice plan is saved
   - [ ] If the selected score has a practice plan the call to action should be Start Practice plan
   - [ ] The Mark Section Confidence tool should show details of the practice plan
   - [ ] There should be an edit practice plan call to action in this component, allowing new highlights to be added to the score, or the setup UI to be launched

 - [x] **Practice Session Planning & Progress Tracking** ✅ COMPLETED
   - [x] Practice session configuration UI (replacing score canvas)
   - [x] Floating action button for highlight annotation (notebook icon)
   - [x] Annotation dialog/modal for adding titles and notes to highlights
   - [ ] Select sections, reorder, remove, set method, duration, notes
  - [x] Save/load/delete practice plans (IndexedDB)
  - [x] Start session: timer, section navigation, progress indicator
  - [ ] Record practice notes per section
  - [x] Update confidence after each section
  - [ ] Track session history and progress
  - [ ] Alternate sidebar control set
  - [ ] Acceptance: See docs/practice-session-guide.html for workflow and criteria

---
**Practice Plan Thoughts (for future work):**
- The cards on the practice planner are too large for drag and drop sorting - need an "expand" behavior?
- Consider showing a preview image from the canvas for each section.
- Target duration in the practice session config is probably the sum of the target time for all sections.
  - Instead of a manual entry, just label it "Duration" and have it be calculated automatically.

## 📁 Test Fixtures & Assets
- [x] Create sample PDF files for testing
  - [x] `tests/fixtures/sample-score.pdf`
  - [x] `tests/fixtures/another-score.pdf` 
  - [x] Multi-page PDF for navigation testing

## 🎨 UI/UX Enhancements
- [x] Responsive design improvements for tablet use
- [x] Touch-friendly controls and gestures
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Visual polish and light mode design should not look like "generic twitter boostrap"

## 🧪 Testing Strategy

### **Testing Architecture Lessons Learned (Sep 12, 2025)**

**Critical Discovery**: Integration tests using Jest mocks for event handling break real event flow
- **Problem**: `global.window.addEventListener = jest.fn()` doesn't register real listeners
- **Solution**: Use real `EventTarget` instances for integration tests
- **Impact**: Fixed duplicate event issues in focus-mode-command-dispatch tests

**Testing Strategy by Type**:
```javascript
// ❌ Anti-pattern: Jest mocks in integration tests
global.window.addEventListener = jest.fn();
global.window.dispatchEvent = jest.fn();

// ✅ Integration tests: Real EventTarget for event flow
const eventTarget = new EventTarget();
global.window.addEventListener = eventTarget.addEventListener.bind(eventTarget);

// ✅ Unit tests: Mock external dependencies only
const mockPDFViewer = jest.fn();
```

**Test Classification**:
- **Unit Tests**: Mock external dependencies, test isolated logic
- **Integration Tests**: Real objects for internal communication (events, commands)
- **End-to-End Tests**: Real DOM and browser environment

This reinforces why architecture refactoring is critical - complex event flows need predictable, testable patterns.

- [x] **Outside in TDD Methods**
  - [x] Define Acceptance tests
  - [x] CI/CD Supported

- [x] **Integration Tests**
  - [x] Cross-module functionality
  - [x] PDF.js integration testing
  - [x] Database integration testing
  - [x] Fixed event system testing anti-patterns

## 📦 Deployment & Distribution
- [ ] **Progressive Web App (PWA)**
  - [ ] Service worker for offline functionality
  - [ ] Web app manifest
  - [ ] Installable app experience

- [ ] **Build Optimization**
  - [ ] Asset minification and bundling
  - [x] Production build pipeline
  - [ ] Performance optimization

## 🔧 Technical Debt & Improvements
- [ ] **Code Organization**
  - [ ] ES6 modules structure
  - [ ] TypeScript migration
  - [ ] Linting and code formatting setup

- [ ] **Performance**
  - [ ] PDF rendering optimization
  - [ ] Large file handling
  - [ ] Memory management for multiple PDFs

## 📚 Documentation
- [ ] **API Documentation**
  - [ ] Document JavaScript module interfaces
  - [ ] Usage examples and patterns

- [ ] **User Guide**
  - [ ] How to use PlayTime effectively
  - [ ] Practice strategies integration
  - [ ] Troubleshooting guide

### PDF Rendering Implementation ✅

**Current State**:
- ✅ Integration tests are green (file upload + PDF rendering works in tests)
- ✅ Application initialization works (main.js loads and runs)
- ✅ **PDF.js Implementation Complete**: Full PDF viewer with rendering, navigation, error handling
- ✅ **Six acceptance tests passing**: Upload, save, view, navigate, highlight, zoom
- ⚠️ **4 acceptance tests skipped**: selection, color coding, persist sections, focus sections

## 📝 Notes
- Following strict Outside-In TDD: failing tests drive all implementation
- Each feature should have working acceptance test before implementation
- Keep implementations minimal - just enough to make tests pass
- Refactor only when tests are green

# UI Refinement TODO (Elegant, Clean, Sophisticated)

## QA
- [x] Visual baseline doc (docs/visual-baseline.md) and capture plan

## Theme Tokens
- [x] URL param theme override for screenshots (?theme=dark|light)

## Typography
- [x] Apply typographic scale (12/14/16/20/24)
- [x] Tighten heading letter-spacing (-0.003em), labels +0.01em
- [x] Set line-height: body 1.6, headings 1.25
- [x] Use tabular numbers for dates and page badges

## Icons
- [x] Reduce decorative icons in sidebar header
- [x] Ensure lucide stroke-width: 1.5; size 16 in dense areas

## Components
- [x] Score item: selected uses subtle ring and background tint
- [x] Pages badge: outline or soft fill in dark mode
- [x] Confidence buttons: aria-pressed, subtle hover, ring focus
- [x] Confidence controls JS initialization (toggles pressed/selected)
- [x] Wire setActiveColor into highlighting module API (non-breaking)

## Layout & Spacing
- [x] Sidebar gutter consistency (16/24/32)
- [x] Card internal gap tightened; padding 12–14px
- [x] Toolbar stays minimal (3.5rem) with essential actions only

## Accessibility
- [x] Keyboard focus visible across all controls
- [x] Score list items keyboard-activatable (tabindex + Enter/Space)

## Next up
- [x] Icon audit (retain only essentials, 16px in dense areas)
- [x] Final sidebar/header spacing check on tablet widths

