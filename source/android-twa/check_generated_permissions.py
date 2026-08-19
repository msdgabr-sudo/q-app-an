#!/usr/bin/env python3
"""Validate the merged release AndroidManifest used by the AAB.

This gate verifies both permission policy and the native components required by
first-run Adhan activation plus the authenticated Android Location recovery path.
It intentionally inspects Gradle's merged RELEASE manifest because dependency
manifests and Bubblewrap generation can change the final package surface.
"""
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
ANDROID = "{http://schemas.android.com/apk/res/android}"
EXPECTED_VERSION_NAME = "3.1.2"
EXPECTED_VERSION_CODE = "5"
LAUNCHER = "com.qiblalabs.nativebridge.QiblaLauncherActivity"
PRAYER_SYNC = "com.qiblalabs.nativebridge.PrayerWidgetSyncActivity"
LOCATION_SETTINGS = "com.qiblalabs.nativebridge.LocationSettingsActivity"
LOCATION_PERMISSION = "com.qiblalabs.nativebridge.LocationPermissionActivity"
PRAYER_BOOT = "com.qiblalabs.nativebridge.PrayerBootReceiver"
errors: list[str] = []
notes: list[str] = []

candidates: list[Path] = []
intermediates = ROOT / "app" / "build" / "intermediates"
if intermediates.is_dir():
    for path in intermediates.rglob("AndroidManifest.xml"):
        lowered = str(path).replace("\\", "/").lower()
        if "/release/" not in lowered:
            continue
        if "merged_manifest" in lowered or "merged_manifests" in lowered:
            candidates.append(path)

if not candidates:
    print("ERROR: no merged release AndroidManifest.xml found. Run :app:processReleaseMainManifest before this gate.", file=sys.stderr)
    raise SystemExit(1)
MANIFEST = max(candidates, key=lambda p: p.stat().st_mtime)
try:
    tree = ET.parse(MANIFEST)
except Exception as exc:
    print(f"ERROR: cannot parse merged release manifest {MANIFEST}: {exc}", file=sys.stderr)
    raise SystemExit(1)

root = tree.getroot()
if root.get(ANDROID + "versionName") != EXPECTED_VERSION_NAME:
    errors.append(f"merged release versionName must be {EXPECTED_VERSION_NAME}; found {root.get(ANDROID + 'versionName')!r}")
if root.get(ANDROID + "versionCode") != EXPECTED_VERSION_CODE:
    errors.append(f"merged release versionCode must be {EXPECTED_VERSION_CODE}; found {root.get(ANDROID + 'versionCode')!r}")

permissions = {el.get(ANDROID + "name") for el in root.findall("uses-permission") if el.get(ANDROID + "name")}
required = {
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.SCHEDULE_EXACT_ALARM",
}
for permission in sorted(required):
    if permission not in permissions:
        errors.append(f"required release permission missing from merged manifest: {permission}")

forbidden = {
    "android.permission.ACCESS_BACKGROUND_LOCATION": "foreground location is sufficient; native bridge never acquires background coordinates",
    "android.permission.RECORD_AUDIO": "microphone is not used; audio is playback-only",
    "com.google.android.gms.permission.AD_ID": "release is ad-free",
    "android.permission.READ_EXTERNAL_STORAGE": "app does not need broad media/file access",
    "android.permission.WRITE_EXTERNAL_STORAGE": "app does not need broad file write access",
    "android.permission.MANAGE_EXTERNAL_STORAGE": "app does not need all-files access",
    "android.permission.READ_CONTACTS": "contacts are not used",
    "android.permission.WRITE_CONTACTS": "contacts are not used",
    "android.permission.READ_CALENDAR": "calendar data is not read",
    "android.permission.WRITE_CALENDAR": "calendar data is not written",
    "android.permission.USE_EXACT_ALARM": "Play-restricted auto-granted exact alarm permission is not used; user-granted SCHEDULE_EXACT_ALARM is required instead",
}
for permission, reason in forbidden.items():
    if permission in permissions:
        errors.append(f"forbidden permission present: {permission} ({reason})")

application = root.find("application")
if application is None:
    errors.append("merged release manifest has no application element")
else:
    activities = {a.get(ANDROID + "name"): a for a in application.findall("activity") if a.get(ANDROID + "name")}
    receivers = {r.get(ANDROID + "name"): r for r in application.findall("receiver") if r.get(ANDROID + "name")}
    launcher = activities.get(LAUNCHER)
    sync = activities.get(PRAYER_SYNC)
    location_settings = activities.get(LOCATION_SETTINGS)
    location_permission = activities.get(LOCATION_PERMISSION)
    boot = receivers.get(PRAYER_BOOT)
    if launcher is None:
        errors.append(f"native authenticated launcher missing from merged release: {LAUNCHER}")
    else:
        launcher_ok = False
        bootstrap_ok = False
        for filt in launcher.findall("intent-filter"):
            actions = {x.get(ANDROID + "name") for x in filt.findall("action")}
            categories = {x.get(ANDROID + "name") for x in filt.findall("category")}
            if "android.intent.action.MAIN" in actions and "android.intent.category.LAUNCHER" in categories:
                launcher_ok = True
            for data in filt.findall("data"):
                if (
                    "android.intent.action.VIEW" in actions
                    and "android.intent.category.DEFAULT" in categories
                    and "android.intent.category.BROWSABLE" in categories
                    and data.get(ANDROID + "scheme") == "qiblaastro"
                    and data.get(ANDROID + "host") == "native-bootstrap"
                ):
                    bootstrap_ok = True
        if not launcher_ok:
            errors.append("QiblaLauncherActivity is present but is not the MAIN/LAUNCHER activity")
        if not bootstrap_ok:
            errors.append("QiblaLauncherActivity qiblaastro://native-bootstrap VIEW/BROWSABLE recovery route is missing")

    if sync is None:
        errors.append(f"native prayer sync Activity missing from merged release: {PRAYER_SYNC}")
    else:
        if sync.get(ANDROID + "exported") != "true":
            errors.append("PrayerWidgetSyncActivity must be exported=true for the authenticated browser/TWA intent")
        bridge_ok = False
        for filt in sync.findall("intent-filter"):
            actions = {x.get(ANDROID + "name") for x in filt.findall("action")}
            categories = {x.get(ANDROID + "name") for x in filt.findall("category")}
            data = filt.find("data")
            if (
                "android.intent.action.VIEW" in actions
                and "android.intent.category.DEFAULT" in categories
                and "android.intent.category.BROWSABLE" in categories
                and data is not None
                and data.get(ANDROID + "scheme") == "qiblaastro"
                and data.get(ANDROID + "host") == "prayer-sync"
            ):
                bridge_ok = True
                break
        if not bridge_ok:
            errors.append("PrayerWidgetSyncActivity qiblaastro://prayer-sync VIEW/BROWSABLE contract is missing")

    if location_settings is None:
        errors.append(f"native Location settings Activity missing from merged release: {LOCATION_SETTINGS}")
    else:
        if location_settings.get(ANDROID + "exported") != "true":
            errors.append("LocationSettingsActivity must be exported=true for the authenticated TWA intent")
        location_bridge_ok = False
        for filt in location_settings.findall("intent-filter"):
            actions = {x.get(ANDROID + "name") for x in filt.findall("action")}
            categories = {x.get(ANDROID + "name") for x in filt.findall("category")}
            data = filt.find("data")
            if (
                "android.intent.action.VIEW" in actions
                and "android.intent.category.DEFAULT" in categories
                and "android.intent.category.BROWSABLE" in categories
                and data is not None
                and data.get(ANDROID + "scheme") == "qiblaastro"
                and data.get(ANDROID + "host") == "location-settings"
            ):
                location_bridge_ok = True
                break
        if not location_bridge_ok:
            errors.append("LocationSettingsActivity qiblaastro://location-settings VIEW/BROWSABLE contract is missing")

    if location_permission is None:
        errors.append(f"native foreground Location permission Activity missing from merged release: {LOCATION_PERMISSION}")
    else:
        if location_permission.get(ANDROID + "exported") != "true":
            errors.append("LocationPermissionActivity must be exported=true for the authenticated TWA intent")
        permission_bridge_ok = False
        for filt in location_permission.findall("intent-filter"):
            actions = {x.get(ANDROID + "name") for x in filt.findall("action")}
            categories = {x.get(ANDROID + "name") for x in filt.findall("category")}
            data = filt.find("data")
            if (
                "android.intent.action.VIEW" in actions
                and "android.intent.category.DEFAULT" in categories
                and "android.intent.category.BROWSABLE" in categories
                and data is not None
                and data.get(ANDROID + "scheme") == "qiblaastro"
                and data.get(ANDROID + "host") == "location-permission"
            ):
                permission_bridge_ok = True
                break
        if not permission_bridge_ok:
            errors.append("LocationPermissionActivity qiblaastro://location-permission VIEW/BROWSABLE contract is missing")

    if boot is None:
        errors.append(f"prayer reboot/exact-permission receiver missing: {PRAYER_BOOT}")
    else:
        actions=set()
        for filt in boot.findall("intent-filter"):
            actions.update(x.get(ANDROID + "name") for x in filt.findall("action"))
        if "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" not in actions:
            errors.append("PrayerBootReceiver must reschedule when exact-alarm special access is granted")

notes.append("source: Gradle merged RELEASE manifest; dependency manifests included")
notes.append("release identity: QiblaAstro 3.1.2 code5")
notes.append("native Adhan path: QiblaLauncherActivity token -> PrayerWidgetSyncActivity -> POST_NOTIFICATIONS -> SCHEDULE_EXACT_ALARM -> exact prayer alarm")
notes.append("Location path: code5 launcher capability/token -> authenticated foreground LocationPermissionActivity -> existing Trusted GNSS web path")
notes.append("Location-service OFF path remains authenticated LocationSettingsActivity -> Android Location settings -> launcher refresh")
notes.append("ACCESS_BACKGROUND_LOCATION remains forbidden; coordinates stay owned by the existing foreground Trusted GNSS path")
notes.append("camera remains a web/TWA site permission; CAMERA is not forced into wrapper manifest")
notes.append("USE_EXACT_ALARM remains forbidden; exact alarm access is user-granted through SCHEDULE_EXACT_ALARM")

print("QiblaAstro ELITE — Merged Release Native/Permission Gate")
print("=" * 62)
print("Manifest:", MANIFEST)
for note in notes:
    print("NOTE:", note)
print("Declared merged release permissions:")
for permission in sorted(permissions):
    print(" -", permission)
if errors:
    for error in errors:
        print("ERROR:", error, file=sys.stderr)
    print(f"FAILED: {len(errors)} merged-release issue(s)", file=sys.stderr)
    raise SystemExit(1)
print("PASS: release 3.1.2 code5 contains authenticated Adhan plus Native bootstrap and foreground Location recovery paths")
