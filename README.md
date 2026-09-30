# Johnny's Pool Services website

A single-page site for Johnny's Pool Services, serving Cape Town and the Western Cape.

- `index.html` is the website. `logos.html` shows the five logo options.
- `logos/` holds each logo as an SVG file (icon, plus a logo for light and for dark backgrounds).

## Preview locally
The 3D effects use JavaScript modules, so the site has to be served rather than opened as a file:

    python -m http.server 5510

Then open http://localhost:5510.

## Changing the logo
The site uses the "Mosaic" logo. To switch, change `data-logo="mosaic"` in `index.html`
(header and footer) to `refraction`, `plan`, `badge` or `droplet`, change the id in
`tools/export-logos.mjs`, then run `node tools/export-logos.mjs` to rebuild `favicon.svg`.

## Photos and 3D assets
- `Our Work/` holds the original job photos; web-sized copies live in `assets/work/`.
- `assets/3d/` holds CC0 assets from Poly Haven (polyhaven.com): the "Pretoria Gardens"
  panorama and HDRI, and the wood_floor_deck, white_stucco and concrete_floor_01 textures.

## Hosting
The site is plain static files, so any static host works (Netlify, Vercel, GitHub Pages, cPanel hosting).

## SEO and link previews
- Link previews (WhatsApp, Facebook) use `assets/brand/og-image.jpg`. Rebuild it and the app icons with
  `python tools/make-social.py` (needs Pillow) if the logo or photo changes.
- Structured data (LocalBusiness, services, FAQ) lives in the `application/ld+json` block in `index.html`.
- `sitemap.xml` lists the pages; submit it in Google Search Console.
- If the site moves to its own domain, replace `https://obsidianstudiodesigns.github.io/JohnnysPoolServices/`
  everywhere (index.html, privacy.html, terms.html, sitemap.xml, robots.txt).
