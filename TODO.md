# PlayTime TODO List

## 🎉 SUCCESS: Database Integration Complete & UAT Verified!

**✅ ACHIEVEMENT UNLOCKED**: PDF upload and rendering now works in both test and UAT environments!

**Key Insight**: Test mocks can mask implementation gaps. Our systematic approach of testing real implementations (not just mocks) successfully identified and fixed the UAT gap.

---

## � SUCCESS: Page Navigation Feature Complete!

**✅ ACHIEVEMENT UNLOCKED**: Page navigation buttons now actually work!

**What We Accomplished:**
- ✅ Added `initializePageNavigation()` function to connect UI buttons to PDF viewer
- ✅ **Integration test passes**: Button clicks properly trigger page changes
- ✅ **Real functionality implemented**: Buttons work with proper boundary checking  
- ✅ **False confidence gap eliminated**: Integration test verifies actual behavior

**Key Insight**: Integration tests catch the gaps that acceptance tests miss. Even when acceptance tests pass, the actual functionality might be missing.

---

## 🎯 NEXT TARGET: Score Selection Feature (Score List & Selection)

**Why This Is The Most Valuable Next Feature:**

1. **Core User Workflow**: Complete the PDF management experience - users upload but can't see/select scores
2. **High User Value**: Makes the app feel complete and professional  
3. **Clear Failing Tests**: Score list display and selection tests are ready to drive implementation
4. **Foundation Feature**: Required before advanced features like highlights and practice modes

**Current Failing Tests:**
1. **Score list display** - Missing .score-item elements 
2. **Select score from list** - Missing `.current-score-title` element

**Implementation Approach:**
- Add score list UI to display uploaded PDFs from IndexedDB
- Implement score selection functionality (click to load PDF)
- Show current score title/metadata
- Connect selection to PDF viewer for seamless score switching

---

## 📊 Current Test Status

**✅ PASSING TESTS (6):**
- Upload a PDF score from my device  
- Save uploaded PDF locally in browser  
- View the pages of my selected PDF score clearly on the screen 
- Basic page navigation for multi-page scores *(false positive - buttons exist but don't work)*
- Draw a rectangle over a part of the score to define a practice section 
- Zoom in on the selected section for focused practice 

**❌ FAILING TESTS (5) - Ready for Implementation:**
1. **Score list display** - Missing .score-item elements 
2. **Select score from list** - Missing `.current-score-title` element
3. **Color code sections** - Missing `.highlight[data-color="green"]` element
4. **Persist highlights** - Missing `.highlight[data-color="amber"]` element
5. **Select highlighted sections** - Missing `.selected` class functionality

---

## 🚀 Implementation Priority Queue

1. **🎯 CURRENT: Fix Page Navigation** - Make prev/next buttons actually work
2. **Score Selection** - Add score list UI and selection functionality  
3. **Color Coding** - Implement highlight color assignment
4. **Highlight Persistence** - Save/load highlights to IndexedDB
5. **Section Selection** - Make highlights clickable/selectable

---

## 📝 Key Lessons Learned

- **Test mocks can give false confidence** - Always verify implementation works in actual UAT environment
- **Check button existence vs functionality** - Tests should verify behavior, not just presence
- **Outside-In TDD works** - Failing tests successfully drive implementation priorities


## 🎯 Current Status: Clean Test Output + Next Implementation Targets! 

✅ **PASSING TESTS (6):**🎯 Current Status: ALL TESTS FAIL FOR RIGHT REASONS! Ready for Feature Implementation! 🎉layTime TODO List

## 🎯 Current Status: Clean Test Output + Next Implementation Targets! �

✅ **PASSING TESTS (6):**
- Upload a PDF score from my device  
- Save uploaded PDF locally in browser  
- View the pages of my selected PDF score clearly on the screen 
- Basic page navigation for multi-page scores 
- Draw a rectangle over a part of the score to define a practice section 
- Zoom in on the selected section for focused practice 

❌ **FAILING TESTS (5) - CLEAN ASSERTIONS, NO RUNTIME ERRORS:**
1. **Score list display** - Missing .score-item elements (feature not implemented yet)  
2. **Select score from list** - Missing `.current-score-title` element
3. **Color code sections** - Missing `.highlight[data-color="green"]` element
4. **Persist highlights** - Missing `.highlight[data-color="amber"]` element
5. **Select highlighted sections** - Missing `.selected` class functionality

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
- [ ] **Multi page pdf navigation** - next and previous page buttons
- [ ] **Simple section highlighting** - Draw colored rectangles
- [ ] **Demo-ready prototype** - Enough functionality for user testing

### 🗺️ 3. Start Implementing User Story Map Systematically  
**Following the map order:** Activity 1 → Activity 2 → Activity 3

#### Activity 1: Manage Music Scores
- [ ] **1.1 Add New Score** (File upload + local storage)
- [ ] **1.2 View & Select Existing Score** (Score list + selection)

#### Activity 2: Analyze & Mark Up Score  
- [ ] **2.1 View PDF Score** (PDF.js integration + navigation)
- [ ] **2.2 Highlight Sections** (Drawing interface + color coding)
- [ ] **2.3 Persist Highlights** (Save/load highlights)

#### Activity 3: Practice Marked Sections
- [ ] **3.1 Focus on Highlighted Section** (Zoom/crop functionality)

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
  - [ ] Focus whole score
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

## ✅ Completed Items

### Test Infrastructure ✅
- [x] Created comprehensive acceptance tests using Outside-In methodology
- [x] Set up Jest + JSDOM test environment with proper mocks
- [x] Fixed IndexedDB mock to prevent test hanging
- [x] Converted test setup from Playwright to JSDOM
- [x] Got first meaningful failing test running
- [x] HTML loading via JSDOM working correctly

### Project Foundation ✅
- [x] Project structure and documentation (README.md, UserStoryMap.md, TechnologyChoices.md)
- [x] PSake build system with comprehensive tasks
- [x] Basic HTML structure with UI elements
- [x] CSS styling for tablet-friendly interface
- [x] Placeholder JavaScript modules created

### PDF Rendering Implementation ✅
- [x] **PDF.js Integration** - Complete PDF viewer with page rendering and navigation
- [x] **Integration Tests** - Comprehensive tests for PDF loading, rendering, error handling
- [x] **File Upload to PDF Connection** - File upload triggers PDF viewer with dependency injection
- [x] **Canvas Integration** - PDF pages render to HTML5 canvas element
- [x] **Page Navigation** - Previous/next page functionality with boundary handling
- [x] **Scale Calculation** - Automatic canvas sizing for optimal PDF display
- [x] **Error Handling** - Graceful handling of invalid PDFs and loading failures

---

## 🎯 Next Action Items - Current Plan ⚠️
**Status**: Database abstraction supported better integration testing 

## NOTE: IndexedDBDatabase ESM Limitation

Due to Node and Jest limitations, there is currently **no way to directly test the ESM `IndexedDBDatabase.js` implementation from CommonJS-based tests** (even with dynamic import and experimental flags). Jest will not parse ESM files unless the entire test suite, helpers, and configuration are migrated to ESM and Jest is fully configured for ESM support.

**To test the real IndexedDBDatabase.js implementation, a full ESM migration is required:**
- Convert all test files and helpers to ESM (`import`/`export` syntax, `.js` extensions, no `require`).
- Update Jest config for ESM (see https://jestjs.io/docs/ecmascript-modules).
- Only then can you import and test ESM modules like `IndexedDBDatabase.js`.

Until then, tests using the CommonJS factory or wrapper will NOT exercise the new ESM code.


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
