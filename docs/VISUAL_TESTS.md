# Visual Approval Tests (Playwright)

These tests help prevent unexpected UI regressions by comparing current screenshots to committed baselines using Playwright's `toHaveScreenshot()` (Pixelmatch under the hood).

## Test Coverage

### Baseline Tests (`baseline.spec.ts`)
- **Core UI states**: Desktop/tablet × light/dark themes
- **Confidence color states**: Green, amber, red button states
- **Score selection**: Selected score appearance
- **Multipage navigation**: PDF navigation controls in different states
  - First page (prev disabled)
  - Middle page (both buttons enabled) 
  - Last page (next disabled)

### Highlighting Tests (`highlighting.spec.ts`)
- **Highlight rendering**: Seeded highlights on single-page PDFs
- **Drag creation**: Mouse-drawn highlights
- **Focus mode**: Zoom behavior and highlight persistence
- **Resize handling**: Layout recalculation during focus mode

### Multipage Tests (`multipage.spec.ts`)
- **Page-specific highlights**: Highlights that appear only on their respective pages
- **Navigation states**: Different page positions in multipage documents
- **Multiple highlights**: Several highlights on the same page
- **Focus mode**: Zoom behavior with multipage context
- **Extended documents**: 5+ page document navigation

## Data Approach

All visual tests use **synthetic data injection** rather than real PDF files:
- **Deterministic**: Same results every time
- **Fast**: No file I/O or PDF parsing
- **Lightweight**: No binary files in repository
- **Flexible**: Easy to test edge cases

Example synthetic multipage scenario:
```typescript
// Inject multipage PDF state via DOM manipulation
await page.evaluate(() => {
  const navControls = document.createElement('div');
  navControls.innerHTML = `
    <button data-role="nav-prev">Previous</button>
    <span data-role="page-info">Page 2 of 5</span>
    <button data-role="nav-next">Next</button>
  `;
  viewer.appendChild(navControls);
});
```

## One-time setup

```pwsh
npm run playwright:install
```

## Create/update baselines locally

```pwsh
npm run test:visual:update
```

This will:
- Start a local server at http://localhost:3000
- Capture screenshots for desktop/tablet × light/dark, plus confidence states
- Write baseline images to `tests/visual/__screenshots__/baseline.spec.ts-snapshots/`

## Run checks (compare against committed baselines)

```pwsh
npm run test:visual
```

## CI usage (GitHub Actions)
- Install browsers with `npm run playwright:install`
- Run `npm run test:visual`.
- Commit baseline images to the repo to make approvals stable.

## Tips
- Keep `deviceScaleFactor: 1` and disable animations to reduce noise.
- Ensure fonts are available on CI (Google Inter is loaded via CSS here).
- If design intentionally changes, re-run with `npm run test:visual:update` and commit new baselines.
