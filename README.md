# QiblaAstro Android Release Repository

This repository is reserved for the final Android release packaging of QiblaAstro ELITE.

- Application ID: `com.qiblalabs`
- Release line: `3.1.0`
- Source of truth before handoff: `msdgabr-sudo/Mizan`
- Approved handoff source commit: `6e49775df5742413371a4165ea985173c43f5f5e`
- Android target: API 36
- Final release format: signed Android App Bundle (`.aab`)

## Security

Signing keystores, passwords, service-account credentials, local Android SDK paths, generated APK/AAB files, and other secrets must never be committed to this repository.

The release branch is created separately from `main` so final AAB packaging work remains isolated from repository bootstrap metadata.
