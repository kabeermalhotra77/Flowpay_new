package com.flowpay.upi.offline.plugins.secureui

import android.view.WindowManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SecureUiPlugin")
class SecureUiPlugin : Plugin() {

    @PluginMethod
    fun enableSecureMode(call: PluginCall) {
        try {
            activity.runOnUiThread {
                activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            }
            call.resolve(mapOf(
                "enabled" to true,
                "message" to "Secure mode enabled - screenshots and screen recording blocked"
            ))
        } catch (e: Exception) {
            call.reject("Failed to enable secure mode: ${e.message}")
        }
    }

    @PluginMethod
    fun disableSecureMode(call: PluginCall) {
        try {
            activity.runOnUiThread {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
            call.resolve(mapOf(
                "enabled" to false,
                "message" to "Secure mode disabled"
            ))
        } catch (e: Exception) {
            call.reject("Failed to disable secure mode: ${e.message}")
        }
    }

    @PluginMethod
    fun isSecureModeEnabled(call: PluginCall) {
        try {
            val flags = activity.window.attributes.flags
            val isSecure = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
            
            call.resolve(mapOf(
                "enabled" to isSecure,
                "message" to if (isSecure) "Secure mode is active" else "Secure mode is inactive"
            ))
        } catch (e: Exception) {
            call.reject("Failed to check secure mode status: ${e.message}")
        }
    }

    @PluginMethod
    fun toggleSecureMode(call: PluginCall) {
        try {
            val flags = activity.window.attributes.flags
            val isCurrentlySecure = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
            
            activity.runOnUiThread {
                if (isCurrentlySecure) {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                } else {
                    activity.window.setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    )
                }
            }
            
            call.resolve(mapOf(
                "enabled" to !isCurrentlySecure,
                "message" to if (!isCurrentlySecure) "Secure mode enabled" else "Secure mode disabled"
            ))
        } catch (e: Exception) {
            call.reject("Failed to toggle secure mode: ${e.message}")
        }
    }
}