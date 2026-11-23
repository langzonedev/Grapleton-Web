# Logo refresh verification — 23 November 2026

- Independent design review approved the wine-first master and actual 32px favicon; grapes read as a small colour accent while the glass carries meaning.
- Revised in response to operator feedback: wine glass and swirl take visual priority; grapes become a three-berry accent.
- All four manifest PNGs have their declared dimensions and opaque backgrounds.
- Measured visible foreground radius: 198.7px from the centre of the 512px maskable tile; permitted safe-circle radius: 204.8px. The background intentionally fills the tile.
- Every newly added service-worker cache path exists. Existing font stays unchanged in GitHub; the connector could not retrieve it for local rendering.
- Node syntax checks passed for app.js, calendar.js, store.js, sw.js and scripts/export-icons.cjs.
- Manifest application identity, scope and start URL stay unchanged.
- Service-worker source revision and Pages workflow replacement both use v4. New artwork URLs avoid old asset-cache collisions.
- Browser layout/offline runtime tests and physical Android/iOS installation were not performed. Changes to the existing UI are limited to the header image using its existing sizing/rounding; no collection or date-picker code changes.

To roll back, revert the branding commit and redeploy. Pages uses the resulting commit SHA for its shell-cache identity. Do not clear user site data to apply artwork updates.
