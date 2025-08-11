# PlayTime TODO List

## 🚀 Implementation Priority Queue

2. **Color Coding** - Implement highlight color assignment
3. **Highlight Persistence** - Save/load highlights to IndexedDB
4. **Section Selection** - Make highlights clickable/selectable

## 📋 Priorities by Value (XP/Agile Approach)

### 🧹 1. Tidy First - Working XP Pipeline for CI/CD ✅
- [x] **Working test pipeline** - Jest + JSDOM acceptance tests running
- [x] **Build automation** - PSake build system with comprehensive tasks
- [x] **Tech choices installed** - All dependencies ready (PDF.js, IndexedDB mocks)
- [x] **Complete test conversion** - ✅ ALL Playwright → JSDOM syntax converted!
- [x] **GitHub Actions CI/CD Pipeline** - ✅ Automated testing on every commit/PR
  - [x] Created `.github/workflows/ci.yml` with comprehensive pipeline
  - [x] Multi-Node testing (18.x, 20.x), build checks, security audit
  - [x] Added build status badge to README
  - [x] Tests run in clean Node.js environment with `npm ci` + `npm test`
- [x] **Fix PSake StartServer hanging** - ✅ Fixed! Replaced Start-Process with Start-Job for reliable server management

### 🎯 2. Sandbox Clicky Prototype for UAT
**Goal:** Get something clickable ASAP for user feedback
- [x] **Minimal file upload that works** - ✅ File upload handler implemented and tested
- [x] **Connect file upload to acceptance tests** - ✅ FIRST ACCEPTANCE TEST PASSING!
- [x] **Basic PDF display** - ✅ PDF.js integration implemented in tests, but blocked in UAT by placeholder db.js
- [x] **⚠️ Fix PDF display in UAT** - Remove "not implemented yet" messages from db.js
- [x] **Multi page pdf navigation** - next and previous page buttons
- [ ] **Simple section highlighting** - Draw colored rectangles
- [ ] **Demo-ready prototype** - Enough functionality for user testing

### 🗺️ 3. Start Implementing User Story Map Systematically  
**Following the map order:** Activity 1 → Activity 2 → Activity 3

#### Activity 1: Manage Music Scores
- [x] **1.1 Add New Score** (File upload + local storage)
- [x] **1.2 View & Select Existing Score** (Score list + selection)
- [ ] **BUG: After uploading a file the status message is displayed near the foot of the screen but the current score information is not updated**

#### Activity 2: Analyze Score  
- [x] **2.1 View PDF Score** (PDF.js integration + navigation)
- [ ] **BUG: After loading the application with scores in the database, then the first score is shown but the zoom controls are not updated**

#### Activity 3: Practice Score
- [ ] **3.1 Distraction-Free Mode** (Remove UI elements so the musician is not distracted)

#### Activity 4: Practice Marked Sections
- [ ] **4.1 Highlight Sections** (Drawing interface + color coding)
- [ ] **4.2 Persist Highlights** (Save/load highlights)
- [ ] **4.3 Focus on Highlighted Section** (Zoom/crop functionality)

### Phase 1: Basic PDF Upload & Display
- [ ] **File Upload Handler** (scripts/main.js)
  - [x] Listen for file input change events
  - [x] Display selected filename in `.pdf-viewer-container`
  - [ ] Set a file name alias
  - [ ] Basic file validation (PDF type, size limits)

- [ ] **IndexedDB Storage** (db/**.js)
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
- [ ] **Drawing Interface** (scripts/highlighting.js)
  - [ ] Mouse/touch rectangle selection on PDF canvas
  - [ ] Visual feedback during selection (`.selection-overlay`)
  - [ ] Color coding system (green/amber/red)

- [ ] **Highlight Persistence**
  - [ ] Save highlights to IndexedDB with PDF reference
  - [ ] Load and display saved highlights
  - [ ] Edit/delete existing highlights

### Phase 4: Practice Features
- [ ] **Section Focus Mode**
  - [ ] Focus whole score (See todo-focus-mode.html for an example)
  - [ ] Zoom/crop view to highlighted section
  - [ ] Exit focus mode back to full view
  - [ ] Section navigation (next/previous)

## 📁 Test Fixtures & Assets
- [x] Create sample PDF files for testing
  - [x] `tests/fixtures/sample-score.pdf`
  - [x] `tests/fixtures/another-score.pdf` 
  - [x] Multi-page PDF for navigation testing

## 🎨 UI/UX Enhancements
- [ ] Responsive design improvements for tablet use
- [ ] Touch-friendly controls and gestures
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Visual polish and modern design

## 🧪 Testing Strategy
- [x] **Outside in TDD Methods**
  - [x] Define Acceptance tests
  - [x] CI/CD Supported

- [ ] **Integration Tests**
  - [ ] Cross-module functionality
  - [ ] PDF.js integration testing
  - [ ] Database integration testing

## 📦 Deployment & Distribution
- [ ] **Progressive Web App (PWA)**
  - [ ] Service worker for offline functionality
  - [ ] Web app manifest
  - [ ] Installable app experience

- [ ] **Build Optimization**
  - [ ] Asset minification and bundling
  - [ ] Production build pipeline
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
- [ ] Apply typographic scale (12/14/16/20/24)
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
- [ ] Wire setActiveColor into highlighting module API (non-breaking)

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
