package com.qiblalabs.nativebridge;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;

/** Reads Android's foreground precise-location grant and system Location service state. */
final class NativeLocationState {
    static boolean hasPrecisePermission(Context context) {
        return context != null
                && context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

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

    static boolean isReady(Context context) {
        return hasPrecisePermission(context) && isEnabled(context);
    }

    private NativeLocationState() {}
}
