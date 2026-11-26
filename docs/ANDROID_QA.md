# Android candidate verification

Independent installed QA completed on 26 November 2026. Product implementation and design were reviewed separately by the Developer and Designer. This report records the QA agent's observations.

**Verdict — APPROVE FOR HUMAN ACCEPTANCE**, scoped to the emulator below. The cold-start continuity and photo viewer requirements pass. Physical-phone acceptance and owner-controlled production signing remain open.

## Final candidate

| Item | Verified identity |
| --- | --- |
| Source | `ac0a36dd74a91c0bad752223c47cd0a3150ffe10` |
| Package | `com.langsystems.grapleton` |
| Installed version | `0.4.0`, version code `4`, minimum API `24`, target/compile API `36` |
| Debug APK SHA-256 | `5a83450945f87831a857178e2f7e1e25d470ae0564b3f7c8bae785dace23b86f` |
| Unsigned AAB SHA-256 | `5143f73e1fc1ba60d815c5ed78d28f72c209140140cc026585dc62ccd545aeb0` |
| Development signer SHA-256 | `4e303ec8c6ac8d66c21b917fd9798692bf85ae5458cdab89a9ce97b37d0e8579` |

QA independently hashed the APK/AAB, read the installed package/version, verified the APK signature and certificate, and passed `zipalign -c -P 16 4`. The Developer reported successful final Gradle assembly, bundle and lint, with zero errors and eleven warnings. The AAB is unsigned; no Play upload or production signing occurred.

## Runtime and exact upgrade

Tests used the Ripper_Tipper_S23 AVD, Android 16/API 36, x86_64 Google APIs image, 1080 × 2400 physical resolution, density 420, gesture navigation, and **System WebView 133.0.6943.137**. Playwright operated the installed WebView, its Android driver injected native gestures, and ADB/UI Automator measured or operated Android. System day/night tests changed Android's actual UI mode.

The exact existing OneDrive `Apps/Grapleton-0.1.0-test.apk` baseline was Android 0.3.0/code 3, SHA-256 `1ed3824c53a97f5ef12c4daa4b988cdc5fb5faa9d9d7c6df3ce8321f6d8e8f69`. A read-only IndexedDB snapshot recorded three racks, six bottles, every field and revision, and each of three photo Blobs' SHA-256, MIME type and size. The final check reinstalled that baseline with `adb install -r -d`, then installed the final code 4 APK with `adb install -r`, without uninstalling. The complete snapshot compared equal after upgrading, after viewer use, and again after the optional tooling attempt and app restoration. Package and signer remain unchanged.

## Cold startup and system bars

Two actual Android screen recordings cover force-stop, launcher, native splash, HTML startup and the ready app in day and night modes. QA independently inspected contact sheets decoded from the actual H.264 recordings with PyAV. The final sequence retains the purple glass artwork through the handoff, shows wine movement and reveals the cream app. No blank logo phase, full white flash or conspicuous logo-size jump was observed in these decoded frames. Native startup and HTML artwork sizes match in the final sequence. These are AVD recordings with variable frame timing; they do not establish physical-phone startup latency or guarantee visibility of every sub-frame event.

Earlier candidates were rejected after temporal inspection revealed a blank purple phase, logo displacement, cream edge strips and unreadable or incorrect settled system bars. A controlled experiment isolated the persistent purple bars: `Startup.ready()` restored cream, but a subsequent Capacitor `SystemBars.setStyle({style:'LIGHT'})` reapplied the purple theme window background. The final Activity theme overlay corrects that underlying background ownership.

On the final APK in actual Android night mode, top and bottom native backing pixels were `[250,246,241]` before and after both calls. Night/day window flags show dark status icons; screenshots confirm readable icons against cream. Same-process warm resume did not replay startup and retained correct bars. The final night cold recording ends with cream bars and dark icons. The final day recording and settled screenshot agree.

Evidence: `startup-0.4-approved-day.mp4`, `startup-0.4-approved-night.mp4`, their `.decoded-contact.png` and `.decoded.json` files, `native-bar-approved.json`, `bar-approved-systembars-light.png`, and `startup-final-{day,night}-ready.png`. Earlier browser-seek contact sheets were discarded because they repeated stale decoded frames; only the PyAV-decoded records support the cold-start verdict.

## Fullscreen photo interaction

The installed viewer was exercised on the initial 0.4 functional candidate, and its unchanged implementation received final-APK zoom/Back/focus and data-continuity smoke checks. Coverage included:

- Opening the stored bottle photo from its detail dialog, fitting the image and resetting zoom.
- Actual Android two-finger pinch-open from scale 1 to 5, followed by a real swipe that changed both pan coordinates.
- An interior two-touch closing gesture delivered through trusted CDP touch events, reducing scale 5 to approximately 1.67. The native driver's full-width closing gesture intersected the OS edge strip, so that attempt is not counted as a successful viewer gesture.
- Actual double-tap zoom to 2.5, button zoom, and reset.
- Portrait-to-landscape rotation. The measured native WebView rectangle was `[136,74]–[2400,1017]`; close, zoom and reset controls stayed inside the usable viewport, with targets at least 48 CSS pixels high and wide. Photo movement remained constrained within the viewer.
- Android Back closing only the photo viewer, retaining the underlying bottle detail and restoring focus to its Enlarge bottle photo trigger.
- Installed WebView reduced-motion emulation yielding zero viewer animations and a zero-second zoom transition.

Final candidate smoke reopened a saved photo, zoomed to 150%, closed with Android Back, checked retained detail/focus, and proved the full saved record and photo hashes unchanged. Evidence: `native-photo-viewer.json`, `viewer-fitted-portrait.png`, `viewer-native-pinch-pan.png`, `viewer-landscape.png`, `viewer-final-photo.png`, and `native-0.4-final.json`.

## Scope and remaining acceptance

Core QA standards and retrospective revision `6a5cde2` were read. The temporal-evidence lesson caught defects invisible in a settled screenshot. The native-interaction lesson was applied through actual multitouch, swipe, rotation, Android Back, real system themes and native pixel/window observations. Upgrade verification used the existing distributable and exact stored photo hashes.

This increment did not repeat every unchanged camera, backup, rack, keyboard or offline integration. Those had installed coverage in the preceding 0.3 report, including 320/412 portrait, landscape, gesture/three-button bars, maximum rack paging and real landscape keyboard use. The 0.4 final checks above are explicitly narrower. Viewer interaction checks run on the initial functional candidate are carried forward because later fixes changed startup/theme ownership, with final viewer smoke on the artifact identified here.

An optional native startup reduced-motion/failure-injection helper did not complete within the bounded attempt. It is **not a native watchdog/Retry pass** and does not establish reduced-motion cold-start behavior. Source/fixture review is separate from this installed evidence. The helper was canceled, Android was cold-launched normally, and the final app-ready check and exact data snapshot passed afterward.

Physical-device pinch feel, startup timing, OEM bars, minimum-supported Android, newer WebViews, TalkBack, photo-camera hardware and production-signed upgrades remain human acceptance work. Runtime evidence covers WebView 133; the separate newer-WebView source branch was not exercised. No production-release authority is implied by this emulator verdict.

Local evidence directory: `C:/Users/langa/Documents/ChatGPT/Grapleton/QA-Grapleton/`. Final ready screenshot: `android-0.4-ready-final.png`. The emulator was returned to physical resolution, portrait rotation, gesture navigation, Android day mode and enabled Wi-Fi/mobile data. No product changes were made by QA.
