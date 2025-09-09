# Technology Choices: PlayTime Rapid Prototype

This document outlines the key technology choices made for the rapid prototype of the PlayTime application, aligning with the goal of a lightweight, portable web application with offline capabilities for core features.

## 🎯 **Cross-Platform Strategy Decision (Sep 9, 2025)**

## 🎯 **Cross-Platform Strategy Decision (Sep 9, 2025)**

**Expected Value Analysis**: After evaluating full platform abstraction vs. pragmatic hybrid approach:
- **Probability of iOS port**: 20% (2 in 10 scenarios based on customer interest)
- **Full abstraction cost**: 24 hours upfront + 15% slower web development
- **Expected value**: +18 hours (pragmatic approach wins)

**Decision**: **Pragmatic Hybrid Approach** - Smart abstractions that improve web development AND preserve cross-platform options.

### **React Native Consideration (Sep 9, 2025)**

**Alternative Migration Path Analysis**: React Native as potential iOS strategy:

#### **Option Comparison at 20% Probability:**
- **Pure Pragmatic (8h)**: +8h expected value (immediate web benefits, no mobile prep)
- **React Native Ready (12h)**: +8h expected value (4h mobile prep + smaller web benefits)  
- **Full Abstraction (24h)**: +5h expected value (over-engineering penalty)

**Conclusion**: At 20% probability, React Native preparation **doesn't justify the 4h investment**. Both pragmatic and React Native ready approaches yield identical expected value (+8h).

**Strategy**: 
1. Implement smart abstractions (8h) for immediate web benefits
2. Document clean React Native migration path in architecture
3. **Wait for market signal** before investing in React Native compatibility
4. Breakeven point: ~35-40% probability would justify React Native preparation

**Rationale**: This is a real options problem - the option premium (4h) doesn't justify the expected payoff at current probability levels.

### **React Migration Analysis (Sep 9, 2025)**

**Question**: Would React speed up new feature development compared to vanilla JS + smart abstractions?

#### **React Development Speed Analysis:**
- **Simple Features** (dialogs, forms): React faster once established, vanilla competitive with good patterns
- **Complex Features** (practice sessions, highlighting): React significant advantage with component state
- **PDF Integration**: React potential complications, vanilla maintains direct control

#### **Migration Cost vs Speed Benefit:**
- **Migration cost**: 20h (convert existing codebase + build setup)
- **Future development speed**: +25% faster with React
- **Breakeven point**: 80h of future development (20h ÷ 0.25 = 80h)
- **Current projection**: ~40h development planned
- **Expected value**: (40h × 0.25) - 20h = **-10 hours**

#### **Decision**: **Stick with Vanilla + Smart Abstractions**
**Rationale**: 
- Migration cost (20h) outweighs speed benefits at current development volume
- Smart abstractions provide 70% of React's architectural benefits
- PDF.js integration already optimized for vanilla approach
- Maintains lightweight, fast-loading app characteristics

**Threshold**: If future development exceeds 80h, React migration becomes worthwhile.

### **Phase 1: Essential Abstractions (8 hours)**
Focus on interfaces that provide immediate web benefits while enabling future portability:
- Event bus abstraction (easier testing + cross-platform ready)
- Storage interface (better mocking + platform agnostic)
- Business logic extraction (cleaner architecture + reusable across platforms)

### **Phase 2: Defer Complex UI Abstraction**
Skip renderer/gesture abstraction until iOS port becomes reality. Current web-specific patterns acceptable for:
- DOM manipulation
- PDF.js integration
- Canvas operations

### **Rationale**
- **80% scenarios**: Web-only forever - get cleaner architecture without over-engineering
- **20% scenarios**: iOS port - business logic reuses 100%, UI layer needs platform-specific implementation
- **Risk mitigation**: Document "portability debt" as web-specific code is created

## Core Technologies

*   **HTML (HyperText Markup Language):**
    *   **Choice:** Standard for web content structure.
    *   **Reasoning:** Essential for any web application. Provides the semantic foundation for the UI.
*   **CSS (Cascading Style Sheets):**
    *   **Choice:** Standard for styling web content.
    *   **Reasoning:** Necessary for creating a visually appealing and user-friendly interface, especially for tablet usability.
*   **JavaScript (Vanilla):**
    *   **Choice:** Primary language for client-side logic.
    *   **Reasoning:**
        *   **Universality:** Runs in all modern browsers without external dependencies.
        *   **Lightweight:** Keeps the initial application size small.
        *   **Control:** Provides fine-grained control over the application's behavior.
        *   **LEAN Approach:** Allows for rapid development of core features without framework overhead for the prototype.
    *   **Consideration:** Vue.js was mentioned as a preferred library if more complex state management or componentization is needed later, but for the MVP, vanilla JS is the starting point.

## PDF Handling

*   **PDF.js (by Mozilla):**
    *   **Choice:** Client-side JavaScript library for rendering PDF documents.
    *   **Reasoning:**
        *   **No Server-Side Dependency:** Allows PDFs to be rendered directly in the browser, crucial for a portable, client-focused application.
        *   **Open Source & Well-Maintained:** A mature and widely used library.
        *   **Canvas Rendering:** Enables rendering PDF pages onto HTML `<canvas>` elements, which is necessary for custom interactions like highlighting.

## Local Data Storage

*   **IndexedDB:**
    *   **Choice:** Browser-based NoSQL database for storing significant amounts of structured data, including files/Blobs.
    *   **Reasoning (for Rapid Prototype):**
        *   **Offline Storage:** Enables users to store PDF files and their associated markup (highlighted sections) directly in their browser.
        *   **Quick to Implement for MVP:** Provides a fast way to achieve local persistence without setting up backend infrastructure.
        *   **Handles Blobs:** Can store PDF files (as `Blob` objects) directly.
    *   **Limitations Acknowledged:**
        *   Browser storage quotas can be restrictive.
        *   Data is local to the specific browser and device and can be cleared by the user.
        *   Not suitable for data synchronization across devices.
    *   **Future Consideration:** Cloud storage is noted as a future improvement for scalability and multi-device access, with IndexedDB potentially serving as a local cache.

## Portability & Deployment

*   **Focus on Web Standards:**
    *   **Choice:** Relying on HTML, CSS, and JavaScript.
    *   **Reasoning:** Maximizes portability across devices and operating systems that have modern web browsers.
*   **Progressive Web App (PWA) Potential:**
    *   **Consideration:** While not explicitly part of the immediate prototype build, the chosen technologies (especially client-side storage with IndexedDB and the desire for offline access) align well with PWA principles. This could be a future step to enhance the app-like experience.
*   **No Heavy Frameworks (for MVP):**
    *   **Choice:** Avoidance of large JavaScript frameworks like React or Angular for the initial prototype.
    *   **Reasoning:**
        *   **Reduced Bundle Size:** Leads to faster initial load times.
        *   **Simplicity for MVP:** Focuses development effort on core user stories.

## Summary

The technology stack for the PlayTime rapid prototype prioritizes a lean, client-centric approach using standard web technologies and `IndexedDB` for quick implementation of local PDF storage and markup. 

**Architecture Strategy**: Pragmatic hybrid approach balancing immediate web development velocity with future cross-platform options. Smart abstractions (event bus, storage interface, business logic) provide immediate benefits while preserving portability potential. Complex UI abstraction deferred until cross-platform need is validated.

This allows for rapid iteration and validation of core user needs while maintaining architectural flexibility for future platform expansion.

## Architecure

We need to get a grip on the architecture now.
We have some capabilities emerging and we need to ensure loose coupling to ensure they can be managed and extended efficiently and safely:

main.js
├── PlayTimeHighlighting.init()
├── createPlayTimePracticePlanner() 
└── registers event listeners

highlighting.js
├── imports: HighlightElement, CoordinateMapper, etc.
├── registers with: layout-commands.js
└── exports: PlayTimeHighlighting

practice-planner.js  
├── receives: highlightPersistenceService from highlighting
└── listens to: playtime:score-selected events

### Cross-cutting Concerns
- logger.js
- constants.js
- Event System (playtime:* events)

### Sheet Music Management
- **Application Layer**
    - pdf-viewer.js
    - score-list.js
- **Domain Layer**  
    - score.js
    - db/AbstractDatabase.js
- **Infrastructure Layer**
    - pdf.js (external)
    - db/IndexedDBDatabase.js
    - db/MemoryDatabase.js

### Highlighting & Annotation System
- **Application Layer**
    - highlighting/highlighting.js (main orchestrator)
    - highlighting/HighlightEventCoordinator.js
    - highlighting/HighlightPersistenceService.js
    - highlighting/HighlightActionButton.js
    - highlighting/HighlightAnnotationForm.js
- **Domain Layer**
    - highlighting/HighlightElement.js
    - highlighting/ConfidenceMapper.js  
    - highlighting/CoordinateMapper.js
- **Infrastructure Layer**
    - highlighting/MouseSelectionHandler.js
    - highlighting/SelectionOverlay.js

### Layout & Focus Management
- **Application Layer**
    - layout/layout-commands.js
    - layout/focus-mode-handler.js
    - layout/focus-mode-commands.js

### Practice Planning
- **Application Layer**
    - practice-planner.js
    - templates/practice-planner-template.js
- **Domain Layer**
    - Persistence Service, Practice session models, planning logic
- **Infrastructure Layer**
    - Reuses db/IndexedDBDatabase.js