# QiblaAstro ELITE 3.1.0 — Final AAB Source Lock

This branch is reserved for the final Android App Bundle packaging stage.

## Frozen source

- Source repository: `msdgabr-sudo/Mizan`
- Source branch: `a2-release-prep`
- Approved source commit: `6e49775df5742413371a4165ea985173c43f5f5e`
- Materialized snapshot directory: `source/`
- Package ID: `com.qiblalabs`
- Version name: `3.1.0`
- Version code: `3`
- Current Play release shown during handoff: version `1.0.0`, version code `1`
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`

## Acceptance evidence before handoff

At the approved source commit, both the complete pre-native release gate and the APK Release Candidate workflow completed successfully. The APK workflow verified generated Android identity, API level, required permissions, forbidden permissions, native Azkar reminders, authenticated prayer notifications, local Adhan integration, authenticated Widget integration and the native launcher bridge, then produced the APK RC artifact.

APK RC workflow run: `31848703422`
APK RC artifact digest: `sha256:f882e633388e6174a4419ece1c6ea96fa669df0cdd4ef3ca4b3a93a0fbc767e1`

## Verified signing identities

Play App Signing certificate SHA-256 supplied from Google Play Console:

`2F:04:F6:F6:4D:09:E0:82:32:BC:5A:1F:DD:58:4B:19:8F:37:92:F6:18:18:98:AC:F0:0C:7F:AC:C0:BA:7D:B8`

Local upload keystore SHA-256, independently checked with `keytool` and matched to the Google Play Upload key certificate:

`E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7`

Expected local upload-key alias: `qiblaastro`.

The frozen `assetlinks.json` already contains the current Play App Signing fingerprint above. It also retains a second historical Play app-signing fingerprint; repository history records that addition as `fix(twa): trust both Play app-signing fingerprints`, so it is retained rather than removed without a certificate-rotation audit.

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

The upload keystore and all signing passwords are external secrets. They must never be committed. Expected key file is `qiblaastro-upload.jks`, alias `qiblaastro`.

The repository build gate produces an unsigned AAB proof from the materialized source. Final signing is performed locally with the verified upload keystore using `build-final-signed-aab.ps1`; the wrapper temporarily places the key in the ignored source keystore directory and removes it when finished.

Before Play upload, verify the final signed AAB and generated hashes. Google Play will re-sign distributed APKs with the Play App Signing certificate above.
