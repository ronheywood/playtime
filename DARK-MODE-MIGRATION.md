# Dark Mode Migration Plan

## 🎯 Migration: From Current UI to Dark Mode Design

### 📋 Analysis of Current vs Target State

**Current (`index.html`):**
- Basic two-column layout (sheet music + sidebar)
- Tailwind + custom CSS hybrid
- Basic controls and file upload
- Simple color scheme

**Target (`todo-dark-mode.html`):**
- Sophisticated dark/light mode system
- CSS custom properties for theming
- Advanced layout with proper spacing
- Professional button/card components
- Mobile-responsive with hamburger menu
- Theme persistence

### 🚀 Migration Steps

#### **Phase 1: CSS Foundation & Theme System**
- [/] Replace basic styling with CSS custom properties system
- [/] Add dark/light mode CSS variables
- [/] Implement theme-aware utility classes
- [/] Add smooth transitions for theme switching
- [/] Keep existing element IDs and classes for JS compatibility

#### **Phase 2: Layout Structure Migration**
- [ ] Migrate to flex-based layout system
- [ ] Update sidebar to match target design (fixed width, proper padding)
- [ ] Implement proper card components for score list
- [ ] Add top toolbar area
- [ ] Ensure all existing element selectors remain functional

#### **Phase 3: Component Styling**
- [ ] Upgrade buttons to use new btn classes
- [ ] Style navigation controls with proper spacing
- [ ] Implement professional score list cards
- [ ] Add proper form styling for file upload
- [ ] Style highlight controls with new design

#### **Phase 4: Dark Mode Toggle & Logic**
- [ ] Add dark mode toggle button
- [ ] Implement theme switching JavaScript
- [ ] Add localStorage persistence
- [ ] Ensure sheet music stays light for readability
- [ ] Test all existing functionality works in both themes

#### **Phase 5: Mobile Responsiveness**
- [ ] Add mobile menu system
- [ ] Implement responsive sidebar behavior
- [ ] Add mobile overlay functionality
- [ ] Test all features work on mobile

#### **Phase 6: Integration & Testing**
- [ ] Verify all existing JavaScript selectors work
- [ ] Test PDF rendering, navigation, highlighting
- [ ] Test score upload and selection
- [ ] Verify acceptance tests still pass
- [ ] Polish transitions and interactions

### 🔧 Key Technical Considerations

1. **Preserve Existing Functionality:**
   - Keep all element IDs: `#pdf-canvas`, `#pdf-upload`, `#scores-list`, etc.
   - Maintain class names used by JavaScript: `.score-item`, `.current-score-title`, etc.
   - Preserve existing script loading order

2. **CSS Strategy:**
   - Replace current CSS with CSS custom properties
   - Add theme-switching without breaking existing styles
   - Maintain all functional classes (`.selection-overlay`, `.practice-controls`, etc.)

3. **JavaScript Compatibility:**
   - All existing event handlers should continue working
   - PDF.js integration remains unchanged
   - Database and score management stays functional

### 📝 Implementation Priority

1. **Start with CSS foundation** - This gives immediate visual improvement
2. **Migrate layout structure** - Maintains all functionality while improving design
3. **Add dark mode toggle** - Progressive enhancement
4. **Mobile responsive features** - Additional user experience improvement

### 🧪 Testing Strategy

- Run acceptance tests after each phase
- Manual testing of all features in both light/dark modes
- Cross-browser testing for theme persistence
- Mobile device testing for responsive features

### 📋 Progress Tracking

**Current Phase:** Phase 2 - Layout Structure Migration

**Completed Tasks:**
- [x] Created migration plan document

#### **Phase 1: CSS Foundation & Theme System** ✅ **COMPLETE**
- [x] Replace basic styling with CSS custom properties system
- [x] Add dark/light mode CSS variables
- [x] Implement theme-aware utility classes
- [x] Add smooth transitions for theme switching
- [x] Keep existing element IDs and classes for JS compatibility
- [x] Test Phase 1 implementation - **ALL TESTS PASSED** ✅

**Next Actions:**
- [ ] Begin Phase 2 - Layout Structure Migration
- [ ] Migrate to flex-based layout system
- [ ] Update sidebar to match target design

### 📝 Notes

- Maintaining backward compatibility with existing JavaScript
- Ensuring all acceptance tests continue to pass
- Progressive enhancement approach - app remains functional if CSS fails
- Focus on user experience improvements while preserving core functionality
