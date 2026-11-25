# Android candidate verification

Independent QA reviewed the installed Android prototype on 25 November 2026. The Developer authored the product changes. The QA agent independently exercised the candidate and inspected its artifacts.

**Verdict — APPROVE FOR HUMAN ACCEPTANCE**, scoped to the emulator and configurations below. Physical Android acceptance and owner-controlled production signing remain open.

## Final candidate

| Item | Verified identity |
| --- | --- |
| Source | `eccc7a11d226b7742dbd20fd13bf5379c1cf7753` |
| Package | `com.langsystems.grapleton` |
| Version | `0.3.0`, version code `3`, minimum API `24`, target/compile API `36` |
| Debug APK SHA-256 | `1ed3824c53a97f5ef12c4daa4b988cdc5fb5faa9d9d7c6df3ce8321f6d8e8f69` |
| Unsigned AAB SHA-256 | `3e22234db65030552a264ebefa2b30ad63dd1bafb591542cc22d9a9f7b737ca9` |
| Development signer SHA-256 | `4e303ec8c6ac8d66c21b917fd9798692bf85ae5458cdab89a9ce97b37d0e8579` |

The final APK signature verifies. ZIP alignment passes `zipalign -c -P 16 -v 4`. All eight JNI libraries match between APK and AAB, and all ELF LOAD segments have 16 KB alignment. The AAB is unsigned. Final Gradle build and lint completed with zero errors and eleven warnings.

## Runtime and upgrade

Tests used the Ripper_Tipper_S23 AVD, Android 16/API 36, x86_64 Google APIs image, 1080 × 2400 physical resolution, density 420, and **System WebView 133.0.6943.137**. A 840 × 1800 resolution override supplied the 320 CSS-pixel configuration. Playwright operated the installed WebView. ADB and UI Automator operated Android and measured native bounds.

The exact OneDrive `Apps/Grapleton-0.1.0-test.apk` baseline was Android 0.2.0/code 2, SHA-256 `b9589c5ad1a436ddd97a7bbb71d3d62b247bacbe88e8ab28fd3e778d1f5ac823`. Installing code 3 with `adb install -r` preserved the package and signer. A snapshot comparison retained both original racks, all five bottles, every field, and every photo Blob's SHA-256. Subsequent synthetic rack and long-name fixtures were confined to the QA rack.

## Installed rack and system-bar matrix

| Configuration | Rack coverage | Smallest observed slot | Actual WebView bounds in device pixels |
| --- | --- | --- | --- |
| 412 portrait, gesture navigation | Entire 3 × 6 and 3 × 8 racks | 48.15 × 166.23 CSS px for 8 columns | `[0,136]–[1080,2337]` |
| 320 portrait, gesture navigation | Entire 3 × 6 rack | 49.83 × 94.23 CSS px | `[0,102]–[840,1737]` |
| 412 portrait, gesture navigation | 12 × 12 and 26 × 24 racks use sections | 48.15 × 48.07 CSS px | `[0,136]–[1080,2337]` |
| 863 × 360 landscape, gesture navigation | Paged maximum rack | 50.76 × 52.10 CSS px | `[136,74]–[2400,1017]` |
| 412 portrait, three-button navigation | Paged maximum rack | 48.15 × 51.46 CSS px | `[0,136]–[1080,2274]` |
| 320 portrait, three-button navigation | Paged maximum rack | 49.83 × 51.92 CSS px | `[0,102]–[840,1674]` |
| 815 × 384 landscape, three-button navigation | Paged maximum rack | 51.15 × 64.10 CSS px | `[136,74]–[2274,1080]` |

These rack states had no page-wide or rack horizontal scrolling and no unnecessary body vertical scroll. Slot bounds stayed between the app bars. Actual WebView rectangles were compared with Android's status-bar, navigation-bar and display-cutout InsetsSource rectangles. CSS header, brand and bottom-navigation bounds were projected into the same native coordinate space, allowing two physical pixels for fractional rounding. This establishes system-bar clearance through native bounds as well as rendered geometry. The landscape Collection header remained at CSS y=0 after scrolling roughly 393 CSS pixels.

The compact home removed duplicate bottle cards. A final four-pixel padding adjustment removed the measured two-pixel rounding tail. The final APK was installed in place and retested with three racks and a 60-character rack name. Viewport, client and scroll heights were all 839 CSS pixels, with viewport and content widths both 412. Adding a bottle directly to Z24 in the maximum rack revealed and focused the last section. Previous/next section controls worked. Moving that bottle to A1 revealed and focused the first section. Global search revealed the correct section. Tapping, closing, saving and resizing preserved the selected position.

## Anchored choices, keyboard and motion

Short choices opened beside their source field. The observed style dropdown began six CSS pixels below its field. Long choices supplied search, empty results, selection, outside/Back dismissal and focus restoration while the bottle editor remained open.

Two landscape keyboard defects were reproduced and corrected. Initially Rack results fell below the 122-pixel usable viewport, and the choice option list had zero height. On the final flow, the actual keyboard reduced the WebView to `[136,74]–[2400,394]`, or about 863 × 122 CSS pixels. Rack search occupied 44 pixels, the results region about 56 pixels, and each compact result 48 pixels. The choice popup retained one fully visible 48-pixel option. Selecting Riesling through the real keyboard layout updated the parent field. Selecting a Rack result dismissed the keyboard, restored normal navigation, and restored focus to its highlighted slot after the responsive grid replacement.

The final candidate also handled a 120-character wine name and 60-character rack name in a fully visible 48-pixel result through ellipsis. The full values remained in saved data.

Installed dialog motion was sampled over 250 milliseconds. Opacity and transform changed across eleven frames. Four interrupted close/reopen cycles remained coherent. Emulated `prefers-reduced-motion: reduce` in the installed WebView produced zero dialog animations and immediate close. The ordinary anchored geometry, matrix and temporal checks ran on the initial 0.3.0 functional candidate. Proportional final regressions covered compact home, far-position commits, real landscape keyboard selection, long text, focus retention and installer data continuity. The last padding-only revision received an in-place installation and populated home-fit check.

## Evidence and limits

Core revision `6a5cde2` was read before testing. The projected-workspace lesson was applied through actual slot-edge and target-size measurements. The native-interaction lesson was applied through installed paging, selection, Back and interruption flows. Temporal evidence supplemented screenshots for animation. Upgrade identity and data continuity were verified against the existing distributable APK.

The native configuration uses SystemBars native inset handling, a contain viewport, and an initial contain hint. Capacitor's source includes a separate WebView 140+ passthrough branch when a page requests cover. That source was inspected. Runtime evidence here covers WebView 133 and the bundled contain viewport. Newer WebView versions, minimum-supported Android devices, OEM variations and a physical 16 KB device were not exercised.

Physical-phone camera, haptics, TalkBack, gesture navigation, keyboard variations and a production-signed upgrade remain acceptance steps. Previous Android reports established native camera/picker, backup and process-recovery behavior. This polish pass did not repeat every unchanged integration. No Play upload or production signing was performed.

Local evidence resides in `C:/Users/langa/Documents/ChatGPT/Grapleton/QA-Grapleton/`. Final screenshots include `polish-last-home.png`, `polish-last-rack.png`, `polish-last-landscape-ime.png` and `polish-last-landscape-selected.png`. Matrix measurements are in `native-polish-bounds.json`, temporal samples in `native-polish-interactions.json`, and final keyboard/focus measurements in `native-polish-last.json`.

The emulator was returned to its physical resolution, portrait rotation, gesture navigation, and enabled Wi-Fi/mobile data.
