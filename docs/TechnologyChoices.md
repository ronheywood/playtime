# Technology Choices: PlayTime Rapid Prototype

This document outlines the key technology choices made for the rapid prototype of the PlayTime application, aligning with the goal of a lightweight, portable web application with offline capabilities for core features.

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

The technology stack for the PlayTime rapid prototype prioritizes a lean, client-centric approach using standard web technologies and `IndexedDB` for quick implementation of local PDF storage and markup. This allows for rapid iteration and validation of core user needs before considering more complex backend or cloud-based solutions.

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