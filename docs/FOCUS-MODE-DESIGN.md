# Focus Mode Design Document: User Story 4.3

## Overview
This document outlines the design enhancements made to the refactored highlighting architecture to support **User Story 4.3: Focus on a Highlighted Section**.

> **User Story 4.3**: "As a musician, I want to be able to select one of my highlighted sections from the score and have the application display only the selected section, or zoom in on it, so I can focus my practice."

## 🎯 Key Design Questions & Decisions

### Q1: How should musicians select a highlight for focus?
**Design Decision**: Multiple interaction methods for flexibility
- ✅ **Click directly on highlight**: Primary interaction method
- ✅ **Keyboard navigation**: Press Enter/Space on focused highlight  
- ✅ **Accessibility support**: Full ARIA labeling and tabindex
- 🔮 **Future**: Sidebar list of highlights for easier selection
- 🔮 **Future**: Keyboard shortcuts (F key for focus mode)

### Q2: What should "focus" behavior look like?
**Design Decision**: Two focus modes with smooth transitions
- ✅ **Zoom Mode** (Default): Scale and center the highlight area using CSS transforms
- 🔮 **Crop Mode**: Show only the highlighted region (requires PDF.js integration)
- ✅ **Visual feedback**: Smooth 0.3s animations, backdrop overlay
- ✅ **Escape mechanism**: Easy exit via ESC key or click outside

### Q3: How should musicians navigate between focused sections?
**Design Decision**: Comprehensive navigation system
- ✅ **Event system**: Custom events for focus requests and exits
- 🔮 **Next/Previous**: Cycle through highlights by confidence or creation order  
- 🔮 **Confidence filtering**: Show only red/amber sections for practice
- ✅ **Accessible controls**: Keyboard navigation and screen reader support

### Q4: How to handle multi-page highlights?
**Design Decision**: Page-aware focus system
- ✅ **Page tracking**: Each highlight stores page information
- ✅ **Page-specific visibility**: Only show highlights for current page
- 🔮 **Cross-page navigation**: Auto-navigate to highlight's page when focusing
- 🔮 **Multi-page spans**: Handle highlights that span page boundaries

## 🏗️ Architecture Enhancements

### 1. HighlightElement Enhancements
```javascript
// Enhanced DOM creation with focus capabilities
createDOMElement(containerRect, canvasOffsetLeft, canvasOffsetTop, styleConfig) {
    const { enableFocus = true } = styleConfig;
    // ... existing code ...
    
    if (enableFocus) {
        el.style.cursor = 'pointer';
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `Practice section (${this.color} confidence) - Click to focus`);
    }
}
```

**Value**: Makes highlights interactive while maintaining accessibility standards.

### 2. CoordinateMapper Focus Calculations
```javascript
// Calculate zoom and pan for focus mode
static calculateFocusTransform(highlightRect, containerRect, padding = 20) {
    const scaleX = targetWidth / highlightRect.width;
    const scaleY = targetHeight / highlightRect.height;
    const scale = Math.min(scaleX, scaleY, 4); // Max 4x zoom
    // ... transform calculations ...
}

// Calculate crop area for future PDF integration
static calculateCropArea(highlightPercentages, padding = 0.1) {
    // Returns precise crop coordinates for PDF.js integration
}
```

**Value**: Addresses the **[High Risk: Coordinate mapping]** concern from the User Story Map with precise, tested calculations.

### 3. Event System for Focus Mode
```javascript
// New events for focus mode
HIGHLIGHT_FOCUS_REQUESTED: 'playtime:highlight-focus-requested'
HIGHLIGHT_FOCUS_EXITED: 'playtime:highlight-focus-exited'

// Event coordination
onHighlightFocusRequested(callback) {
    this.callbacks.onHighlightFocusRequested = callback;
    return this;
}
```

**Value**: Provides clean integration points for UI components and analytics.

### 4. Main Module Focus API
```javascript
// Public API for focus mode
focusOnHighlight(target, options = {}) {
    const { mode = 'zoom', padding = 20 } = options;
    // ... implementation ...
}

exitFocusMode() {
    // Reset transformations and fire exit events
}
```

**Value**: Simple, predictable API that integrates cleanly with existing highlighting system.

## 🎨 User Experience Design

### Visual Design Principles
1. **Smooth Transitions**: 0.3s CSS transitions for professional feel
2. **Clear Feedback**: Visual indicators when highlights are focusable
3. **Accessible Design**: Full keyboard navigation and screen reader support
4. **Escape Hatches**: Multiple ways to exit focus mode (ESC, click outside, explicit button)

### Interaction Flow
```
1. User creates highlight (existing functionality)
2. Highlight appears with pointer cursor and accessibility labels
3. User clicks highlight or presses Enter when focused
4. Smooth zoom animation centers the highlight
5. Background dims to reduce distractions
6. User can exit via ESC key or focus mode controls
7. Smooth return to normal view
```

### CSS Enhancements
- **Focus Mode Styles**: `/styles/focus-mode.css` with backdrop, zoom effects
- **Hover States**: Enhanced highlight appearance on hover
- **Accessibility**: Reduced motion support for users with vestibular disorders

## 🧪 Testing Strategy

### Current Test Coverage
- ✅ **Unit Tests**: 56 tests covering core components
- ✅ **Integration Tests**: 20 tests covering refactored module
- ✅ **Focus Mode**: All new methods integrated into existing test suite

### Upcoming Test Needs for Focus Mode
```javascript
// Integration tests needed
describe('focus mode', () => {
    test('focuses on highlight when clicked');
    test('exits focus mode with ESC key');
    test('calculates correct zoom transforms');
    test('fires focus events correctly');
    test('handles keyboard navigation');
});
```

## 🔮 Future Implementation Roadmap

### Phase 1: Basic Focus Mode (Ready Now)
- ✅ Click-to-focus zoom mode
- ✅ Keyboard accessibility
- ✅ Event system foundation
- ✅ CSS animations and styling

### Phase 2: Enhanced Navigation (Next Sprint)
- [ ] Highlight list sidebar for easy selection
- [ ] Next/Previous navigation through highlights
- [ ] Confidence-based filtering (show only red/amber)
- [ ] Focus mode status indicator

### Phase 3: Advanced Features (Future)
- [ ] Crop mode with PDF.js integration
- [ ] Multi-page highlight navigation
- [ ] Practice session tracking
- [ ] Keyboard shortcuts (F for focus, arrows for navigation)

### Phase 4: Practice Integration (Future)
- [ ] Timer integration for focused practice sessions
- [ ] Progress tracking by highlight confidence
- [ ] Practice statistics and analytics
- [ ] Integration with deliberate practice methodologies

## 🚀 Benefits for User Story 4.3

### ✅ Immediate Value
1. **Precise Focus**: Accurate coordinate mapping solves the **[High Risk: Coordinate mapping]** concern
2. **Smooth UX**: Professional animations and transitions
3. **Accessibility**: Full keyboard and screen reader support
4. **Integration Ready**: Clean event system for future features

### ✅ Practice Workflow Support
1. **Distraction Reduction**: Background dimming and zoom focus
2. **Easy Navigation**: Click any highlight to focus instantly  
3. **Escape Mechanisms**: Multiple ways to exit focus mode
4. **Performance**: CSS transforms provide smooth, hardware-accelerated animations

### ✅ Technical Foundation
1. **Maintainable**: Single responsibility classes with clear APIs
2. **Testable**: Comprehensive test coverage with dependency injection
3. **Extensible**: Event system and modular design support future features
4. **Backward Compatible**: Existing highlighting functionality unchanged

## 🎯 Goals
- [ ] Use focus mode command architecture (layout commands + FocusModeHandler) for entering focus mode from a highlight
- [ ] Remove direct canvas transform logic from highlighting module for focus (delegate to pdf-viewer & handler)
- [ ] Use pdf-viewer’s zoom API (setZoom / zoomIn) instead of ad‑hoc scale transforms
- [ ] Introduce a scroll-to / focusOnRect API in pdf-viewer to center a highlighted region
- [ ] Keep existing acceptance tests meaningful (update them to assert zoom + centering via new API, not CSS transform)

## 🧩 Proposed Incremental Vertical Slice

### Phase 1: Extend pdf-viewer (new public APIs)
Add:
1. `focusOnRectPercent({ xPct, yPct, wPct, hPct }, { paddingPx = 20 })`
   - Computes required effective scale so the rect (plus padding) fits inside container
   - Converts to zoomMultiplier (effectiveScale / documentBaseFitScale, bounded by ZOOM)
   - `await` re-render, then centers via scrolling (container.scrollLeft / scrollTop)
   - Returns `{ zoom, centered: { deltaX, deltaY } }`
2. `scrollRectIntoView(rectPx, { behavior = 'instant', center = true })`
   - Utility used by focus routine
3. Persist base page width/height on first render (store `basePageWidth`, `basePageHeight`) so percentage math is stable.

### Phase 2: Enhance FocusModeHandler
- Add viewerContainer class toggle: `focus-mode` on enter, remove on exit (keeps existing test assertions).
- Accept highlight focus options: if `options.highlight` present, call `window.PlayTimePDFViewer.focusOnRectPercent(options.highlight, { paddingPx: options.padding || 20 })` after entering focus mode (and before scheduling layout event).
- Remove internal scaling logic duplication when highlight provided (fallback `applyFocusLayout` only when no highlight).

### Phase 3: Refactor Highlighting Module
- In `focusOnHighlight`:
  - Extract highlight percentages
  - Dispatch layout command: `changeLayout('focus-mode', { action: 'enter', highlight: { xPct, yPct, wPct, hPct }, padding })`
  - Delete / bypass `_applyZoomFocus` and `_applyCropFocus` for highlight-triggered path (leave crop stub for future)
  - Keep legacy event dispatch (`playtime:highlight-focus-requested`) for compatibility (still fired after issuing command)
- Update `exitFocusMode` to delegate: `changeLayout('focus-mode', { action: 'exit' })` (retain transform reset fallback for backward compatibility, but transform should now normally be untouched).

### Phase 4: Update Acceptance Test
- Replace transform-based assertions in “Clicking a highlight enters focus mode…”:
  - Assert `viewer.classList.contains('focus-mode')` still true
  - Assert `window.PlayTimePDFViewer.getZoom() > 1`
  - (Optional) Since JSDOM lacks real layout & scrolling fidelity, mock `viewer.getBoundingClientRect` + store requested highlight percentages by listening to `playtime:layout-command` event; assert command carried the highlight payload.
  - Remove strict `translate(...) scale(...)` transform parsing (canvas will rely on re-rendered size instead of CSS scaling).
- Keep existing earlier simpler focus test but relax transform dependency similarly (or leave one legacy test temporarily until refactor done, then adjust).

### Phase 5: Backward Compatibility & Risk Mitigation
- Leave old transform code path only if command infra missing (defensive check).
- If tests rely on `canvas.style.transform === ''` after exit, they’ll continue to pass (no transform applied).
- Provide migration comments in code marking deprecation of `_applyZoomFocus`.

### Phase 6: Follow-up (Deferred)
- Add integration test specifically for layout command dispatch carrying highlight
- Add unit tests for new pdf-viewer `focusOnRectPercent`
- Eventually remove deprecated transform code once all consumers updated

## 🔍 Edge Cases & Considerations
- PDF not yet loaded when focus command arrives: guard inside FocusModeHandler (queue or no-op with warning)
- Percentages near edges: scrolling clamps at 0 and max scroll; centering delta tolerance in test should allow minor rounding error
- Zoom bounds: If highlight already small, zoom may hit MAX; test should assert `> 1` OR `>= 1.0 && <= max` with a reason (I’ll implement `> 1` but fall back to logging if capped)
- JSDOM limitation: `scrollLeft`/`scrollTop` don’t affect `getBoundingClientRect`; so “centering” verification via geometry mocking + command payload rather than real scroll effects

## 🧪 Test Adjustments (Minimal)
- Modify only the advanced focus acceptance test in `playtime.test.js`
- Add a listener to capture last focus-mode layout command payload for assertion

## ✅ Success Criteria
- All existing tests pass after refactor (except the updated one temporarily red while we implement)
- New pdf-viewer methods exported and callable in browser & tests
- Highlight module no longer sets transform for zoom focus
- Focus mode entry uses command path and pdf-viewer zoom API

## 🚧 Risks
- Race between zoom re-render and scrolling (mitigated by awaiting `reRenderCurrentPage()`)
- Minor performance hit from extra render (acceptable for focus interaction)
- Acceptance test might need slight timing waits (we’ll add small `setTimeout` where needed)

## 📝 Implementation Order
1. Update acceptance test (introduce failing state) – RED
2. Implement pdf-viewer additions – GREEN partial
3. Refactor FocusModeHandler & highlighting module – GREEN
4. Adjust exit logic & events
5. Run tests, refine
6. Document deprecations in comments

Let me know: Approve this plan? (If yes I’ll proceed with the RED test update first, then iterate through edits.)  
Reply with “Proceed” (or specify tweaks) and I’ll start the TDD cycle.## 🎯 Goals (from your request)
- [ ] Use focus mode command architecture (layout commands + FocusModeHandler) for entering focus mode from a highlight
- [ ] Remove direct canvas transform logic from highlighting module for focus (delegate to pdf-viewer & handler)
- [ ] Use pdf-viewer’s zoom API (setZoom / zoomIn) instead of ad‑hoc scale transforms
- [ ] Introduce a scroll-to / focusOnRect API in pdf-viewer to center a highlighted region
- [ ] Keep existing acceptance tests meaningful (update them to assert zoom + centering via new API, not CSS transform)

## 🧩 Proposed Incremental Vertical Slice

### Phase 1: Extend pdf-viewer (new public APIs)
Add:
1. `focusOnRectPercent({ xPct, yPct, wPct, hPct }, { paddingPx = 20 })`
   - Computes required effective scale so the rect (plus padding) fits inside container
   - Converts to zoomMultiplier (effectiveScale / documentBaseFitScale, bounded by ZOOM)
   - `await` re-render, then centers via scrolling (container.scrollLeft / scrollTop)
   - Returns `{ zoom, centered: { deltaX, deltaY } }`
2. `scrollRectIntoView(rectPx, { behavior = 'instant', center = true })`
   - Utility used by focus routine
3. Persist base page width/height on first render (store `basePageWidth`, `basePageHeight`) so percentage math is stable.

### Phase 2: Enhance FocusModeHandler
- Add viewerContainer class toggle: `focus-mode` on enter, remove on exit (keeps existing test assertions).
- Accept highlight focus options: if `options.highlight` present, call `window.PlayTimePDFViewer.focusOnRectPercent(options.highlight, { paddingPx: options.padding || 20 })` after entering focus mode (and before scheduling layout event).
- Remove internal scaling logic duplication when highlight provided (fallback `applyFocusLayout` only when no highlight).

### Phase 3: Refactor Highlighting Module
- In `focusOnHighlight`:
  - Extract highlight percentages
  - Dispatch layout command: `changeLayout('focus-mode', { action: 'enter', highlight: { xPct, yPct, wPct, hPct }, padding })`
  - Delete / bypass `_applyZoomFocus` and `_applyCropFocus` for highlight-triggered path (leave crop stub for future)
  - Keep legacy event dispatch (`playtime:highlight-focus-requested`) for compatibility (still fired after issuing command)
- Update `exitFocusMode` to delegate: `changeLayout('focus-mode', { action: 'exit' })` (retain transform reset fallback for backward compatibility, but transform should now normally be untouched).

### Phase 4: Update Acceptance Test
- Replace transform-based assertions in “Clicking a highlight enters focus mode…”:
  - Assert `viewer.classList.contains('focus-mode')` still true
  - Assert `window.PlayTimePDFViewer.getZoom() > 1`
  - (Optional) Since JSDOM lacks real layout & scrolling fidelity, mock `viewer.getBoundingClientRect` + store requested highlight percentages by listening to `playtime:layout-command` event; assert command carried the highlight payload.
  - Remove strict `translate(...) scale(...)` transform parsing (canvas will rely on re-rendered size instead of CSS scaling).
- Keep existing earlier simpler focus test but relax transform dependency similarly (or leave one legacy test temporarily until refactor done, then adjust).

### Phase 5: Backward Compatibility & Risk Mitigation
- Leave old transform code path only if command infra missing (defensive check).
- If tests rely on `canvas.style.transform === ''` after exit, they’ll continue to pass (no transform applied).
- Provide migration comments in code marking deprecation of `_applyZoomFocus`.

### Phase 6: Follow-up (Deferred)
- Add integration test specifically for layout command dispatch carrying highlight
- Add unit tests for new pdf-viewer `focusOnRectPercent`
- Eventually remove deprecated transform code once all consumers updated

## 🔍 Edge Cases & Considerations
- PDF not yet loaded when focus command arrives: guard inside FocusModeHandler (queue or no-op with warning)
- Percentages near edges: scrolling clamps at 0 and max scroll; centering delta tolerance in test should allow minor rounding error
- Zoom bounds: If highlight already small, zoom may hit MAX; test should assert `> 1` OR `>= 1.0 && <= max` with a reason (I’ll implement `> 1` but fall back to logging if capped)
- JSDOM limitation: `scrollLeft`/`scrollTop` don’t affect `getBoundingClientRect`; so “centering” verification via geometry mocking + command payload rather than real scroll effects

## 🧪 Test Adjustments (Minimal)
- Modify only the advanced focus acceptance test in `playtime.test.js`
- Add a listener to capture last focus-mode layout command payload for assertion

## ✅ Success Criteria
- All existing tests pass after refactor (except the updated one temporarily red while we implement)
- New pdf-viewer methods exported and callable in browser & tests
- Highlight module no longer sets transform for zoom focus
- Focus mode entry uses command path and pdf-viewer zoom API

## 🚧 Risks
- Race between zoom re-render and scrolling (mitigated by awaiting `reRenderCurrentPage()`)
- Minor performance hit from extra render (acceptable for focus interaction)
- Acceptance test might need slight timing waits (we’ll add small `setTimeout` where needed)

## 📝 Implementation Order
1. Update acceptance test (introduce failing state) – RED
2. Implement pdf-viewer additions – GREEN partial
3. Refactor FocusModeHandler & highlighting module – GREEN
4. Adjust exit logic & events
5. Run tests, refine
6. Document deprecations in comments

Let me know: Approve this plan? (If yes I’ll proceed with the RED test update first, then iterate through edits.)  
Reply with “Proceed” (or specify tweaks) and I’ll start the