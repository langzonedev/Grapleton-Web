# Grapleton wine-glass identity

Approved implementation direction for the operator-requested logo refresh, 23 November 2026. A warm ivory wine glass with a red-wine swirl is the primary symbol. The operator selected the wine glass alone as the complete identity; the grape/leaf accent has been removed. The existing serif wordmark and application colours stay in place. This is product artwork, not a replacement for the Lang Systems company identity.

## Source and exports

`assets/brand/grapleton-glass-master.webp` is the high-resolution generated artwork master. It was created with OpenAI image generation for this application, then refined following a separate design review: retain the selected glass and wine swirl, remove the grape/leaf/vine accent, and preserve phone-size legibility. It is raster artwork, not a hand-drawn vector or a trademark-clearance claim. No stock logos were supplied.

Production prompt: “Custom Grapleton app icon: an elegant ivory-outlined tulip wine glass with a rose red-wine swirl on deep plum; glass alone, no grapes, leaf or vine; bold clean shapes, no text, no border or baked-in rounded corners; essential artwork inside the central launcher safe area.”

Run `node scripts/export-icons.cjs` with Node.js and `sharp` installed to regenerate the PNGs. The master is a high-quality WebP copy of the generated image. Exports use Lanczos resizing and opaque RGB backgrounds.

| Surface | File | Purpose |
| --- | --- | --- |
| Standard PWA | `grapleton-v4-192.png`, `grapleton-v4-512.png` | `any` |
| Android adaptive launcher | `grapleton-v4-maskable-192.png`, `grapleton-v4-maskable-512.png` | `maskable` |
| Apple home screen | `grapleton-v4-apple-touch-180.png` | Explicit 180px touch icon |
| Application header | `grapleton-v4-header-128.png` | Shown at 40 CSS pixels; decorative beside wordmark |
| Browser tabs | `grapleton-v4-favicon-32.png`, `grapleton-v4-favicon-48.png` | PNG favicons |

The two PWA export families intentionally share the same safe composition. Separate manifest purposes prevent the browser having to guess whether an icon is suitable for masking. All tiles have opaque full-bleed backgrounds; the operating system applies the final circle/squircle shape. Only the in-app header adds CSS rounding.

## Updates and verification

Manifest `id`, scope, start URL and application data remain stable. Fresh artwork filenames avoid collisions with previously cached icons. The service-worker shell revision and Pages substitution advance together; the current update UI retains control over applying the new shell. Old prototype assets remain only for compatibility and are no longer referenced by the current app.

Check PNG dimensions, opacity, icon references, foreground safe-circle bounds and 32/48px legibility before publishing. Physical iOS/Android installation remains a device acceptance check. Launcher icon refresh timing is controlled by the browser/OS; an existing installation can retain its old icon. Apply the app update first. If needed, recreate the home-screen shortcut; export a cellar backup before uninstalling or clearing any site data.
