# QiblaAstro ELITE — Pre-APK Android Identity

**Release source:** `fix/code5-native-bridge-location` based on exact released code4 source  
**Status:** Isolated release-candidate validation — not production/live  
**Updated:** 2026-08-19

## Approved candidate identity

- Developer account type: `Personal`
- Developer name / brand: `Qiblalabs`
- App name: `QiblaAstro ELITE`
- Android Package ID: `com.qiblalabs`
- Version Name: `3.1.2`
- Version Code: `5`
- Approved TWA origin: `https://app.qiblalabs.com/`
- Web Manifest URL: `https://app.qiblalabs.com/manifest.json`
- Digital Asset Links URL: `https://app.qiblalabs.com/.well-known/assetlinks.json`
- Privacy Policy: `https://qiblalabs.com/privacy.html`
- GA4 Measurement ID: `G-1D1GKVZB74`
- Ads in this release: `No`
- Native bridge capability marker: `nativeBridge=5` in the non-secret launch query
- Native foreground Location permission: authenticated `LocationPermissionActivity`, requested only after a user action
- Native coordinate acquisition: `None` — coordinates remain owned by the existing Trusted GNSS web/TWA path
- Native Location-service settings: authenticated `LocationSettingsActivity`
- Native prayer delivery: authenticated Android bridge with `POST_NOTIFICATIONS` + user-granted `SCHEDULE_EXACT_ALARM`
- Actual prayer-time event: `AlarmManager.setExactAndAllowWhileIdle`
- Restricted `USE_EXACT_ALARM`: `Not used`
- Native Azkar reminder: authenticated Android bridge, minimum 15 minutes, `POST_NOTIFICATIONS`, inexact `setAndAllowWhileIdle`
- Azkar exact-alarm usage: `None` — exact scheduling remains reserved for prayer-time Adhan

## Analytics/privacy boundary

GA4 is limited to coarse usage telemetry: application/surface open, stable screen/page names, navigation views, and active-screen duration. No application location coordinates, camera frames, compass readings, astronomical-verification values, prayer-specific user data, Quran reading detail, Adhkar content, or Android bridge tokens may be transmitted to GA4.

The release analytics implementation is web/TWA `gtag.js` only. It does not add Firebase Analytics, an advertising SDK, `AD_ID`, or an analytics-specific Android runtime permission. Application functionality remains independent of analytics consent.

## Android / TWA hard gates

1. Keep Package ID `com.qiblalabs` unchanged.
2. Keep `https://app.qiblalabs.com/` as the production TWA origin.
3. Keep the code5 recovery web module gated on `nativeBridge=5`; code4 clients must not invoke code5-only custom routes.
4. Keep signing material outside the repository.
5. Target API 36.
6. Require the merged release manifest to contain `QiblaLauncherActivity`, `PrayerWidgetSyncActivity`, `LocationSettingsActivity`, `LocationPermissionActivity`, `AzkarReminderActivity`, and the premium responsive Widget provider.
7. Require the launcher to expose `qiblaastro://native-bootstrap`, and `LocationPermissionActivity` to expose `qiblaastro://location-permission`.
8. Require Native Location permission bridge token validation and prohibit it from acquiring/storing coordinates.
9. Require `POST_NOTIFICATIONS` for Native Adhan/Azkar, and `SCHEDULE_EXACT_ALARM` only for exact Native Adhan on applicable Android versions.
10. Reject `ACCESS_BACKGROUND_LOCATION`, `USE_EXACT_ALARM`, `AD_ID`, microphone, broad storage and unrelated sensitive permissions.
11. Build and test the AAB on the closed Google Play testing track before any wider rollout.
12. Do not change QT, compass, WMM2025, astronomical verification, camera or prayer equations as part of Android wrapper work.

## Native Location recovery contract

- `QiblaLauncherActivity` advertises code5 through the non-secret query parameter `nativeBridge=5` and keeps the per-install `nativeToken` in the URL fragment.
- The web recovery module does nothing unless it sees code5 capability, protecting older code4 clients from code5-only routes.
- If the token is missing on code5, the user can explicitly invoke `qiblaastro://native-bootstrap`, which routes to the launcher and regenerates the authenticated launch context without any Google Play fallback.
- If Android foreground location permission still needs approval, the code5 web module invokes `qiblaastro://location-permission?token=...`.
- `LocationPermissionActivity` validates the per-install token and requests only `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`; it does not obtain coordinates.
- After permission, Android returns through `QiblaLauncherActivity`, then the existing Trusted GNSS path remains solely responsible for the real device fix.
- `ACCESS_BACKGROUND_LOCATION` remains forbidden.

## Native Adhan release contract

- The existing web prayer calculation engine remains the only source of prayer times.
- A validated date-stamped plan is handed to Android through the authenticated per-install bridge.
- The native plan horizon is up to 180 days and must match the displayed current-day prayer schedule before it can cross the bridge.
- Android requests notification permission first, then exact-alarm special access when required.
- The actual prayer event uses an exact idle-safe alarm; the optional pre-prayer notice remains separate and inexact.
- Native ownership is reported back to the TWA only when a valid schedule and required permissions are active.
- The legacy Web Adhan scheduler remains a fallback only while Native ownership is not confirmed, preventing duplicate playback.
- Reboot, app replacement, device time/timezone changes and exact-alarm grant changes trigger rescheduling from the stored plan.

## Native Azkar reminder release contract

- Android Native is the source of truth for whether the repeating Azkar reminder is running.
- The minimum selectable interval is 15 minutes; 5/10-minute values are rejected/normalized by the Native bridge.
- Azkar uses an inexact idle-safe `ELAPSED_REALTIME_WAKEUP` alarm and does not consume exact-alarm access.
- The next target is anchored to the intended interval chain so a delayed Android delivery does not permanently accumulate timing drift.
- Android confirms start/stop/failure back through the authenticated launcher before the Web UI reports the reminder as active.
- Denied/disabled notifications and muted notification channels are surfaced as recoverable states instead of silent button failures.
- Phrase channels use the existing `v2` contract and stable named local raw-audio URIs rather than persisted numeric resource IDs.
- Reboot/app replacement restores an enabled reminder from private Native state.

## Build tooling decision

- Generate the Android wrapper from `android-twa/twa-manifest.json` using the guarded Bubblewrap path.
- Preserve Package ID `com.qiblalabs`, host `app.qiblalabs.com`, start path `/?twa=1`, app version `3.1.2`, version code `5`, and the approved icons.
- Enforce API 36 after Bubblewrap generation.
- Inject only the approved Native features, then inspect the **merged release AndroidManifest** and the built AAB before accepting the candidate.

## Acceptance gate before AAB upload

- PWA manifest valid.
- Service Worker v6.21 registration/cache refresh validated.
- Required icons and maskable icons validated.
- Built AAB contains the real `QiblaLauncherActivity`, `LocationPermissionActivity`, `LocationSettingsActivity`, `native-bootstrap`, and `location-permission` routes.
- Android Location permission allow/deny paths validated on a physical device.
- Trusted GNSS becomes ready after Android permission returns; no approximate/default coordinate is accepted.
- Android Location service OFF/ON recovery validated.
- `POST_NOTIFICATIONS` allow/deny paths validated.
- `Alarms & reminders` allow/deny paths validated on Android 12+ for Native Adhan.
- Adhan fires at the displayed prayer minute with the app closed and screen locked.
- Optional pre-prayer notification does not change the Adhan time.
- Only one Adhan plays while the TWA is open.
- Future prayer alarms restore after device restart.
- Revoked exact-alarm or notification access does not produce a false-success state.
- Azkar screen exposes a 15-minute-or-greater interval and confirms Native start before showing `إيقاف التنبيه`.
- Azkar reminder produces the selected local voice notification with the TWA closed; denial/muted-channel paths show recoverable feedback.
- Azkar reminder restores after reboot/app replacement without adding exact-alarm access.
- Package/version fields match `3.1.2 / code5`.
- Digital Asset Links and Play signing certificate are verified before final rollout.
