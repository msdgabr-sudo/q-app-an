# QiblaAstro q-app-an — Repository Operating State

> **READ THIS FILE BEFORE ANY BRANCH, RELEASE, ANDROID, DEPLOYMENT, OR SOURCE-MATERIALIZATION OPERATION.**
>
> This file is the repository-level operating contract. Current executable state must always be confirmed against live `main` HEAD and release gates; historical checkpoints remain historical only.

## 1. Authoritative working and release branch

The single authoritative source of truth is:

- **`main`** — deployed web application, current application source, Android release source, release verification, and future platform handoff source.

Short-lived `agent/*`, `feature/*`, `fix/*`, `chore/*` or other topic branches may exist while work or historical review is in progress. Their presence does **not** create an alternative release source. No topic branch may be used as a production/release baseline unless it has been reviewed and merged into `main`.

Do not create a parallel long-lived development/release line unless the repository owner explicitly changes this policy.

## 2. Immutable historical reference

Historical reference tag:

`qiblaastro-3.1.0-single-branch-reference`

This tag is a historical recovery/checkpoint reference from the 3.1.0 consolidation period. It is **not** the current release identity and must never be moved, force-updated, rewritten, retargeted, reused, or developed on.

A checkout of the tag is for inspection, recovery comparison, or historical audit only and should normally be treated as read-only/detached HEAD.

## 3. Historical source provenance versus current source of truth

The `source/` directory was originally materialized from:

- Repository: `msdgabr-sudo/Mizan`
- Historical source branch: `a2-release-prep`
- Historical approved baseline SHA: `6e49775df5742413371a4165ea985173c43f5f5e`

`source/.release-source-sha` records that **historical baseline provenance**.

It does **NOT** mean that current `main/source` must be byte-for-byte replaced by that old Mizan snapshot. `main/source` intentionally contains validated post-baseline fixes and release work.

**Current `main/source` is authoritative. Never overwrite it by re-materializing the historical Mizan baseline.**

The former materialization workflow is a manual, read-only provenance audit only.

## 4. Current Android release identity

- Product: `QiblaAstro ELITE`
- Package / Application ID: `com.qiblalabs`
- Version name: **`3.1.1`**
- Version code: **`4`**
- Minimum SDK: `23`
- Compile SDK: `36`
- Target SDK: `36`
- TWA origin: `https://app.qiblalabs.com`
- Web deployment source: `main`
- Android release source: current `main/source`

Executable release identity is additionally frozen by `source/android-twa/twa-manifest.json`, `source/tools/pre_apk_check.py`, and `.github/workflows/verify-release-snapshot.yml`. A Markdown document must never override conflicting executable release metadata.

## 5. Protected application systems

Unless an explicitly scoped task proves a change is necessary, do not alter protected scientific/runtime systems while doing repository, release, UI, cache, packaging, or branch maintenance:

- computational Qibla / QT mathematics;
- WMM2025 and magnetic-declination mathematics;
- digital-compass mathematics;
- astronomical verification/camera solving;
- prayer-time calculation equations;
- trusted GNSS security policy.

WMM2025 corrects magnetic north versus true north. It does not calculate the Qibla.

Computational Qibla and astronomical verification remain separate systems; astronomical verification must never overwrite the computational Qibla result.

## 6. Protected scientific-core integrity gate

The active workflow is:

- `.github/workflows/protected-core-integrity.yml`

It runs against `main`/pull requests from the repository root and validates the protected scientific-core blob baseline plus the astronomical regression/module-boundary/write-barrier tests.

The hash gate implementation is:

- `source/scripts/check-protected-core.js`

For release 3.1.1/code4, the protected baseline includes the already-reviewed astronomical verification persistence-store state while calculation/solver protected hashes remain frozen. Any future baseline change requires explicit review; do not update hashes merely to make CI green.

The obsolete nested workflow path `source/.github/workflows/protected-core-integrity.yml` is intentionally removed because GitHub Actions only treats root `.github/workflows/` as active workflows for this repository.

## 7. Location and Falaki post-baseline fixes that must be preserved

Important behavior to preserve:

- Location permission grant is distinct from availability of the first GNSS fix.
- `PERMISSION_DENIED` is the location-permission rejection case; GNSS timeout/unavailability must not create a permission-onboarding loop.
- Notification permission remains contextual and is not requested concurrently with first-run location permission.
- Trusted GNSS remains the authoritative live location source for protected application calculations.
- Falaki may keep its own last trusted location solely to render current-time astronomy immediately on reopen; that stored location must not become a fallback input for QT, WMM2025, prayer calculations, compass, or astronomical verification.

## 8. Release workflows

- `.github/workflows/deploy-app-pages.yml` deploys the web application from `main`.
- `.github/workflows/verify-release-snapshot.yml` is the authoritative release verification/AAB proof gate for current `main/source`.
- `.github/workflows/protected-core-integrity.yml` is the active protected scientific-core gate for `main`.
- `.github/workflows/materialize-frozen-source.yml` is historical provenance **READ-ONLY** audit only. It must never recreate, replace, commit, or push `source/`.

The release workflow itself also executes protected-core hash/regression checks so a release proof cannot silently bypass scientific-core integrity even if repository required-check settings change.

Any future workflow change that can overwrite `main/source` from the historical Mizan baseline is a regression and must be rejected.

## 9. Signing boundary

Signing material remains external to GitHub:

- Upload-key alias: `qiblaastro`
- Keystores/passwords/service-account credentials must never be committed.
- Final signing is local using the verified existing upload key.

Do not add signing secrets to Actions merely to simplify release automation.

## 10. Release completion record — 3.1.1 / code 4

**Android release 3.1.1 / versionCode 4 release preparation is completed.**

Completion evidence:

- authoritative source: `main/source`;
- package: `com.qiblalabs`;
- target API: `36`;
- full unsigned release-candidate AAB proof passed before signing;
- final AAB was signed locally with the established `qiblaastro` upload key;
- upload-key certificate SHA-256: `E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7`;
- final signed AAB SHA-256: `1B0F16DEDE0FAB743A7F6827DBA3273838C040A32116DE66CD10458CF167CC12`;
- `jarsigner -verify` completed with `jar verified.`;
- the signed 3.1.1/code4 bundle was uploaded and published to the existing Google Play **Closed testing** track.

This record means the **3.1.1/code4 Android release operation is complete for Closed testing**. It does not claim Production rollout or Production access approval.

## 11. Instructions for future maintainers and platform work

1. Read this file first.
2. Inspect live `main` HEAD before making any conclusion or write.
3. Treat current `main/source` as the only application/release source of truth.
4. Treat 3.1.0 tags/baselines as historical evidence only.
5. Never reset `main` to a historical tag or Mizan baseline without explicit owner authorization and a proven recovery need.
6. Run release/security/scientific-core gates after changes that affect release behavior or protected paths.
7. Do not infer current code state or version numbers from old conversation text or historical Markdown when executable metadata can be inspected directly.
8. Topic branches are non-authoritative until merged to `main`.

## 12. Repository-state completion criterion

Repository state is considered internally consistent when all of the following are true:

- executable release metadata and repository documentation agree on the current version/code;
- `main` is the only authoritative working/release source;
- active workflows live under root `.github/workflows/` and target `main`;
- protected scientific-core integrity is executed by the active core workflow and the release gate;
- signing secrets remain outside GitHub;
- historical branches/tags, if retained, are clearly non-authoritative and cannot redefine the release source.
