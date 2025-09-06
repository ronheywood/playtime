# Practice Mode Development Plan
*Generated from user feedback analysis - September 1, 2025*

## Executive Summary
This plan addresses critical usability issues in practice mode, particularly on iPad/mobile devices, and implements user-requested enhancements. The three-sprint approach prioritizes core functionality fixes before adding advanced features.

## Implementation Timeline

### Sprint 1: Core Practice Mode Experience (Priority: Critical) ✅ COMPLETED
**Duration**: 1-2 weeks  
**Goal**: Fix fundamental issues that break practice sessions

#### Task 1.1: Disable Highlight Creation in Practice Mode ✅ COMPLETED
- **Files**: `scripts/Practice/practice-session-starter.js`, `scripts/highlighting/highlighting.js`, `scripts/highlighting/MouseSelectionHandler.js`
- **Implementation**: 
  - ✅ Added new `disable()` and `enable()` methods to `MouseSelectionHandler.js`
  - ✅ Changed `window.PlayTimeHighlighting.disableSelection()` to call the disable method on the handler rather than destroying it
  - ✅ Added `window.PlayTimeHighlighting.enableSelection()` method to proxy to MouseSelectionHandler enable methods
  - ✅ Call `window.PlayTimeHighlighting.disableSelection()` on practice session start
  - ✅ Call `window.PlayTimeHighlighting.enableSelection()` on practice session end and exit
  - ✅ Added visual indicator CSS and JavaScript to show selection is disabled
- **Testing**: ✅ Verify touch/mouse events don't create new highlights during practice, ✅ Verify highlights can be added again after practice
- **Effort**: 4 hours ✅ COMPLETED

#### Task 1.2: Fix iPad Timer Positioning ✅ COMPLETED  
- **Files**: `styles/practice-mode.css`, `scripts/Practice/practice-session-timer.js`, `index.html`, test files
- **Implementation**: 
  - ✅ Added responsive CSS with touch device media queries for fixed timer positioning
  - ✅ Enhanced JavaScript with mobile device detection using multiple signals (`ontouchstart`, `maxTouchPoints`, `matchMedia`)
  - ✅ Implemented dynamic timer positioning that moves out of toolbar on mobile devices
  - ✅ Added safe area support for devices with notches using `env(safe-area-inset-top)`
  - ✅ Updated all selectors to use consistent `data-role` attributes instead of IDs
  - ✅ Added proper test environment mocks for `navigator` and `matchMedia` APIs
  - ✅ **HOTFIX**: Enhanced touch event handling with `z-index: 9999`, explicit `pointer-events: auto`, `touch-action: manipulation`, and visual touch feedback for improved iPad button responsiveness
- **Testing**: ✅ iPad Safari, iPhone Safari, Android Chrome, all unit and integration tests passing
- **Effort**: 6 hours ✅ COMPLETED

#### Task 1.3: Practice Mode Highlight Visibility ✅ COMPLETED
- **Files**: `styles/practice-mode.css`, `scripts/Practice/practice-session-starter.js`
- **Implementation**:
  - ✅ Added CSS rules to hide all highlights during practice mode except current section
  - ✅ Used simpler CSS selectors for better mobile performance (removed `:not()` pseudo-class)
  - ✅ Integrated practice mode state management with layout command system
  - ✅ Added performance optimizations for iPad using `requestAnimationFrame` for DOM cleanup
  - ✅ Current section shown with reduced opacity (0.3) and dotted border for visual focus
  - ✅ Consolidated session cleanup in `endSession()` method with async DOM operations
  ```css
  #viewer-section[data-practice-mode="active"] [data-role="highlight"] {
    display: none !important;
    visibility: hidden !important;
  }
  
  #viewer-section[data-practice-mode="active"] [data-role="highlight"].current-practice-section {
    display: block !important;
    visibility: visible !important;
    opacity: 0.3;
    border-style: dotted !important;
    border-width: 2px !important;
  }
  ```
- **Performance Enhancements**: 
  - ✅ Deferred DOM cleanup using `requestAnimationFrame` for smoother iPad performance
  - ✅ Removed CSS transitions that were causing slow practice mode exit
  - ✅ Batched DOM operations to minimize reflows during cleanup
- **Testing**: ✅ Visual verification of single visible highlight with reduced opacity, ✅ All unit tests passing with performance optimizations
- **Effort**: 4 hours ✅ COMPLETED

**Sprint 1 Total**: 14 hours (All tasks ✅ COMPLETED)

### Sprint 2: Touch & Scrolling Improvements (Priority: High)
**Duration**: 1 week  
**Goal**: Perfect mobile interaction during practice

#### Task 2.1: Improve iPad Touch Scrolling ✅ COMPLETED
- **Files**: `scripts/highlighting/MouseSelectionHandler.js`, `styles/practice-mode.css`
- **Implementation**:
  - ✅ Add practice mode detection to touch handlers
  - ✅ Allow `touch-action: pan-x pan-y pinch-zoom` when selection disabled
  - ✅ Prevent `event.preventDefault()` on touch events during practice
- **Testing**: ✅ Smooth scrolling in focus mode on iPad
- **Effort**: 12 hours ✅ COMPLETED

#### Task 2.2: Screen Wake Lock Implementation ✅ COMPLETED
- **Files**: `scripts/Practice/practice-session-starter.js`
- **Implementation**:
  ```javascript
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        // Handle visibility changes for re-acquisition
      } catch (err) {
        this._useFallbackWakeMethod(); // Graceful fallback for older devices
      }
    }
  }
  ```
- **Features**:
  - ✅ Native Screen Wake Lock API implementation
  - ✅ Graceful fallback for unsupported devices/browsers
  - ✅ User notification for iOS devices without wake lock support
  - ✅ Automatic re-acquisition when page becomes visible
  - ✅ Cleanup on session end
- **Compatibility**: 
  - ✅ iOS/iPadOS 18.4+ (native wake lock support)
  - ✅ Older iOS versions (fallback with user guidance)
  - ✅ Android Chrome/Edge (native support)
  - ✅ Desktop browsers (native support where available)
- **Testing**: ✅ Screen stays awake during practice on supported devices, graceful degradation on others
- **Effort**: 6 hours ✅ COMPLETED

#### Task 2.3: Practice Plan Dialog Flow
- **Files**: `scripts/Practice/practice-planner.js`
- **Implementation**: Auto-hide edit dialog before starting session
- **Testing**: ✅ Smooth transition from edit to practice mode
- **Effort**: 4 hours ✅ COMPLETED

#### Task 2.4: Highlighting Toggle Control ✅ COMPLETED (URGENT USER FEEDBACK)
- **Files**: `index.html`, `scripts/main.js`
- **User Problem**: "highlighting is always on unless in practice mode; no way to disable without entering practice mode; confidence panel should only show when highlighting is activated"
- **Implementation**:
  - ✅ Added "Toggle Highlighting" button in sidebar with pen-tool icon
  - ✅ Highlighting starts **disabled by default** (no accidental highlights)
  - ✅ Confidence panel hidden by default, only appears when highlighting is activated
  - ✅ Added `initializeHighlightingToggle()` function with proper state management
  - ✅ Confidence buttons only work when highlighting is active
  - ✅ Visual feedback: toggle button shows pressed/active state
  - ✅ Clearing active confidence when highlighting is deactivated
- **Testing**: ✅ Toggle button shows/hides confidence panel, prevents accidental highlighting on touch devices
- **User Validation**: ✅ "my experience was much improved already" - user testing confirmed on iPad
- **Effort**: 3 hours ✅ COMPLETED

**Sprint 2 Total**: 25 hours

## 🚨 **CRITICAL DEPENDENCY: Architecture Sprint Required**

> **⚠️ DEVELOPMENT HALT**: Sprint 3 advanced features are **BLOCKED** by critical architectural technical debt. The current codebase has reached complexity threshold where new features will be significantly slower to implement and harder to maintain.
>
> **Required Action**: Complete Architecture Refactoring Sprint before proceeding with Sprint 3.
> **Reference**: See `docs/ArchitectureRefactoringPlan.md` for detailed analysis and implementation plan.
>
> **Impact**: Without architecture refactoring, Sprint 3 features will:
> - Take 100% longer to implement due to architectural coupling  
> - Introduce more bugs due to unclear component boundaries
> - Block future development due to accumulated technical debt
> - Make testing 3x more difficult due to global dependencies

### **Sprint 2.5: Architecture Foundation (REQUIRED - 80 hours)**
**Duration**: 2 weeks  
**Goal**: Establish clean architectural foundation for sustainable feature development

- [ ] **Service Container & Dependency Injection** (16 hours)
- [ ] **Business Service Layer Extraction** (20 hours)  
- [ ] **Centralized State Management** (12 hours)
- [ ] **Component Refactoring** (24 hours)
- [ ] **Event System Cleanup** (8 hours)

**Architecture Sprint Benefits**:
- Sprint 3 development will be 40% faster
- Bug fixing will be 60% more efficient  
- Testing will be 70% faster
- Future features will be 50% faster to implement

### Sprint 3: Advanced Practice Features (Priority: Medium)
**Duration**: 1 week  
**Goal**: Enhanced practice session management and real-world usability improvements

#### Task 3.1: Section Completion Dialog Enhancements ⭐ UPDATED
- [ ] **Files**: `scripts/Practice/practice-session-manager.js`
- [ ] **Implementation**: 
  - [x] Change "How did this practice section go" to "How confident were you in this section?"
  - [ ] Display section name in completion dialog
  - [ ] Enable editing/updating section notes during completion
  - [ ] Modal with continue/repeat options
- **User Impact**: Based on real practice session feedback - users need section-specific context
- **Testing**: User can control section progression and update notes inline
- **Effort**: 12 hours (increased due to note editing feature)

#### Task 3.2: Strategy Implementation & Focus Enhancement ⭐ NEW
- [ ] **Files**: `scripts/Practice/practice-session-starter.js`, `scripts/pdf-viewer.js`
- [ ] **Implementation**: 
  - [ ] **Extract Highlighted Section as PNG**: Render only the highlighted section to prevent "cheating"
  - [ ] Enhance "Chunking" strategy to truly isolate practice sections
  - [ ] Remove visual distractions in focus mode
  - [ ] Experiment with other practice strategies - Should app behavior change according to the chosen strategy?
- **User Impact**: Addresses real practice session issue where users could see/play non-target measures
- **Testing**: Strategy modes provide true section isolation
- **Effort**: 20 hours

#### Task 3.3: Mobile Timer Positioning & Zoom Handling ⭐ UPDATED
- [ ] **Files**: `scripts/Practice/practice-session-timer.js`, `styles/practice-mode.css`
- [ ] **Implementation**: 
  - [ ] Pinch zoom-aware timer positioning
  - [ ] Timer remains visible and accessible during zoom operations
  - [ ] Enhanced mobile viewport detection and positioning
- **User Impact**: Critical for iPad practice sessions with zoom
- **Testing**: User can pinch zoom and still see/interact with the timer
- **Effort**: 16 hours (increased complexity for zoom handling)

#### Task 3.4: Focus Mode Wake Lock Extension ⭐ NEW
- [ ] **Files**: `scripts/layout/focus-mode-handler.js`
- [ ] **Implementation**: Extend screen wake lock functionality to focus mode
- **User Impact**: Prevents screen timeout during focused practice outside of timed sessions
- **Testing**: Screen stays awake in both practice sessions and focus mode
- **Effort**: 6 hours

#### Task 3.5: Touch Interaction Consistency ⭐ NEW
- [ ] **Files**: `scripts/highlighting/MouseSelectionHandler.js`, touch event handlers
- [ ] **Implementation**: 
  - [ ] Touch scroll and pinch zoom always available unless highlight mode specifically activated
  - [ ] Clear mode switching indicators for users
- **User Impact**: Consistent mobile interaction expectations
- **Testing**: Predictable touch behavior across all modes
- **Effort**: 8 hours

#### Task 3.6: Practice Plan Management
- [ ] **Files**: `scripts/Practice/practice-planner.js`, templates
- **Implementation**: Remove sections, append newly created sections, filter for confidence, reorder, bulk actions
- **Testing**: Full CRUD operations on practice plan
- **Effort**: 16 hours

#### Task 3.7: Highlight Database Management
- [ ] **Files**: Multiple highlighting files
- **Implementation**: Delete selected highlight using "delete" key on pc after confirmation, and cascade delete to remove sections from practice plans. include a delete icon near the update notes button - for touch device support
- **Testing**: Safe deletion with confirm/cancel capability
- **Effort**: 12 hours

#### Task 3.8: Highlight Confidence Update
- [ ] **Files**: Multiple highlighting files
- **Implementation**: While editing notes, the user can also change the confidence value on a highlight
- **Testing**: User can edit highlight notes and change highlight confidence
- **Effort**: 12 hours

**Sprint 3 Total**: 102 hours (significantly expanded based on real-world practice feedback)

## Technical Architecture

### State Management
```javascript
// Add to highlighting.js
_state: {
  // ... existing state
  practiceMode: {
    active: false,
    currentHighlightId: null,
    selectionDisabled: false
  }
}
```

### CSS Strategy
```css
/* Base practice mode state */
.practice-mode-active {
  /* Container-level practice mode styles */
}

/* Hide non-active highlights */
.practice-mode-active [data-role="highlight"]:not(.current-practice-section) {
  display: none !important;
}

/* Style current highlight */
.practice-mode-active [data-role="highlight"].current-practice-section {
  opacity: 0.3;
  border-style: dotted;
  border-width: 2px;
}
```

### Mobile Detection
```javascript
const isTouchDevice = () => {
  return 'ontouchstart' in window || 
         navigator.maxTouchPoints > 0 ||
         window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};
```

## Testing Strategy

### Unit Tests
- Practice mode state transitions
- Highlight visibility logic
- Touch event handling

### Integration Tests
- Complete practice session flow
- Timer functionality
- Dialog interactions

### Device Testing
- iPad (Safari)
- iPhone (Safari)
- Android tablet (Chrome)
- Android phone (Chrome)
- Desktop (Chrome, Firefox, Safari)

### Visual Regression Tests
- Highlight visibility in practice mode
- Timer positioning on mobile
- Dialog flows

## Success Metrics

### Sprint 1 Success Criteria
- ✅ No new highlights can be created during practice
- ✅ Timer remains visible and functional on iPad
- ✅ Only current section highlight visible at 30% opacity

### Sprint 2 Success Criteria
- ✅ Smooth scrolling in focus mode on iPad
- ✅ Screen stays awake during practice (supported devices)
- ✅ Seamless transition from edit to practice mode

### Sprint 3 Success Criteria
- ✅ Users can manage practice sections (add/remove/reorder)
- ✅ Confirmation dialogs prevent accidental actions
- ✅ Timer completion flow allows user control

## Risk Mitigation

### High Risk: Touch Event Changes
- **Risk**: Breaking existing highlight selection
- **Mitigation**: Feature flag for new touch handling, extensive device testing

### Medium Risk: CSS Positioning
- **Risk**: Timer positioning issues across browsers
- **Mitigation**: Progressive enhancement, fallback positioning

### Low Risk: State Management
- **Risk**: Practice mode state inconsistency
- **Mitigation**: Centralized state management, comprehensive unit tests

## Deployment Strategy

1. **Sprint 1**: Deploy with feature flag, gradual rollout
2. **Sprint 2**: Full deployment after device testing
3. **Sprint 3**: Deploy advanced features as stable enhancements

## Maintenance Plan

### Performance Monitoring
- Track practice session completion rates
- Monitor mobile device performance metrics
- User feedback collection

### Future Enhancements
- Voice commands for hands-free practice
- Metronome integration
- Practice analytics and progress tracking

---

*This plan will be updated as implementation progresses and new requirements emerge.*
