# QiblaAstro ELITE 3.1.1 — Release Source and Provenance

> Read `REPOSITORY_STATE.md` before release, branch, source-materialization, recovery, or platform-handoff work.

## Current source of truth

The authoritative application and Android release source is:

- Repository: `msdgabr-sudo/q-app-an`
- Working/release branch: **`main`**
- Source directory: `source/`
- Package ID: `com.qiblalabs`
- Version name: **`3.1.1`**
- Version code: **`4`**
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`

Other topic branches may exist, but they are not release sources. Only reviewed state merged into `main` is authoritative.

Executable identity is verified by the TWA manifest, pre-APK gate and root release workflow. Historical Markdown or tags must never override those executable sources.

## Historical Mizan baseline provenance

The `source/` directory was originally materialized from:

- Source repository: `msdgabr-sudo/Mizan`
- Historical source branch: `a2-release-prep`
- Historical approved baseline commit: `6e49775df5742413371a4165ea985173c43f5f5e`

`source/.release-source-sha` retains that SHA as a **provenance marker**.

This SHA is **not an instruction to replace current `main/source`**. Current `main` intentionally includes validated post-baseline fixes and release integrations. Re-materializing the historical Mizan baseline over `main/source` would discard valid current work and is forbidden unless the repository owner explicitly authorizes a recovery operation after a separate audit.

The old materialization workflow is retained only as a manual read-only provenance audit. It must not write to `source/` or push generated source commits.

## Historical 3.1.0 reference

`qiblaastro-3.1.0-single-branch-reference` is a fixed historical checkpoint from the earlier consolidation state. It is not the current release identity and must never be moved or reused for a later release.

## Active release verification

The authoritative root workflow is:

- `.github/workflows/verify-release-snapshot.yml`

It targets `main` and verifies the current 3.1.1/code4 release source, including protected scientific-core integrity, WMM2025, prayer methods/runtime, timezone wiring, trusted GNSS, i18n, phone UI regressions, permission/Adhan cycle, Android Location-service cycle, premium responsive widget, astronomical verification persistence, native Android localization/security and pre-native release readiness before building an unsigned AAB proof.

The active dedicated scientific-core workflow is:

- `.github/workflows/protected-core-integrity.yml`

The obsolete nested workflow under `source/.github/workflows/` has been removed. The active workflow uses the current reviewed protected-core baseline from `source/scripts/check-protected-core.js` and runs the astronomical regression/module-boundary/write-barrier suite on `main`/pull requests.

## Verified signing identities

Play App Signing certificate SHA-256 supplied from Google Play Console:

`2F:04:F6:F6:4D:09:E0:82:32:BC:5A:1F:DD:58:4B:19:8F:37:92:F6:18:18:98:AC:F0:0C:7F:AC:C0:BA:7D:B8`

Local upload keystore SHA-256, independently checked with `keytool` and matched to the previously signed code3 bundle:

`E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7`

Expected local upload-key alias: `qiblaastro`.

The current Digital Asset Links configuration contains the Play App Signing fingerprint above and retains the second historical Play app-signing fingerprint documented in repository history. Do not remove certificate fingerprints without a certificate-rotation audit.

## Release invariants

Release packaging may not casually alter protected application behavior or scientific engines. In particular, preserve:

- QT / computational Qibla mathematics;
- WMM2025 magnetic-declination mathematics;
- digital-compass mathematics;
- astronomical verification/camera calculations;
- prayer calculation equations;
- trusted GNSS security policy;
- Quran/Azkar content unless explicitly scoped and reviewed.

The release includes the approved native integrations, including localized Azkar reminders, authenticated prayer notifications and local Adhan audio, authenticated home Widget, and `QiblaLauncherActivity` with its guarded per-install token behavior.

This ad-free release must not gain advertising-ID permission, and exact-alarm policy must remain limited to the approved user-granted `SCHEDULE_EXACT_ALARM` contract.

## Signing boundary

The upload keystore and all signing passwords are external secrets. They must never be committed. Expected key file is `qiblaastro-upload.jks`, alias `qiblaastro`.

The GitHub release gate builds an unsigned AAB proof from current `main/source`. Final signing is performed locally with the verified upload keystore. Google Play subsequently uses the configured Play App Signing identity for distributed packages.

## 3.1.1 / code4 completion record

The Android **3.1.1 / versionCode 4** release operation has been completed for the existing Google Play **Closed testing** track.

Verified release evidence:

- package `com.qiblalabs`;
- API 36 target;
- unsigned AAB release-candidate proof passed the repository release gates;
- signed locally with upload alias `qiblaastro`;
- signed AAB certificate matches the established upload-key SHA-256 `E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7`;
- signed AAB SHA-256 `1B0F16DEDE0FAB743A7F6827DBA3273838C040A32116DE66CD10458CF167CC12`;
- local `jarsigner -verify` result: `jar verified.`;
- Google Play publishing for the Closed testing Alpha track completed.

This completion record does **not** claim a Production rollout. It records that the 3.1.1/code4 Android build, verification, signing and Closed-testing publication cycle is complete.
