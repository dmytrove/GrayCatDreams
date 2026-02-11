# GrayCatDreams

Animated floating cats drifting through a starry night sky. Upload your own photos (e.g. of your cat), remove backgrounds in the browser, and get a shareable link to a floating animation. Features physics collisions, particle trails, shooting stars, constellation lines, ambient music, and a DVD screensaver mode.

## How to Run (Next.js)

The app runs as a **Next.js** project (App Router), deployable on [Vercel](https://vercel.com).

1. Install dependencies: `npm install`
2. Create a [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store and link the project (or run `vercel link` and add Blob in the dashboard).
3. Pull env: `vercel env pull` (for `BLOB_READ_WRITE_TOKEN`).
4. Run: `npm run dev` (or `npx next dev`).
5. Open the app (e.g. http://localhost:3000). Use **Upload your own** to add photos, remove backgrounds, and create a shareable dream link.

**Deploy:** `vercel` or push to a linked Git repo.

## Routes

| Path | Description |
|------|-------------|
| `/` | Homepage — demo animation with default cats + “Upload your own” link |
| `/upload` | Upload 1–10 images, remove background (client-side), create dream |
| `/dream/[id]` | Shareable page — animation using that dream’s images only |

## Controls

| Key | Action |
|-----|--------|
| **H** | Toggle settings panel |
| **F** | Toggle fullscreen |
| **S** | Screenshot (downloads PNG) |
| **Click / Tap** | Bounce the nearest cat |

Toolbar buttons for screenshot and fullscreen are at the bottom-right corner.

## Settings Panel

| Folder | Controls |
|--------|----------|
| **Top-level** | Cat count, speed, theme selector |
| **Physics** | Gravity, bounciness, collision size, attraction, orbit radius |
| **Mode** | DVD mode, DVD speed, mouse mode (off / attract / repel) |
| **Visuals** | Glow, trails, constellations, breathing, shooting stars, vignette, spin drift, depth/parallax, slow-mo zone, hitbox overlay |
| **Audio** | Sound FX, ambient music |

## Features

- **Twinkling star field** with theme-tinted colours
- **Shooting stars** — random streaks across the sky
- **Particle trails** — fading sparkle trails behind each cat
- **Constellation lines** — faint lines connecting nearby cats
- **Cat glow** — soft coloured drop-shadow halo around each cat
- **Breathing / pulsing** — subtle scale oscillation for a living feel
- **Spawn animation** — cats scale up from zero with ease-out
- **Depth / parallax** — small cats drift slower, large cats faster; z-ordered
- **Hue variety** — random colour shifts so 3 images produce many variations
- **Collision physics** with configurable bounciness
- **Gravity mode** — cats fall and bounce at the bottom
- **Mouse attract / repel** — three-way toggle
- **Slow-motion zone** — cats near the cursor slow down
- **Spin drift** — random tumbling as cats float
- **DVD mode** — classic corner-bouncing screensaver
- **Vignette** — atmospheric edge darkening
- **Sound FX** — chimes on collision, pops on click (Web Audio API)
- **Ambient music** — generative sine-pad drone (Web Audio API, no files)
- **Screenshot** — composites the scene to a downloadable PNG
- **5 colour themes** — Night, Sunset, Ocean, Neon, Forest
- **Touch support** — works on mobile
- **Fullscreen** — via button or F key

## Project Structure (Next.js)

```
app/
  layout.js           # Root layout, favicon
  page.js             # Homepage (animation + “Upload your own”)
  globals.css         # Global + animation + upload page styles
  upload/
    page.js           # Upload page
    UploadForm.js     # Client: drag-drop, background removal, POST /api/upload
  dream/[id]/
    page.js           # Client: fetch /api/dream/:id, run animation with imageUrls
  api/
    upload/route.js   # POST — store images in Vercel Blob, return dream URL
    dream/[id]/route.js  # GET — return dream manifest (imageUrls)
  components/
    AnimationShell.js # Canvas, vignette, toolbar, hint (shared by home + dream)
    AnimationRunner.js # Loads animation.js, calls initAnimation (with optional imageSources)
public/
  js/animation.js     # Animation engine (same behaviour as before)
  img/                # Demo cat images (cat1–3.png)
vercel.json           # COOP/COEP headers (for WASM background removal)
```

Legacy static files (`index.html`, `upload.html`, `dream.html`, `api/*.js`, `js/upload.js`, `js/dream.js`) are no longer used by the Next.js app; they can be removed or kept for reference.

## Customization

- Add images to `public/img/` and update the `DEFAULT_IMAGE_SOURCES` array in `public/js/animation.js`.
- Tune the `config` object at the top of `animation.js` to change defaults.
- Add themes to the `themes` object.

## License

This project is for educational and personal use. Feel free to modify and share.
