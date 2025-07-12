# PlayTime TODO List

## 🎯 Current Status: Clean Test Output + Next Implementation Targets! �

✅ **PASSING TESTS (5):**
- Upload a PDF score from my device  
- View the pages of my selected PDF score clearly on the screen 
- Basic page navigation for multi-page scores 
- Draw a rectangle over a part of the score to define a practice section 
- Zoom in on the selected section for focused practice 

❌ **FAILING TESTS (6) - Clear Implementation Targets:**
1. **Save PDF locally** - Times out (need IndexedDB implementation)
2. **Score list display** - Property redefinition error (test setup issue)  
3. **Select score from list** - Missing `.current-score-title` element
4. **Color code sections** - Missing `.highlight[data-color="green"]` element
5. **Persist highlights** - Missing `.highlight[data-color="amber"]` element
6. **Select highlighted sections** - Missing `.selected` class functionality

**Next Implementation Priority:**
- **Fix test setup issue** (property redefinition error)
- **Implement IndexedDB storage** for PDF persistence
- **Add score list UI elements** (.current-score-title, etc.)

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
- [ ] **Basic PDF display** - Static PDF rendering to canvas
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
  - [ ] Listen for file input change events
  - [ ] Display selected filename in `.pdf-viewer-container`
  - [ ] Basic file validation (PDF type, size limits)

- [ ] **IndexedDB Storage** (scripts/db.js)
  - [ ] Initialize PlayTimeDB with pdfFiles object store
  - [ ] Save uploaded PDF files with metadata
  - [ ] Retrieve stored PDF list

- [ ] **PDF Rendering** (scripts/pdf-viewer.js)
  - [ ] Integrate PDF.js library
  - [ ] Render first page of PDF to `#pdf-canvas`
  - [ ] Basic page navigation (prev/next buttons)

### Phase 2: Score Management
- [ ] **Score List Display**
  - [ ] Show list of uploaded scores in `#scores-list`
  - [ ] Click to select and open score
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
  - [ ] Zoom/crop view to highlighted section
  - [ ] Exit focus mode back to full view
  - [ ] Section navigation (next/previous)

## 📁 Test Fixtures & Assets
- [ ] Create sample PDF files for testing
  - [ ] `tests/fixtures/sample-score.pdf`
  - [ ] `tests/fixtures/another-score.pdf` 
  - [ ] Multi-page PDF for navigation testing

## 🎨 UI/UX Enhancements
- [ ] Responsive design improvements for tablet use
- [ ] Touch-friendly controls and gestures
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Visual polish and modern design

## 🧪 Testing Strategy
- [ ] **Unit Tests** (when needed)
  - [ ] Individual module testing (db.js, pdf-viewer.js, etc.)
  - [ ] Mock external dependencies (PDF.js, IndexedDB)

- [ ] **Integration Tests**
  - [ ] Cross-module functionality
  - [ ] PDF.js integration testing

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
  - [ ] TypeScript migration (optional)
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

---

## 🎯 Next Action Items - Current Plan ✅
**Status**: MAJOR SUCCESS! Test infrastructure fixed and first user story implemented.

**Current State**:
- ✅ Integration tests are green (file upload logic works)
- ✅ Application initialization works (main.js loads and runs)
- ✅ **FIRST ACCEPTANCE TEST PASSING**: "As a musician, I want to upload a PDF score from my device"
- ✅ All other acceptance tests failing for CORRECT reasons (assertion errors, not runtime errors)

**Critical Fixes Made**:
1. **Bug Fix**: `updatePDFViewerStatus` was using `textContent` which destroyed canvas child element
2. **Test Setup**: Removed script tags from HTML to prevent JSDOM interference
3. **DOM Persistence**: Canvas now persists through entire file upload process

**Next Steps (Proper Outside-In TDD)**:
1. **Fix test setup issues** - Property redefinition error in score list test
2. **Implement IndexedDB storage** - Make "save locally" test pass
3. **Implement score list display** - Show uploaded PDFs in UI
4. **Continue with failing tests** - Following proper Outside-In TDD cycle

**Lesson Learned**: The test infrastructure issues were masking a real implementation bug. Now we can do proper TDD development.

## 📝 Notes
- Following strict Outside-In TDD: failing tests drive all implementation
- Each feature should have working acceptance test before implementation
- Keep implementations minimal - just enough to make tests pass
- Refactor only when tests are green
