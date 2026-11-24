# Standalone wine-glass logo verification — 23 November 2026

The operator selected the existing glass of wine alone. The grapes, leaf and vine are removed; the ivory glass, rose wine swirl and plum background remain.

- Standard PWA icons: 192px and 512px; dedicated maskable icons at both sizes.
- Dedicated Apple 180px home-screen icon, header image and 32/48px favicons.
- New v4 artwork URLs; service-worker revision and Pages substitution both advance to v5.
- Manifest application identity, scope and start URL remain unchanged.
- Physical Android/iOS installation and browser offline runtime remain untested. No collection/date-picker logic changes.

Static validation results are recorded below after export. To roll back, revert the logo commit and redeploy. Never clear user site data to apply an artwork update.

Static checks passed: icon dimensions and opacity, cache asset references, synchronised shell v5, unchanged PWA identity. Visible glass foreground radius 161.4px (safe circle 204.8px).
