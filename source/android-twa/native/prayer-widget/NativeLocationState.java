package com.qiblalabs.nativebridge;

import android.content.Context;
import android.location.LocationManager;
import android.os.Build;

/** Reads only whether Android's system Location service is enabled. */
final class NativeLocationState {
    static boolean isEnabled(Context context) {
        if (context == null) return false;
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return manager.isLocationEnabled();
            }
            return manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private NativeLocationState() {}
}
