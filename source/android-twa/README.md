# QiblaAstro ELITE — Android TWA build workspace

This directory is intentionally isolated from the web application's runtime engines.

## Frozen identity
- Origin: `https://app.qiblalabs.com`
- Package ID: `com.qiblalabs`
- App name: `QiblaAstro ELITE`
- Version name: `3.1.1`
- Version code: `4`
- Current Play release candidate: no ads / no `AD_ID`

## Hard safety boundaries
1. Never commit a `.jks` / `.keystore`, passwords, Play service-account JSON, or signing secrets.
2. The local key created for upload is an **Upload Key**. With Play App Signing, the certificate that signs APKs delivered to users can be different.
3. Production `assetlinks.json` must contain the SHA-256 of the certificate(s) that actually sign installed builds. For Google Play delivery this includes the Play App Signing certificate fingerprint shown in Play Console.
4. Do not publish a guessed or placeholder fingerprint.
5. The project must target API 36 before Play submission. Run the guarded target-API checker/patch after Bubblewrap generation and after every Bubblewrap `update`.
6. Do not modify web Qibla/astronomy/GNSS/camera/prayer engines from this Android workspace.

## Intended sequence
1. Confirm `https://app.qiblalabs.com` and manifest/icon URLs over HTTPS.
2. Generate Android project from `twa-manifest.json` using Bubblewrap.
3. Enforce `compileSdkVersion >= 36` and `targetSdkVersion = 36`.
4. Apply the approved Native integrations and inspect the merged release manifest.
5. Build a signed local APK/AAB for internal validation using the approved Upload Key kept outside Git.
6. Capture the required signing certificate SHA-256 values for direct-device and Play delivery validation.
7. Verify Digital Asset Links and TWA fullscreen behavior.
8. Validate exact native Adhan, notification/exact-alarm permissions, reboot restoration and Azkar background behavior on a physical device.

## Bubblewrap structural commands
```bash
cd android-twa
bubblewrap update --skipVersionUpgrade --manifest=./twa-manifest.json
python3 ensure_target_api_36.py
pwsh -NoProfile -File ./apply_native_azkar_reminders.ps1
pwsh -NoProfile -File ./apply_native_widget.ps1
./gradlew :app:processReleaseMainManifest --no-daemon
python3 check_generated_permissions.py
bubblewrap build --skipSigning --skipPwaValidation --manifest=./twa-manifest.json
```

The unsigned build is only a structural build gate. A release artifact must later be signed with the approved Upload Key.
