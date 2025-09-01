# Practice Mode Development Plan
*Generated from user feedback analysis - September 1, 2025*

## Executive Summary
This plan addresses critical usability issues in practice mode, particularly on iPad/mobile devices, and implements user-requested enhancements. The three-sprint approach prioritizes core functionality fixes before adding advanced features.

## Implementation Timeline

### Sprint 1: Core Practice Mode Experience (Priority: Critical)
**Duration**: 1-2 weeks  
**Goal**: Fix fundamental issues that break practice sessions

#### Task 1.1: Disable Highlight Creation in Practice Mode ✅ COMPLETED
- **Files**: `scripts/practice/practice-session-starter.js`, `scripts/highlighting/highlighting.js`, `scripts/highlighting/MouseSelectionHandler.js`
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
- **Files**: `styles/practice-mode.css`, `scripts/practice/practice-session-timer.js`, `index.html`, test files
- **Implementation**: 
  - ✅ Added responsive CSS with touch device media queries for fixed timer positioning
  - ✅ Enhanced JavaScript with mobile device detection using multiple signals (`ontouchstart`, `maxTouchPoints`, `matchMedia`)
  - ✅ Implemented dynamic timer positioning that moves out of toolbar on mobile devices
  - ✅ Added safe area support for devices with notches using `env(safe-area-inset-top)`
  - ✅ Updated all selectors to use consistent `data-role` attributes instead of IDs
  - ✅ Added proper test environment mocks for `navigator` and `matchMedia` APIs
- **Testing**: ✅ iPad Safari, iPhone Safari, Android Chrome, all unit and integration tests passing
- **Effort**: 6 hours ✅ COMPLETED

#### Task 1.3: Practice Mode Highlight Visibility
- **Files**: `styles/practice-mode.css`, `scripts/practice/practice-session-starter.js`
- **Implementation**:
  ```css
  .practice-mode-active [data-role="highlight"] {
    display: none;
  }
  
  .practice-mode-active [data-role="highlight"].current-practice-section {
    display: block;
    opacity: 0.3;
    border-style: dotted;
    border-width: 2px;
  }
  ```
- **Testing**: Visual verification of single visible highlight with reduced opacity
- **Effort**: 8 hours

**Sprint 1 Total**: 18 hours (Task 1.1 ✅ COMPLETED - 4 hours)

### Sprint 2: Touch & Scrolling Improvements (Priority: High)
**Duration**: 1 week  
**Goal**: Perfect mobile interaction during practice

#### Task 2.1: Improve iPad Touch Scrolling
- **Files**: `scripts/highlighting/MouseSelectionHandler.js`, `styles/practice-mode.css`
- **Implementation**:
  - Add practice mode detection to touch handlers
  - Allow `touch-action: pan-x pan-y pinch-zoom` when selection disabled
  - Prevent `event.preventDefault()` on touch events during practice
- **Testing**: Smooth scrolling in focus mode on iPad
- **Effort**: 12 hours

#### Task 2.2: Screen Wake Lock Implementation
- **Files**: `scripts/practice/practice-session-starter.js`
- **Implementation**:
  ```javascript
  async startWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock failed:', err);
      }
    }
  }
  ```
- **Testing**: Screen stays awake during practice on mobile
- **Effort**: 6 hours

#### Task 2.3: Practice Plan Dialog Flow
- **Files**: `scripts/practice/practice-planner.js`
- **Implementation**: Auto-hide edit dialog before starting session
- **Testing**: Smooth transition from edit to practice mode
- **Effort**: 4 hours

**Sprint 2 Total**: 22 hours

### Sprint 3: Advanced Practice Features (Priority: Medium)
**Duration**: 1 week  
**Goal**: Enhanced practice session management

#### Task 3.1: Timer Completion Dialog
- **Files**: `scripts/practice/practice-session-timer.js`
- **Implementation**: Modal with continue/repeat options
- **Testing**: User can control section progression
- **Effort**: 8 hours

#### Task 3.2: Practice Plan Management
- **Files**: `scripts/practice/practice-planner.js`, templates
- **Implementation**: Remove sections, reorder, bulk actions
- **Testing**: Full CRUD operations on practice plan
- **Effort**: 16 hours

#### Task 3.3: Highlight Database Management
- **Files**: Multiple highlighting files
- **Implementation**: Delete highlights with confirmation
- **Testing**: Safe deletion with undo capability
- **Effort**: 12 hours

**Sprint 3 Total**: 36 hours

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
