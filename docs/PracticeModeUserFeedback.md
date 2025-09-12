# User Feedback: PlayTime Practice Sessions

## Latest Session Feedback (Piano Practice)

### Positive Outcomes
- Practice session was very effective at making tricky passages accessible
- Screen wake lock functionality worked well on iPad to prevent timeout during practice

### Areas for Improvement

#### 1. Strategy Implementation & Focus ("Chunking" Strategy)
- **Issue**: Even with highlight visible, other measures on score are still visible, leading to "cheating" by playing through to non-target sections
- **Suggested Solution**: Extract highlighted section as PNG for true isolation (see **Extract Highlighted Section as PNG** feature)

#### 2. Mobile UI & Navigation
- **Issue**: When using pinch zoom on iPad to focus on highlighted section, timer disappears from view
- **Impact**: Loses track of practice timing

#### 3. Section Completion Dialog Improvements
- **Issue**: End dialog says "rate this session" instead of "rate this section"
- **Missing**: Section name not shown in completion dialog
- **Missing**: Cannot edit/update notes made on that section during completion

#### 4. Focus Mode Wake Lock
- **Issue**: Screen wake lock should also be active during focus mode, not just practice sessions
- **Current**: Only works in practice sessions

#### 5. Touch Interaction Consistency
- **Issue**: Touch scroll and pinch zoom should always be available unless highlight mode is specifically activated
- **Current**: Inconsistent behavior between modes

#### 6. Focus Mode UI Distraction
- **Issue**: May need to remove additional UI elements that are distracting during focus

## IPad experience
- The timer does not appear fixed at the top of the page on an iPad
- It is hard to scroll the score on iPad in focus mode as dragging on the canvas is intercepted by highlighting mode
(See related issue in all platforms - Adding new Highlights should not happen while in practice mode)
- The ipad screen timeout interrupts practice, when using the web app

## All platforms - High Priority
- Only the highlight for the currecnt section being practiced should be visible in practice mode - and the opacity should be greatly reduced - or it could even just be a discrete dotted border
- Click Edit practice plan in the left panel then Start practice plan 
button in the left panel should hide the "edit practice plan" diaglog - before starting the practice session
- Adding new Highlights should not happen while in practice mode

## Medium Priority
- Need to be able to remove sections from the practice plan
- Need to be able to remove highlight from the database
- There could be a dialog shown when the timer runs out to confirm practice finished, before moving to the next section
- Add Highlight confidence modes should be specifically enabled not shown by default

---

# Developer Analysis & Implementation Plan

## Complexity & Benefit Analysis

### High Priority Issues

#### 1. iPad Timer Positioning
**Complexity**: Medium (CSS positioning + mobile detection)
**Benefit**: High (core functionality broken on popular platform)
**Technical Details**: Current timer uses relative positioning which breaks on mobile Safari. Need `position: fixed` with proper z-index and viewport detection.
**Files**: `styles/practice-mode.css`, `scripts/Practice/practice-session-timer.js`

#### 2. Highlight Selection Disabled in Practice Mode
**Complexity**: Low (disable existing functionality)
**Benefit**: Very High (prevents accidental disruption of practice)
**Technical Details**: `MouseSelectionHandler` already has `destroy()` method. Need to call this when entering practice mode and restore when exiting.
**Files**: `scripts/highlighting/highlighting.js`, `scripts/Practice/practice-session-starter.js`

#### 3. Practice Mode Highlight Visibility
**Complexity**: Medium (selective display + styling)
**Benefit**: High (focus enhancement, core UX)
**Technical Details**: Add CSS class for practice mode that hides non-active highlights and reduces opacity. Current highlighting system tracks highlight IDs.
**Files**: `styles/practice-mode.css`, `scripts/Practice/practice-session-starter.js`

#### 4. iPad Touch Scrolling Issues
**Complexity**: High (touch event handling + focus mode interaction)
**Benefit**: High (usability on primary mobile platform)
**Technical Details**: Current `MouseSelectionHandler` intercepts touch events. Need practice-mode-aware touch handling that allows scrolling when selection is disabled.
**Files**: `scripts/highlighting/MouseSelectionHandler.js`, `styles/practice-mode.css`

#### 5. Dialog Flow Issues
**Complexity**: Low (UI state management)
**Benefit**: Medium (workflow improvement)
**Technical Details**: Practice planner needs to hide edit dialog before starting session.
**Files**: `scripts/Practice/practice-planner.js`

### Medium Priority Issues

#### 6. Practice Plan Section Management
**Complexity**: Medium (CRUD operations + UI updates)
**Benefit**: Medium (user control enhancement)
**Technical Details**: Add remove buttons to practice sections, update persistence.
**Files**: `scripts/Practice/practice-planner.js`, templates

#### 7. Timer Completion Dialog
**Complexity**: Low (modal dialog + timer integration)
**Benefit**: Medium (prevents accidental progression)
**Technical Details**: Intercept timer completion, show confirmation before advancing.
**Files**: `scripts/Practice/practice-session-timer.js`

#### 8. Wake Lock API for Screen Timeout
**Complexity**: Medium (browser API + fallback handling)
**Benefit**: High on mobile (prevents interruption)
**Technical Details**: Use Screen Wake Lock API with fallbacks for unsupported browsers.
**Files**: `scripts/Practice/practice-session-starter.js`

## Development Iteration Plan

### Sprint 1: Core Practice Mode Experience (1-2 weeks)
**Goal**: Fix fundamental usability issues that break practice sessions

**Tasks**:
1. **Disable highlight selection in practice mode**
   - Modify `scripts/Practice/practice-session-starter.js` to call `window.PlayTimeHighlighting.disableSelection()` on session start
   - Restore selection on session end
   - Add visual indicator that selection is disabled

2. **Fix iPad timer positioning**
   - Update `styles/practice-mode.css` with mobile-first timer positioning
   - Add media queries for touch devices
   - Test on iPad Safari and Android Chrome

3. **Implement practice-mode highlight visibility**
   - Add CSS class `.practice-mode-active` to viewer when practice session starts
   - Style to show only current highlight with reduced opacity (0.3)
   - Hide all other highlights with `display: none`

**Definition of Done**: Practice sessions work without interruption on iPad and desktop

### Sprint 2: Touch & Scrolling Improvements (1 week)
**Goal**: Perfect mobile interaction during practice

**Tasks**:

3. **Fix practice plan dialog flow**
   - Update practice planner to auto-hide edit dialog on session start
   - Improve transition animations

**Definition of Done**: Smooth touch interaction during practice on all mobile devices

### Sprint 3: Advanced Practice Features (1 week)
**Goal**: Enhanced practice session management

**Tasks**:
1. **Practice plan section management**
   - Add remove buttons to practice sections
   - Drag-and-drop reordering
   - Bulk actions (remove all, duplicate)

**Definition of Done**: Complete practice session management with all user-requested features

## Technical Implementation Notes

### State Management Strategy
- Add `practiceMode` state to highlighting module
- Use CSS classes for visual state changes
- Centralize practice mode detection

### Mobile-First Approach
- Use `@media (hover: none) and (pointer: coarse)` for touch device detection
- Implement touch-friendly sizing (44px minimum touch targets)
- Progressive enhancement from mobile base

### Testing Strategy
- Visual regression tests for highlight visibility changes
- Cross-browser testing on iOS Safari, Android Chrome
- Practice session flow integration tests

### Performance Considerations
- Minimal DOM manipulation during practice sessions
- CSS-only hide/show for highlights (no JS iteration)
- Debounced touch event handlers

## Risk Assessment

**Low Risk**: Highlight selection disable, dialog improvements
**Medium Risk**: Timer positioning (CSS cross-browser), practice highlight visibility  
**High Risk**: Touch event handling changes (potential for breaking existing functionality)

**Mitigation**: Feature flags for new touch handling, thorough testing on real devices, progressive rollout