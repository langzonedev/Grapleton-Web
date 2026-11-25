# Android candidate verification

Independent QA and release review performed on 25 November 2026 by the QA agent. The Developer authored the application changes. QA inspected source and artifacts and exercised the installed app.

The candidate is approved for human acceptance within the emulator coverage below. Physical Android testing and owner-controlled release signing remain open.

## Candidate identity

Implementation commit `e1ba6e9bfbf73031e6907bb4bf42f5ca55d7cc3b`, package `com.langsystems.grapleton`, version `0.2.0`, version code `2`, minimum API `24`, target and compile API `36`. This candidate adds native bottom navigation, a cellar overview, searchable selection sheets and Settings privacy while retaining glass branding, calendars, AUD prices and portable JSON backups.

| Artifact | SHA-256 | Observed state |
| --- | --- | --- |
| Debug APK | `b9589c5ad1a436ddd97a7bbb71d3d62b247bacbe88e8ab28fd3e778d1f5ac823` | Installed and launched, Android Debug certificate verified |
| Release AAB | `55731095a54f07511860d34d68a52d4ba5c99133b742d66c520f5fa5b4731fa8` | Inspected unsigned bundle |

The debug signing certificate SHA-256 is `4e303ec8c6ac8d66c21b917fd9798692bf85ae5458cdab89a9ce97b37d0e8579`. This is the workstation development identity.

## Executed coverage

The runtime environment was the existing Ripper_Tipper_S23 AVD, Android 16/API 36, x86_64 Google APIs image, 1080 × 2400 pixels, density 420, System WebView `133.0.6943.137`. Playwright's Android WebView connection operated the installed UI. ADB and UI Automator operated the actual external camera and photo-picker activities.

| Scenario | Result |
| --- | --- |
| Installed package and local shell | Passed. `https://localhost/` served the bundled interface, the native bridge was present, there were no service-worker registrations, and the web update control was hidden. |
| In-place upgrade | Passed. Installed the exact OneDrive `Apps/Grapleton-0.1.0-test.apk` baseline, SHA-256 `c7755c85ab41d8f812a806426684c23cc9dd6e2d7f3e419ded5372991203db3d`. Compared a populated snapshot before and after the code 1 to code 2 update. Two racks, five bottles, all fields and every photo Blob's SHA-256 matched exactly. Package and development signer stayed identical. |
| Bottom navigation | Passed. My Cellar, Rack, Collection and Settings were operated through their four visible tabs. The selected tab updated correctly. The native footer was hidden and Settings exposed privacy within the application shell. |
| Selection sheets | Passed. Rack and grape selectors supported search, empty results, selection, close, Android Back and focus restoration. Selecting another rack restored focus to the replacement trigger after rendering. Corrected ArrowUp behavior was checked on the final artifact. |
| Cross-rack recall | Passed. Searching 2010 Shiraz located the prepared bottle in QA Upgrade reserve, switched racks and highlighted its slot. Collection listed all five bottles. Canceled edits retained the original variety, dates and AUD price. |
| Camera capture | Passed. Take photo opened Android's capture activity. Shutter and Done returned an image, which was saved with the bottle. The initial candidate's returned photo was 900 × 1200. The merged candidate repeated capture through process reclamation. |
| Native photo selection | Passed. Choose photo opened Android Photo Picker. Selecting a public Grapleton icon fixture returned a 512 × 512 image and persisted the edited photo. |
| Camera and picker cancellation | Passed. Android Back returned to the edit form with entered fields preserved. Cancel dismissed the form. |
| Process reclamation during capture | Passed on the 0.2.0 functional candidate. With the external camera foreground, `am kill` removed the background Grapleton process and `pidof` returned no process. Shutter and Done restored its wine name, calendar date, AUD84.95, variety trigger and returned photo. Cancel retained the original stored record. Recovery exceeded the first harness's ten-second wait under workstation load, and the completed recovery was inspected afterward. |
| Offline restart and storage | Passed in the prior native candidate. The 0.2.0 privacy and stored-data paths retain the same local storage implementation. |
| Package replacement | Passed. `adb install -r` retained the populated cellar across both incremental APK replacements. Final resource changes were followed by launch and saved-photo verification. |
| Android Back | Passed. Back closed the bottle detail dialog. On the merged candidate, Back closed the top calendar dialog and preserved the underlying bottle editor. |
| Layout and branding | Passed. Final native portrait viewport and content width were both 412. Four bottom tabs remained inside the viewport and met 44-pixel minimum height. Overview photo containment was corrected after the initial draft overflowed with populated data. Screenshots show the glass mark, contained bottle cards and system bars. |
| Calendar and price | Passed. Today selected an Australian display date, the exported value retained ISO format, and $49.95 displayed from its AUD field. Dated camera recovery also retained $69.50 and the selected purchase date. |
| Native backup export | Passed on the merged candidate. Export opened Android's sharing sheet with the JSON filename. Inspected the generated private cache file and confirmed rack records, photo data, ISO purchase dates and AUD purchase price. The share sheet was dismissed without sending the file to another person or account. |
| Native backup restore | Passed on the merged candidate. Opened actual Android DocumentsUI, chose Downloads and the synthetic exported JSON fixture, and confirmed replacement. Also verified cancellation, malformed-file rejection, valid import and persistence after reload. |
| Accessibility | Collection had no axe WCAG A/AA violations. Modal focus and Back behavior were exercised. Physical TalkBack acceptance remains open. |
| Packaged privacy page | Passed. Settings opened Privacy & your data as an application dialog, and Android Back dismissed it while retaining the current tab. |
| Browser regression | Passed. The independent Chrome mobile suite covered older stored data and photos, named racks, duplicate A1 positions, grape selection, cross-rack search and movement, Collection, accessibility and offline operation. |
| Build checks | The merged Gradle build completed. Inspected lint output reported zero errors and eleven warnings covering dependency updates, template resources and the legacy launcher icon shape. |

The functional suites ran on the final native design candidate. A later correction adjusted ArrowUp within selection sheets, and a text-only correction clarified retention when installing an update. The final installer was rechecked for preserved data, the keyboard correction, version, Settings wording and dashboard geometry. Earlier camera/picker and native backup evidence remains applicable to the unchanged platform integrations.

During backup regression, the QA resume script selected an older dated export and intentionally restored its smaller synthetic cellar. The latest dated export was then restored and verified against the original five-bottle snapshot, including photo hashes, before the final installer retention check. This fixture-selection error did not establish an installer data-loss defect.

## Artifact and boundary review

The final APK's signature verifies, and ZIP alignment passes `zipalign -c -P 16 -v 4`. Every LOAD segment in both packaged JNI libraries has alignment `2**14` on all four ABIs. The AAB's eight native libraries match their APK counterparts byte for byte. This establishes static 16 KB alignment evidence. The emulator used for runtime testing has a 4 KB page size.

The final AAB is unsigned. No production upload or signing was performed. Source inspection found no configured remote server URL or native live-update mechanism. Native service-worker registration is bypassed. The manifest disables Android automatic backup and defines extraction exclusions. Portable JSON export is an explicit user action through the native sharing sheet. The final APK declares INTERNET, VIBRATE for selection feedback, and its own non-exported receiver permission. Broad camera or photo-library permissions were absent.

During the initial heavily loaded emulator boot, Android displayed a System UI unresponsive dialog. Choosing Wait recovered the emulator and the external camera subsequently completed. Capacitor also logged transient safe-area injection messages during the initial load. The final rendered portrait and landscape screens were inspected for system-bar overlap.

## Human acceptance

Use a physical Android phone to verify camera focus, permissions and OEM photo selection, keyboard behavior, TalkBack, system bars, rotation, and a signed upgrade retaining a populated cellar. Test the intended minimum Android/WebView combination and a 16 KB device or emulator before asserting those runtime configurations. A clean installation with network disabled from its first launch was not separately executed, although bundled loading and offline relaunch were observed.

The owner still needs to confirm the application identity, hold and recover the upload key, review the privacy/support contact and Play declarations, and complete Play internal testing before production promotion.

For the current date, Google's published submission requirement is target API 36 for new apps and updates. Native camera lifecycle handling follows the official Capacitor guidance. [Android target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [16 KB compatibility guidance](https://developer.android.com/guide/practices/page-sizes), [Capacitor Camera](https://capacitorjs.com/docs/apis/camera).

Final screenshot evidence is retained at `C:/Users/langa/Documents/ChatGPT/Grapleton/QA-Grapleton/android-affordance-final-home.png`, `android-affordance-final-settings.png` and `android-affordance-selector.png`. The same QA directory holds Collection, camera-recovery and upgrade-baseline screenshots. Screenshots were reviewed locally and are outside the public app artifact.

Emulator Wi-Fi and mobile data were re-enabled after the offline checks.
