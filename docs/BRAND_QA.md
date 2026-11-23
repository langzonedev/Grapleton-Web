# Logo refresh verification — 23 November 2026

- Separate design reviewer inspected the initial candidate, requested a broader grape cluster/shorter stem, and approved the revised 32/48px and circle/rounded-square previews.
- All four manifest PNGs have their declared dimensions and opaque backgrounds.
- Measured rose/sage foreground radius: 181.8px from the centre of the 512px maskable tile; permitted safe-circle radius: 204.8px. The background intentionally fills the tile.
- Every newly added service-worker cache path exists. Existing font stays unchanged in GitHub; the connector could not retrieve it for local rendering.
- Node syntax checks passed for app.js, calendar.js, store.js, sw.js and scripts/export-icons.cjs.
- Manifest application identity, scope and start URL stay unchanged.
- Service-worker source revision and Pages workflow replacement both use v3. New artwork URLs avoid old asset-cache collisions.
- Browser layout/offline runtime tests and physical Android/iOS installation were not performed. Changes to the existing UI are limited to the header image and its sizing/rounding; no collection or date-picker code changes.

To roll back, revert the branding commit and redeploy. Pages uses the resulting commit SHA for its shell-cache identity. Do not clear user site data to apply artwork updates.
