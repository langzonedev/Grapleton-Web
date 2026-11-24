# Android candidate verification

Independent QA and release review performed on 24 November 2026 by the QA agent. The Developer authored the application changes. QA inspected source and artifacts and exercised the installed app.

The candidate is approved for human acceptance within the emulator coverage below. Physical Android testing and owner-controlled release signing remain open.

## Candidate identity

Implementation commit `3bd8464e677f3563eadb2cd5c4159d1c124e6f9d`, package `com.langsystems.grapleton`, version `0.1.0`, version code `1`, minimum API `24`, target and compile API `36`.

| Artifact | SHA-256 | Observed state |
| --- | --- | --- |
| Debug APK | `d28bc39978be928af53a8180981fd6133f07005ca2287504c7ff046908dc4d0d` | Installed and launched, Android Debug certificate verified |
| Release AAB | `6c9598637fd4945763ae4f26e4cbc818b1eecb57f1114d788aae820a92947816` | Inspected unsigned bundle |

The debug signing certificate SHA-256 is `4e303ec8c6ac8d66c21b917fd9798692bf85ae5458cdab89a9ce97b37d0e8579`. This is the workstation development identity.

## Executed coverage

The runtime environment was the existing Ripper_Tipper_S23 AVD, Android 16/API 36, x86_64 Google APIs image, 1080 × 2400 pixels, density 420, System WebView `133.0.6943.137`. Playwright's Android WebView connection operated the installed UI. ADB and UI Automator operated the actual external camera and photo-picker activities.

| Scenario | Result |
| --- | --- |
| Installed package and local shell | Passed. `https://localhost/` served the bundled interface, the native bridge was present, there were no service-worker registrations, and the web update control was hidden. |
| Camera capture | Passed. Take photo opened Android's capture activity. Shutter and Done returned a 900 × 1200 image, which was saved with the bottle. |
| Native photo selection | Passed. Choose photo opened Android Photo Picker. Selecting a public Grapleton icon fixture returned a 512 × 512 image and persisted the edited photo. |
| Camera and picker cancellation | Passed. Android Back returned to the edit form with entered fields preserved. Cancel dismissed the form. |
| Process reclamation during capture | Passed. With the external camera foreground, `am kill` removed the background Grapleton process and `pidof` returned no process. Shutter and Done relaunched Grapleton with its wine name, vintage, variety and returned photo restored. The recovered bottle saved successfully. |
| Offline restart and storage | Passed. With emulator Wi-Fi and mobile data disabled, a force-stop and restart retained saved bottle details and photo. |
| Package replacement | Passed. `adb install -r` retained the populated cellar across both incremental APK replacements. Final resource changes were followed by launch and saved-photo verification. |
| Android Back | Passed. Back closed the bottle detail dialog. |
| Layout and branding | Passed. Portrait viewport width 412 and landscape width 863 had no page-wide horizontal overflow. Final screenshot showed the Grapleton brand and controls clear of system bars. |
| Packaged privacy page | Passed. The app opened `https://localhost/privacy.html` and returned to the local app while offline. |
| Build checks | The final Gradle build completed. Inspected lint output reported zero errors and six warnings concerning version updates and template resources. |

The complete camera and process-recovery scenarios ran on an earlier debug APK with identical application JavaScript. The final APK changed Android launcher resources and was reinstalled for saved data, local launch, privacy, orientation and camera cancellation checks.

## Artifact and boundary review

The final APK's signature verifies, and ZIP alignment passes `zipalign -c -P 16 -v 4`. Every LOAD segment in both packaged JNI libraries has alignment `2**14` on all four ABIs. The AAB's eight native libraries match their APK counterparts byte for byte. This establishes static 16 KB alignment evidence. The emulator used for runtime testing has a 4 KB page size.

The final AAB is unsigned. No production upload or signing was performed. Source inspection found no configured remote server URL or native live-update mechanism. Native service-worker registration is bypassed. The manifest disables backup and defines extraction exclusions. The merged permission list contains INTERNET and the package's non-exported receiver permission. Broad camera or photo-library permissions were absent.

During the initial heavily loaded emulator boot, Android displayed a System UI unresponsive dialog. Choosing Wait recovered the emulator and the external camera subsequently completed. Capacitor also logged transient safe-area injection messages during the initial load. The final rendered portrait and landscape screens were inspected for system-bar overlap.

## Human acceptance

Use a physical Android phone to verify camera focus, permissions and OEM photo selection, keyboard behavior, TalkBack, system bars, rotation, and a signed upgrade retaining a populated cellar. Test the intended minimum Android/WebView combination and a 16 KB device or emulator before asserting those runtime configurations. A clean installation with network disabled from its first launch was not separately executed, although bundled loading and offline relaunch were observed.

The owner still needs to confirm the application identity, hold and recover the upload key, review the privacy/support contact and Play declarations, and complete Play internal testing before production promotion.

For the current date, Google's published submission requirement is target API 36 for new apps and updates. Native camera lifecycle handling follows the official Capacitor guidance. [Android target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [16 KB compatibility guidance](https://developer.android.com/guide/practices/page-sizes), [Capacitor Camera](https://capacitorjs.com/docs/apis/camera).

Local screenshot evidence is retained at `C:/Users/langa/Documents/ChatGPT/Grapleton/QA-Grapleton/android-final-home.png`, with landscape, camera, picker and recovered-bottle images in that same QA directory. Screenshots were reviewed locally and are outside the public app artifact.

Emulator Wi-Fi and mobile data were re-enabled after the offline checks.
