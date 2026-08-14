# QiblaAstro ELITE 3.1.0 — Final AAB Source Lock

This branch is reserved for the final Android App Bundle packaging stage.

## Frozen source

- Source repository: `msdgabr-sudo/Mizan`
- Source branch: `a2-release-prep`
- Approved source commit: `6e49775df5742413371a4165ea985173c43f5f5e`
- Package ID: `com.qiblalabs`
- Version name: `3.1.0`
- Version code: `3` (must still be confirmed unused in Google Play before upload)
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`

## Acceptance evidence before handoff

At the approved source commit, both the complete pre-native release gate and the APK Release Candidate workflow completed successfully. The APK workflow verified generated Android identity, API level, required permissions, forbidden permissions, native Azkar reminders, authenticated prayer notifications, local Adhan integration, authenticated Widget integration and the native launcher bridge, then produced the APK RC artifact.

## Final AAB invariants

The final AAB must preserve the frozen application behavior and scientific engines. Final packaging may not alter QT, WMM2025, digital-compass mathematics, astronomical verification/camera calculations, prayer calculation equations or Quran/Azkar content.

The final build must include:
- localized native Azkar reminders;
- authenticated prayer notifications and local Adhan audio;
- authenticated home Widget;
- `QiblaLauncherActivity` with per-install token in URL fragment;
- no legacy `WidgetDataActivity`;
- no advertising ID permission for this ad-free release;
- no exact-alarm permission unless a separately approved release policy changes it.

## Signing boundary

The upload keystore and all signing passwords are external secrets. They must never be committed. Expected local key path is `android-twa/keystore/qiblaastro-upload.jks` with alias `qiblaastro` unless the authoritative Play upload certificate proves otherwise.

Before Play upload, verify the final signed certificate fingerprints against the live `/.well-known/assetlinks.json` served by `app.qiblalabs.com`, and verify that the chosen version code has not already been consumed in Play Console.
