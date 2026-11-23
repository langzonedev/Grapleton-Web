# Grapleton grape-goblet identity

Approved implementation direction for the operator-requested logo refresh, 23 November 2026. A broad rose grape cluster becomes a wine goblet; a sage leaf and vine curl add a little whimsy. The existing serif wordmark and application colours stay in place. This is product artwork, not a replacement for the Lang Systems company identity.

## Source and exports

`assets/brand/grapleton-master.webp` is the high-resolution generated artwork master. It was created with OpenAI image generation for this application, then refined following a separate design review: broaden the grapes, shorten the stem and leaf, and use substantial shapes at phone sizes. It is raster artwork, not a hand-drawn vector or a trademark-clearance claim. No stock logos were supplied.

Production prompt: “Custom Grapleton app icon: a broad compact rose grape cluster merging into a short wine goblet, one sage leaf and playful vine curl on deep plum; bold clean shapes, no text, no border or baked-in rounded corners; essential artwork inside the central launcher safe area.”

Run `node scripts/export-icons.cjs` with Node.js and `sharp` installed to regenerate the PNGs. The master is a high-quality WebP copy of the generated image. Exports use Lanczos resizing and opaque RGB backgrounds.

| Surface | File | Purpose |
| --- | --- | --- |
| Standard PWA | `grapleton-v2-192.png`, `grapleton-v2-512.png` | `any` |
| Android adaptive launcher | `grapleton-v2-maskable-192.png`, `grapleton-v2-maskable-512.png` | `maskable` |
| Apple home screen | `grapleton-v2-apple-touch-180.png` | Explicit 180px touch icon |
| Application header | `grapleton-v2-header-128.png` | Shown at 40 CSS pixels; decorative beside wordmark |
| Browser tabs | `grapleton-v2-favicon-32.png`, `grapleton-v2-favicon-48.png` | PNG favicons |

The two PWA export families intentionally share the same safe composition. Separate manifest purposes prevent the browser having to guess whether an icon is suitable for masking. All tiles have opaque full-bleed backgrounds; the operating system applies the final circle/squircle shape. Only the in-app header adds CSS rounding.

## Updates and verification

Manifest `id`, scope, start URL and application data remain stable. Fresh artwork filenames avoid collisions with previously cached icons. The service-worker shell revision and Pages substitution advance together; the current update UI retains control over applying the new shell. Old prototype assets remain only for compatibility and are no longer referenced by the current app.

Check PNG dimensions, opacity, icon references, foreground safe-circle bounds and 32/48px legibility before publishing. Physical iOS/Android installation remains a device acceptance check. Launcher icon refresh timing is controlled by the browser/OS; an existing installation can retain its old icon. Apply the app update first. If needed, recreate the home-screen shortcut; export a cellar backup before uninstalling or clearing any site data.
