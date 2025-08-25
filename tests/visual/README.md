# HighlightActionButton Visual Tests

This test suite validates the visual appearance and behavior of the HighlightActionButton component using Playwright's screenshot comparison capabilities.

## Test Coverage

### 1. Basic Component Creation (`action-button-basic.png`)
- **Purpose**: Verifies the action button can be created and displays correctly
- **Validates**: Basic styling, positioning, and visibility
- **Elements**: Mock green highlight with associated action button

### 2. Lucide Icon Rendering (`action-button-icon-detail.png`)
- **Purpose**: Ensures the Lucide notebook-pen icon renders properly within the button
- **Validates**: SVG icon integration, icon visibility, and proper Lucide attributes
- **Elements**: Action button with focus on the notebook-pen icon

### 3. Positioning and Styling (`action-button-positioning-context.png`)
- **Purpose**: Tests positioning logic with multiple highlights in different locations
- **Validates**: Relative positioning, container boundaries, and multi-highlight scenarios
- **Elements**: Three mock highlights (red, green, amber) with action button on the amber highlight

### 4. Hover State (`action-button-normal-state.png` & `action-button-hover-state.png`)
- **Purpose**: Captures normal and hover states to verify interactive styling
- **Validates**: Hover animations, scaling effects, and visual feedback
- **Elements**: Action button in both normal and hovered states

## Test Architecture

### Setup
- Uses `http://localhost:8080` for testing against the live application
- Cleans up existing action buttons and test highlights before each test
- Creates mock highlight elements with realistic styling and positioning

### Mock Highlights
Tests create temporary DOM elements that simulate real highlights:
- Positioned absolutely within the PDF viewer container
- Include proper data attributes (`data-color`, `data-hl-confidence`)
- Styled with semi-transparent backgrounds and colored borders

### Action Button Creation
- Uses the actual `HighlightActionButton` class from the application
- Initializes with proper configuration
- Demonstrates real-world usage patterns

## Usage

```bash
# Generate new baseline screenshots
npx playwright test tests/visual/action-button.spec.ts --update-snapshots

# Validate against existing screenshots
npx playwright test tests/visual/action-button.spec.ts

# Run specific test
npx playwright test tests/visual/action-button.spec.ts -g "hover state"
```

## Screenshot Naming Convention

Screenshots follow Playwright's standard naming:
- `{test-description}-{browser}-{platform}.png`
- Example: `action-button-basic-chromium-win32.png`

## Maintenance

Visual tests should be updated when:
1. Action button styling changes (colors, size, borders)
2. Icon changes (different Lucide icon or styling)
3. Positioning logic modifications
4. Hover effects or animations are altered

The visual tests provide a safety net against unintended visual regressions and serve as documentation of the expected appearance of the HighlightActionButton component.
