# Visual Baseline Checklist

Use this checklist to capture reference screenshots (light/dark, tablet/desktop) and compare after UI changes.

## How to capture
- Start dev server (already done by psake StartServer) at http://localhost:3000
- Open the app with URL parameters to set initial theme:
  - Light:  http://localhost:3000/
  - Dark:   http://localhost:3000/?theme=dark
- Resize viewport to target sizes and capture PNGs:
  - Desktop: 1440×900
  - Tablet:  1024×768

## Pages/States
1) Sidebar default (no score selected)
2) Score selected (list shows selected, page badge visible)
3) Confidence state pressed (each of green/amber/red)

## Naming convention
- desktop-light.png
- desktop-dark.png
- tablet-light.png
- tablet-dark.png

## Manual checklist
- Typography: headings 600, body readable, no truncation
- Colors: contrast AA+, muted-foreground readable
- Spacing: consistent gutters, composed card paddings
- Icons: subtle, 16px in dense areas, stroke 1.5
- Focus: visible on keyboard navigation
- Motion: reduced when OS setting is enabled
