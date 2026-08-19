# QiblaAstro ELITE — Android Permission & Capability Release Matrix

**Release source:** `main/source`  
**Package:** `com.qiblalabs`  
**Origin:** `https://app.qiblalabs.com`  
**Release:** `3.1.2` / `versionCode 5`
**Target:** Android 16 / API 36

This document is a release boundary. A permission must not be added merely "just in case". Each permission/capability must have a current user-facing feature, a runtime flow, a privacy disclosure where applicable, and a physical-device acceptance test.

## Location
- Feature: trusted GNSS for Qibla, prayer calculations and astronomical verification inputs.
- TWA config: `features.locationDelegation.enabled = true`.
- Required wrapper permissions after Bubblewrap generation:
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.ACCESS_FINE_LOCATION`
- Runtime rule: location permission and acquisition of a trusted high-accuracy GNSS fix are separate states.
- Native runtime rule: an authenticated, user-initiated Android Activity requests foreground precise Location first; if the device Location service is off, it then opens the system Location settings. Browser/site permission state is not accepted as proof of the Android app grant.
- Privacy rule: precise coordinates remain functional data and must not be sent by analytics.

## Notifications
- Feature: native prayer/Adhan delivery and Azkar reminders.
- TWA config: `enableNotifications = true`.
- Required on Android 13+:
  - `android.permission.POST_NOTIFICATIONS`
- Runtime rule: request contextually from an explicit user action. An enabled Adhan plan is not persisted/scheduled until the notification permission is granted.

## Exact prayer-time Adhan
The native background Adhan scheduler remains enabled in release `3.1.2 / code5`.

Required special access:
- `android.permission.SCHEDULE_EXACT_ALARM`

Release rules:
- Actual prayer-time events use `AlarmManager.setExactAndAllowWhileIdle(...)`.
- Before any exact event is scheduled, call `canScheduleExactAlarms()`.
- When access is missing, an **interactive user action only** may open Android's `Alarms & reminders` screen using `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`.
- Automatic/background refresh must never open permission UI.
- `USE_EXACT_ALARM` remains forbidden; this app uses the user-granted `SCHEDULE_EXACT_ALARM` path.
- Informational pre-prayer alerts remain separate inexact alarms; they do not alter the actual prayer-time event.
- If exact access is unavailable or revoked, native Adhan ownership fails closed instead of claiming a valid schedule.
- On grant, reboot, app replacement, device time change, or timezone change, the stored plan is rescheduled.

The web prayer engine remains the only source of prayer calculations. It sends a validated date-stamped plan to Android; Android does not duplicate the prayer equations.

## Native Adhan ownership
- Android Native owns Adhan delivery only after the launcher confirms that notifications, exact-alarm access and a valid native schedule are active.
- The existing Web Adhan scheduler remains a fallback only when Native ownership is not confirmed.
- This prevents two simultaneous Adhan playbacks while preserving fallback behavior outside the installed Android path.

## Dated prayer plan
- The native bridge accepts a validated plan of up to 180 days.
- The plan is generated from the approved existing prayer calculation engine and must match the live displayed schedule for the current day before crossing the bridge.
- The plan is refreshed when the app starts and after trusted location/prayer-runtime changes.
- An exhausted plan fails closed; it must not replay stale daily times.

## Camera
- Feature: sun/moon astronomical observation.
- Camera remains a web/TWA site permission.
- Do **not** add `android.permission.CAMERA` merely for symmetry unless the native architecture later requires it.

## Audio / privacy boundaries
- Local Quran/Serenity/Adhan playback does not justify microphone permission.
- Explicitly forbidden: `android.permission.RECORD_AUDIO`.
- No background location permission.
- No broad storage, contacts, calendar, SMS or call-log permissions.
- `com.google.android.gms.permission.AD_ID` remains forbidden while the release is ad-free.

## Native resilience acceptance
Before Play upload, verify on a physical Android device:
1. Fresh install and location permission.
2. Enable Adhan from the explicit first-run action.
3. Android 13+: allow `POST_NOTIFICATIONS`.
4. Android 12+: allow `Alarms & reminders` when requested.
5. Confirm actual Adhan at the displayed prayer minute with the app closed and screen locked.
6. Confirm any pre-prayer reminder is separate and does not move the Adhan time.
7. Confirm only one Adhan is heard when the TWA is open.
8. Reboot the device and confirm future alarms are restored.
9. Revoke exact-alarm access; confirm Native ownership fails closed and no misleading success state is shown on the next app launch.
10. Revoke notification permission; confirm no crash and no false enabled state after the next activation attempt.

## Automated gates
- `check_twa_config.py` verifies package and release identity.
- `check_generated_permissions.py` inspects the merged **release** AndroidManifest and requires `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, the authenticated launcher/prayer-sync components and the exact-alarm grant receiver while rejecting `USE_EXACT_ALARM`.
- `permissions-gnss-adhan-cycle.test.js` gates permission ordering, exact prayer scheduling, Native/Web ownership and the long dated plan.
- `native-android-localization-security.test.js` gates the authenticated native bridge, local resources and background delivery contract.
- `build_signed_release.ps1` remains the guarded local signing path; GitHub Actions also builds an unsigned AAB proof from current `main/source`.
