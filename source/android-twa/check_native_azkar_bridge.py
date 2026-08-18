#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
APP = ROOT / "app"
MANIFEST = APP / "src" / "main" / "AndroidManifest.xml"
JAVA = APP / "src" / "main" / "java" / "com" / "qiblalabs" / "azkar"
RES = APP / "src" / "main" / "res"
RAW = RES / "raw"
ANDROID = "{http://schemas.android.com/apk/res/android}"
errors: list[str] = []

def fail(message: str) -> None: errors.append(message)

required_java = {"AzkarReminderScheduler.java","AzkarReminderReceiver.java","AzkarReminderActivity.java","AzkarBootReceiver.java"}
required_raw = {"azkar_subhanallah.mp3","azkar_alhamdulillah.mp3","azkar_allahuakbar.mp3","azkar_lailahaillallah.mp3","azkar_astaghfirullah.mp3","azkar_astaghfirullahalazim.mp3","azkar_subhanallahwabihamdih.mp3","azkar_lahawla.mp3","azkar_hasbiyallah.mp3","azkar_salat.mp3"}
required_sets = ("values","values-en","values-fr","values-id","values-ur")
required_strings = {"azkar_channel_name","azkar_channel_description","azkar_notification_title","azkar_permission_required","azkar_started_toast"}

if not MANIFEST.is_file(): fail(f"generated manifest missing: {MANIFEST}")
else:
    try:
        root = ET.parse(MANIFEST).getroot()
        permissions = {n.get(ANDROID+"name") for n in root.findall("uses-permission") if n.get(ANDROID+"name")}
        for required in ("android.permission.RECEIVE_BOOT_COMPLETED","android.permission.POST_NOTIFICATIONS"):
            if required not in permissions: fail(f"{required} missing from generated manifest")
        # Azkar itself must not add exact-alarm access. The later prayer-native injection may add
        # SCHEDULE_EXACT_ALARM for exact prayer-time Adhan, but this isolated Azkar phase must not.
        for forbidden in ("android.permission.SCHEDULE_EXACT_ALARM","android.permission.USE_EXACT_ALARM"):
            if forbidden in permissions: fail(f"Azkar phase added forbidden exact-alarm permission: {forbidden}")
        app = root.find("application")
        if app is None: fail("application node missing")
        else:
            activities={n.get(ANDROID+"name"):n for n in app.findall("activity")}; receivers={n.get(ANDROID+"name"):n for n in app.findall("receiver")}
            a=activities.get("com.qiblalabs.azkar.AzkarReminderActivity")
            if a is None or a.get(ANDROID+"exported")!="true": fail("AzkarReminderActivity bridge contract invalid")
            for name in ("com.qiblalabs.azkar.AzkarReminderReceiver","com.qiblalabs.azkar.AzkarBootReceiver"):
                n=receivers.get(name)
                if n is None or n.get(ANDROID+"exported")!="false": fail(f"{name} must exist and remain non-exported")
    except Exception as exc: fail(f"cannot parse generated manifest: {exc}")

if not JAVA.is_dir(): fail(f"native Java destination missing: {JAVA}")
else:
    present={p.name for p in JAVA.glob("*.java")}
    for name in sorted(required_java-present): fail(f"native source missing: {name}")
if not RAW.is_dir(): fail(f"res/raw missing: {RAW}")
else:
    present={p.name for p in RAW.glob("*.mp3")}
    for name in sorted(required_raw-present): fail(f"native audio missing: {name}")

for set_name in required_sets:
    f=RES/set_name/"qiblaastro_azkar_strings.xml"
    if not f.is_file(): fail(f"localized Android resources missing: {set_name}"); continue
    try:
        names={n.get("name") for n in ET.parse(f).getroot().findall("string")}
        missing=required_strings-names
        if missing: fail(f"{set_name} missing strings: {', '.join(sorted(missing))}")
    except Exception as exc: fail(f"cannot parse {set_name} strings: {exc}")

scheduler=JAVA/"AzkarReminderScheduler.java"
if scheduler.is_file():
    text=scheduler.read_text(encoding="utf-8")
    for required in ("MIN_INTERVAL_MINUTES = 15","setAndAllowWhileIdle","ELAPSED_REALTIME_WAKEUP","KEY_NEXT_ELAPSED","scheduleNextFromDelivery","restartAfterBoot","restore(Context context)"):
        if required not in text: fail(f"scheduler contract missing: {required}")
    if "setExact(" in text or "setExactAndAllowWhileIdle" in text: fail("Azkar scheduler must remain inexact; exact access is reserved for prayer-time Adhan")
    if "PendingIntent.getBroadcast" not in text or "AzkarReminderReceiver.class" not in text: fail("background reminder must target a broadcast receiver independent of the TWA UI")

activity=JAVA/"AzkarReminderActivity.java"
if activity.is_file():
    text=activity.read_text(encoding="utf-8")
    for required in ("POST_NOTIFICATIONS","requestPermissions","continueActivation","AzkarReminderScheduler.start","AzkarReminderScheduler.stop","isExpectedBridgeUri",'"qiblaastro".equals(data.getScheme())','"azkar-reminder".equals(data.getHost())',"ACTION_APP_NOTIFICATION_SETTINGS","ACTION_CHANNEL_NOTIFICATION_SETTINGS","restartIntoAuthenticatedLauncher","R.string.azkar_permission_required"):
        if required not in text: fail(f"activity contract missing: {required}")
    if "AlertDialog.Builder" in text: fail("obsolete second confirmation dialog must not return; the visible toggle is the user action")
    if 'getQueryParameter("text")' in text: fail("activity must not trust arbitrary incoming display text")

receiver=JAVA/"AzkarReminderReceiver.java"
if receiver.is_file():
    text=receiver.read_text(encoding="utf-8")
    for required in ("NotificationChannel","channelIssue","_v2","/raw/","scheduleNextFromDelivery","R.string.azkar_channel_name","R.string.azkar_notification_title","getLaunchIntentForPackage"):
        if required not in text: fail(f"receiver contract missing: {required}")
    if '"android.resource://" + context.getPackageName() + "/" + rawId' in text: fail("notification channel must not persist a numeric Android resource-ID URI")
    for hardcoded in ('"تنبيهات الأذكار"','"QiblaAstro — تذكير بالذكر"'):
        if hardcoded in text: fail("native notification UI must use Android resources, not hard-coded Arabic")

boot=JAVA/"AzkarBootReceiver.java"
if boot.is_file():
    text=boot.read_text(encoding="utf-8")
    for required in ("restartAfterBoot","restore(context)"):
        if required not in text: fail(f"boot/update restoration missing: {required}")

print("QiblaAstro — Native Azkar Reminder Gate")
print("="*45)
if errors:
    for error in errors: print("ERROR:",error,file=sys.stderr)
    raise SystemExit(1)
print("PASS: AR/EN/FR/ID/UR resources generated and referenced by native notification UI")
print("PASS: authenticated start/stop handoff + Android notification/channel recovery contract")
print("PASS: 15-minute minimum + inexact idle-safe local scheduling + reboot/update restoration")
print("PASS: v2 phrase channels use stable named raw-resource paths and exact alarms remain unused by Azkar")
