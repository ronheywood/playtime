# Visual Approval Tests (Playwright)

These tests help prevent unexpected UI regressions by comparing current screenshots to committed baselines using Playwright's `toHaveScreenshot()` (Pixelmatch under the hood).

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
- If design intentionally changes, re-run with `--update-snapshots` and commit new baselines.
