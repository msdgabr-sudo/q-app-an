# QiblaAstro ELITE — Pre-APK Android Identity

**Release source:** `main/source`  
**Status:** Release-preparation identity freeze  
**Updated:** 2026-08-18

## Approved release identity

- Developer account type: `Personal`
- Developer name / brand: `Qiblalabs`
- App name: `QiblaAstro ELITE`
- Android Package ID: `com.qiblalabs`
- Version Name: `3.1.1`
- Version Code: `4`
- Approved TWA origin: `https://app.qiblalabs.com/`
- Web Manifest URL: `https://app.qiblalabs.com/manifest.json`
- Digital Asset Links URL: `https://app.qiblalabs.com/.well-known/assetlinks.json`
- Privacy Policy: `https://qiblalabs.com/privacy.html`
- GA4 Measurement ID: `G-1D1GKVZB74`
- Ads in this release: `No`
- Native prayer delivery: authenticated Android bridge with `POST_NOTIFICATIONS` + user-granted `SCHEDULE_EXACT_ALARM`
- Actual prayer-time event: `AlarmManager.setExactAndAllowWhileIdle`
- Restricted `USE_EXACT_ALARM`: `Not used`

## Analytics/privacy boundary

GA4 is limited to coarse usage telemetry: application/surface open, stable screen/page names, navigation views, and active-screen duration. No application location coordinates, camera frames, compass readings, astronomical-verification values, prayer-specific user data, Quran reading detail, Adhkar content, or Android bridge tokens may be transmitted to GA4.

The release analytics implementation is web/TWA `gtag.js` only. It does not add Firebase Analytics, an advertising SDK, `AD_ID`, or an analytics-specific Android runtime permission. Application functionality remains independent of analytics consent.

## Android / TWA hard gates

1. Keep Package ID `com.qiblalabs` unchanged.
2. Keep `https://app.qiblalabs.com/` as the production TWA origin.
3. Do not publish Digital Asset Links with a guessed certificate fingerprint.
4. Keep signing material outside the repository.
5. Target API 36.
6. Require the merged release manifest to contain the authenticated `QiblaLauncherActivity` and `PrayerWidgetSyncActivity` bridge.
7. Require `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM` for enabled Native Adhan on applicable Android versions.
8. Reject `USE_EXACT_ALARM`, `AD_ID`, microphone, broad storage and unrelated sensitive permissions.
9. Build and test the AAB on the appropriate Google Play testing track before production.
10. Do not change QT, compass, WMM2025, astronomical verification, camera or prayer equations as part of Android wrapper work.

## Native Adhan release contract

- The existing web prayer calculation engine remains the only source of prayer times.
- A validated date-stamped plan is handed to Android through the authenticated per-install bridge.
- The current native plan horizon is up to 180 days and must match the displayed current-day prayer schedule before it can cross the bridge.
- Android requests notification permission first, then exact-alarm special access when required.
- The actual prayer event uses an exact idle-safe alarm; the optional pre-prayer notice remains separate and inexact.
- Native ownership is reported back to the TWA only when a valid schedule and required permissions are active.
- The legacy Web Adhan scheduler remains a fallback only while Native ownership is not confirmed, preventing duplicate playback.
- Reboot, app replacement, device time/timezone changes and exact-alarm grant changes trigger rescheduling from the stored plan.

## Build tooling decision

- Generate the Android wrapper from `android-twa/twa-manifest.json` using the guarded Bubblewrap path.
- Preserve Package ID `com.qiblalabs`, host `app.qiblalabs.com`, start path `/?twa=1`, app version `3.1.1`, version code `4`, and the approved icons.
- Enforce API 36 after Bubblewrap generation.
- Inject only the approved Native features, then inspect the **merged release AndroidManifest** before accepting the AAB.

## Acceptance gate before AAB upload

- PWA manifest valid.
- Service Worker registration/offline startup validated.
- Required icons and maskable icons validated.
- Location and camera flows validated on a physical device.
- `POST_NOTIFICATIONS` allow/deny paths validated.
- `Alarms & reminders` allow/deny paths validated on Android 12+.
- Adhan fires at the displayed prayer minute with the app closed and screen locked.
- Optional pre-prayer notification does not change the Adhan time.
- Only one Adhan plays while the TWA is open.
- Future prayer alarms restore after device restart.
- Revoked exact-alarm or notification access does not produce a false-success state.
- Package/version fields match `3.1.1 / code4`.
- Digital Asset Links and Play signing certificate are verified before final rollout.
