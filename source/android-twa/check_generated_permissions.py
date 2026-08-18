#!/usr/bin/env python3
"""Validate the merged release AndroidManifest used by the AAB.

This gate verifies both permission policy and the native components required by
first-run Adhan activation. It intentionally inspects Gradle's merged RELEASE
manifest because dependency manifests and Bubblewrap generation can change the
final package surface.
"""
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
ANDROID = "{http://schemas.android.com/apk/res/android}"
EXPECTED_VERSION_NAME = "3.1.1"
EXPECTED_VERSION_CODE = "4"
LAUNCHER = "com.qiblalabs.nativebridge.QiblaLauncherActivity"
PRAYER_SYNC = "com.qiblalabs.nativebridge.PrayerWidgetSyncActivity"
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
}
for permission in sorted(required):
    if permission not in permissions:
        errors.append(f"required release permission missing from merged manifest: {permission}")

forbidden = {
    "android.permission.RECORD_AUDIO": "microphone is not used; audio is playback-only",
    "com.google.android.gms.permission.AD_ID": "first release is ad-free",
    "android.permission.READ_EXTERNAL_STORAGE": "app does not need broad media/file access",
    "android.permission.WRITE_EXTERNAL_STORAGE": "app does not need broad file write access",
    "android.permission.MANAGE_EXTERNAL_STORAGE": "app does not need all-files access",
    "android.permission.READ_CONTACTS": "contacts are not used",
    "android.permission.WRITE_CONTACTS": "contacts are not used",
    "android.permission.READ_CALENDAR": "calendar data is not read",
    "android.permission.WRITE_CALENDAR": "calendar data is not written",
    "android.permission.SCHEDULE_EXACT_ALARM": "Azkar reminders intentionally use inexact idle-safe alarms",
    "android.permission.USE_EXACT_ALARM": "Azkar reminders intentionally use inexact idle-safe alarms",
}
for permission, reason in forbidden.items():
    if permission in permissions:
        errors.append(f"forbidden permission present: {permission} ({reason})")

application = root.find("application")
if application is None:
    errors.append("merged release manifest has no application element")
else:
    activities = {a.get(ANDROID + "name"): a for a in application.findall("activity") if a.get(ANDROID + "name")}
    launcher = activities.get(LAUNCHER)
    sync = activities.get(PRAYER_SYNC)
    if launcher is None:
        errors.append(f"native authenticated launcher missing from merged release: {LAUNCHER}")
    else:
        launcher_ok = False
        for filt in launcher.findall("intent-filter"):
            actions = {x.get(ANDROID + "name") for x in filt.findall("action")}
            categories = {x.get(ANDROID + "name") for x in filt.findall("category")}
            if "android.intent.action.MAIN" in actions and "android.intent.category.LAUNCHER" in categories:
                launcher_ok = True
                break
        if not launcher_ok:
            errors.append("QiblaLauncherActivity is present but is not the MAIN/LAUNCHER activity")

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

notes.append("source: Gradle merged RELEASE manifest; dependency manifests included")
notes.append("release identity: QiblaAstro 3.1.1 code4")
notes.append("native Adhan path: QiblaLauncherActivity token -> PrayerWidgetSyncActivity -> POST_NOTIFICATIONS")
notes.append("camera remains a web/TWA site permission; CAMERA is not forced into wrapper manifest")
notes.append("exact-alarm permissions remain forbidden; scheduler uses setAndAllowWhileIdle")

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
print("PASS: release 3.1.1 code4 contains the authenticated native Adhan permission path")
