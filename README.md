# Volty light edition: conversion kit

The seven live pages are generated, not hand-edited. Keep this kit with the site.

- `light.css` is the full homepage stylesheet. `build_light.py` builds `index.html` from the dark `index.html`.
- `chrome.css` holds the shared light styling for the six inner pages: nav, buttons, red eyebrows, headings, pager, footer, framed hero.
- `pages.css` holds page-specific fixes, one block per page.
- `rollout.py` builds the six inner pages from their dark versions. It embeds the fonts, repaints dark colors light, rotates the section backgrounds (white, beige, warm beige), and appends the styles.
- Fonts are embedded as base64 in every page (fonts-inline.css, built from the woff2 files), so phones never depend on uploaded font files.
- Hero video: `volty-hero-loop.mp4/.webm/-poster.webp`, a flash-free 6.2 s cut of the orbit shot (7.75 s to 14.55 s of volty-hero.mp4) with a 0.6 s crossfade at the loop point.

Edit copy in the dark source pages, then rerun both builds.
