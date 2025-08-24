# PlayTime TODO List

## 🚀 Implementation Priority Queue

2. **Color Coding** - Implement highlight color assignment
3. **Highlight Persistence** - Save/load highlights to IndexedDB
4. **Section Selection** - Make highlights clickable/selectable

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
  - [ ] Edit/delete existing highlights

### Phase 4: Practice Features
  - [x] Focus whole score (See todo-focus-mode.html for an example)
  - [x] Zoom/crop view to highlighted section
  - [x] Exit focus mode back to full view
  - [ ] Section navigation (next/previous)

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

 - [ ] **Practice Session Planning & Progress Tracking**
   - [ ] Practice session configuration UI (replacing score canvas, alternate sidebar control set)
   - [ ] Select sections, reorder, remove, set method, duration, notes
   - [ ] Save/load/delete practice plans (IndexedDB)
   - [ ] Start session: timer, section navigation, progress indicator
   - [ ] Record practice notes per section
   - [ ] Update confidence after each section
   - [ ] Track session history and progress
   - [ ] Acceptance: See docs/practice-session-guide.html for workflow and criteria

## 📁 Test Fixtures & Assets
- [x] Create sample PDF files for testing
  - [x] `tests/fixtures/sample-score.pdf`
  - [x] `tests/fixtures/another-score.pdf` 
  - [x] Multi-page PDF for navigation testing

## 🎨 UI/UX Enhancements
- [x] Responsive design improvements for tablet use
- [x] Touch-friendly controls and gestures
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Visual polish and modern design

## 🧪 Testing Strategy
- [x] **Outside in TDD Methods**
  - [x] Define Acceptance tests
  - [x] CI/CD Supported

- [x] **Integration Tests**
  - [x] Cross-module functionality
  - [x] PDF.js integration testing
  - [x] Database integration testing

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

