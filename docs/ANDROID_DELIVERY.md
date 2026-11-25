# Grapleton Android delivery

Updated 25 November 2026. The Android shell uses Capacitor 8 with Grapleton's local IndexedDB data model. It has a dedicated app layout with persistent My Cellar, Rack, Collection and Settings navigation, wine-related icons, field-anchored dropdowns and selection haptics. Native camera, system photo selection, sharing and Android Back handling are included. Privacy is accessible from Settings. Packaged assets allow offline use. Android releases arrive through Google Play, while the browser app retains its service-worker update control.

## Identity and versions

The proposed application ID is `com.langsystems.grapleton`, version name `0.3.0`, version code `3`. This test update retains the package and workstation signing identity of the earlier test candidates. Confirm this ID with the account owner before the first Play upload. After publication the application ID and signing identity must stay stable. Increase version code for every subsequent Play artifact. The build targets API 36 and supports API 24 upwards, subject to device WebView compatibility.

## Interaction and layout

The native Rack screen allocates its remaining viewport to the rack grid. It keeps slots at least 48 CSS pixels in each direction through labelled sections for larger racks, with search and saved bottle moves revealing the correct section. Normal six-column racks fit at 320 CSS pixels and eight-column racks fit at 412 CSS pixels. Collection and long forms scroll when their content requires it. My Cellar contains the aggregate and rack list, with the catalogue available through Collection.

Dropdowns open beside their source field and clamp to the visible viewport. Long lists scroll inside the dropdown and offer search. Bottle details and forms open with 220 ms transform/opacity transitions and close in 180 ms. Press feedback is immediate, animation interruption keeps the latest state, and reduced-motion mode preserves all actions. Data writes complete before the closing transition.

Only the Android bundle uses `viewport-fit=contain` and explicit Capacitor SystemBars native inset handling. Native window padding reserves system bars, display cutouts and the keyboard. The PWA retains its existing viewport configuration. These choices apply the Core workspace and progressive-detail lessons recorded in `LS-RET-2026-08-27-01`, `LS-RET-2026-08-27-02` and `LS-RET-2026-08-28-01`. Installed bounds and interaction evidence are recorded in [Android QA](ANDROID_QA.md).

## Build

Install Node 22 or newer, JDK 21, Android SDK Platform 36 and Build Tools 36. Configure Android Studio or an ignored `android/local.properties` with `sdk.dir` pointing to your SDK. In a Windows properties file, escape the drive colon, for example `sdk.dir=C\:/Users/yourname/AppData/Local/Android/Sdk`.

```powershell
npm ci
npm run android:sync
./android/gradlew.bat -p android assembleDebug bundleRelease lint --console=plain
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. It uses the workstation's development certificate and is for testing. The bundle at `android/app/build/outputs/bundle/release/app-release.aab` is unsigned until the owner signs it. Both can be recreated from source and the lockfile. Do not install a debug package over a release-signed installation.

Open `android/` in Android Studio, choose Generate Signed App Bundle / APK, select Android App Bundle, and use an owner-controlled upload keystore. Store keys and passwords outside Git, record the certificate fingerprint and arrange secure recovery. Enrol in Play App Signing during first upload. The Google Play Console account, upload signing credentials, store declarations and human approval are needed before an upload-ready signed release exists.

## Data boundaries

Native data belongs to this package's WebView origin. Existing website collections stay in the browser and are not imported automatically. Use Settings → Backup & restore to export from the browser and restore that file in Android. Normal upgrades with the same package and signing identity retain native storage. Uninstalling or clearing app data removes it. Android cloud backup and device transfer are disabled. Camera drafts are persisted before leaving for the system activity and recovered if the OS reclaims the process. The portable JSON format includes photos and supports a user-confirmed replacement restore. Android export opens the native share sheet with a file in app cache. Save the file to a destination you control. There is no account or automatic sync.

## Store handoff

The privacy page is available in the app and at `https://langzonedev.github.io/Grapleton-Web/privacy.html`. Its maintainer contact currently points to the public project issue tracker. Confirm the business legal name, publish a monitored privacy/support contact, and align policy wording with the verified Play organisation before submission.

Prepare the short and full listing descriptions, 512-pixel store icon, 1024 by 500 feature graphic, phone screenshots, content rating questionnaire, adult target audience, app access and ads declarations, and Data safety answers. Assess wine/alcohol references honestly in the rating questionnaire. The product organises a collector's bottles. It currently has no alcohol purchasing or delivery features. Google reviews the actual submitted app and declarations.

Use internal testing first. Verify on a physical Android phone including camera capture and cancellation, picker selection, rotation, keyboard and system insets, Back, offline restart, process reclamation, and an upgrade preserving a populated cellar. Record the final AAB SHA-256, signer, version code, source revision and QA result before production release. iOS remains a later project requiring macOS/Xcode, Apple signing and separate store acceptance.

## Framework decision

Capacitor retains the accepted web interface and adds platform integrations. Flutter would require implementing and verifying another interface and data-access layer. A future iOS shell can use this same web bundle with the official iOS plugins, then undergo iOS-specific permission, layout, storage and App Store checks. No iOS build has been produced here.
