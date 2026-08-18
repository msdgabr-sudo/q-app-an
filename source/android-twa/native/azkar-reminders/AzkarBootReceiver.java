package com.qiblalabs.azkar;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class AzkarBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!AzkarReminderScheduler.isEnabled(context)) return;
        String action = intent == null ? "" : intent.getAction();
        boolean restored;
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            restored = AzkarReminderScheduler.restartAfterBoot(context);
        } else {
            restored = AzkarReminderScheduler.restore(context);
        }
        if (!restored) AzkarReminderScheduler.pauseForIssue(context, "scheduler-error");
    }
}
