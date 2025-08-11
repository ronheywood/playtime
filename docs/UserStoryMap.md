# User Story Map: PlayTime Rapid Prototype

**User Persona:** Musician

This story map outlines the core user activities, tasks, and stories for a rapid prototype of the PlayTime application, focusing on local PDF management and basic section highlighting.

| Activity                 | Task / User Step                                     | User Stories (MVP - Rapid Prototype)                                                                                                                                                              | Technical Notes (for prototype)                                                                 |
|--------------------------|------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| **1. Manage Music Scores** | 1.1 Add New Score                                    | - As a musician, I want to upload a PDF score from my device so that I can analyze and practice it.<br>- As a musician, I want the uploaded PDF file to be saved locally in my browser so I don't have to re-upload it every time. | Use `<input type="file">`. Store PDF `Blob` and metadata (filename) in IndexedDB.                 |
|                          | 1.2 View & Select Existing Score                     | - As a musician, I want to see a list of all scores I've previously added so I can easily find them.<br>- As a musician, I want to select a score from my list to open and view its content. | Retrieve list of stored PDFs from IndexedDB. On selection, load the PDF `Blob` for display.       |
| **2. Analyze Score** | 2.1 View PDF Score                                   | - As a musician, I want to view the pages of my selected PDF score clearly on the screen.                                                                                                         | Render PDF pages onto an HTML `<canvas>` element using PDF.js. Implement basic page navigation (e.g., next/previous page). Implement scale controls (eg. zoom in / out buttons ) |
| **3. Practice Score**          | 3.1 Distraction-Free Mode                            | - As a musician, I want to hide all non-essential UI elements so I can focus solely on the score.                                                                                                       | Toggle a CSS class on the `<body>` to hide sidebars, headers, etc.                              |
| **4. Practice Marked Sections** | 4.1 Highlight Sections                               | - As a musician, I want to draw a rectangle over a part of the score to define a practice section.<br>- As a musician, I want to assign a color code (green, amber, or red) to each section I define to indicate my confidence level. | Capture mouse/touch events on the canvas to get coordinates. Draw visual feedback for the selection and color. |
|                          | 4.2 Persist Highlights                               | - As a musician, I want the highlighted sections (their location and color) to be saved locally with the score so they are there when I reopen it.                                              | Store an array of highlight objects (coordinates, color, associated PDF ID) in IndexedDB.         |
|                          | 4.3 Focus on a Highlighted Section                 | - As a musician, I want to be able to select one of my highlighted sections from the score.<br>- As a musician, I want the application to display only the selected section, or zoom in on it, so I can focus my practice. | When a highlight is selected, use its coordinates to re-render/crop the view on the canvas, or apply a zoom, to focus on that specific area. **[High Risk: Coordinate mapping]** |

**Out of Scope for Rapid Prototype (Future Considerations):**
*   Arranging sections into a structured practice plan.
*   Integrating specific deliberate practice strategy tools.
*   Cloud storage and synchronization.
*   Advanced PDF annotation features beyond simple colored rectangles.
*   User accounts.
