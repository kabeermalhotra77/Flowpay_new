package com.flowpay.upi.offline.plugins.secureui

import android.app.Activity
import android.view.WindowManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SecureUi")
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
            call.resolve()
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
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to disable secure mode: ${e.message}")
        }
    }

    @PluginMethod
    fun isSecureModeEnabled(call: PluginCall) {
        try {
            val isEnabled = (activity.window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
            call.resolve(mapOf("enabled" to isEnabled))
        } catch (e: Exception) {
            call.reject("Failed to check secure mode status: ${e.message}")
        }
    }

    @PluginMethod
    fun setSecureForPin(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        
        try {
            activity.runOnUiThread {
                if (enabled) {
                    activity.window.setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    )
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to set secure mode for PIN: ${e.message}")
        }
    }
}