package com.flowpay.upi.offline.plugins.accessibility

import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AccessibilityPlugin")
class AccessibilityPlugin : Plugin() {

    @PluginMethod
    fun isAccessibilityServiceEnabled(call: PluginCall) {
        val serviceName = "com.flowpay.upi.offline/com.flowpay.upi.offline.plugins.ussd.USSDAccessibilityService"
        val enabled = isAccessibilitySettingsOn(serviceName)
        
        call.resolve(mapOf("enabled" to enabled))
    }

    @PluginMethod
    fun openAccessibilitySettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to open accessibility settings: ${e.message}")
        }
    }

    @PluginMethod
    fun requestAccessibilityPermission(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve(mapOf("message" to "Please enable FlowPay accessibility service in the settings"))
        } catch (e: Exception) {
            call.reject("Failed to request accessibility permission: ${e.message}")
        }
    }

    @PluginMethod
    fun getAccessibilityServiceStatus(call: PluginCall) {
        val serviceName = "com.flowpay.upi.offline/com.flowpay.upi.offline.plugins.ussd.USSDAccessibilityService"
        val enabled = isAccessibilitySettingsOn(serviceName)
        
        val result = mapOf(
            "enabled" to enabled,
            "serviceName" to serviceName,
            "message" to if (enabled) "Accessibility service is enabled" else "Accessibility service is disabled"
        )
        
        call.resolve(result)
    }

    private fun isAccessibilitySettingsOn(service: String): Boolean {
        var accessibilityEnabled = 0
        val accessibilityFound = false
        
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                context.contentResolver,
                Settings.Secure.ACCESSIBILITY_ENABLED
            )
        } catch (e: Settings.SettingNotFoundException) {
            // Accessibility setting not found
        }

        val stringColonSplitter = TextUtils.SimpleStringSplitter(':')

        if (accessibilityEnabled == 1) {
            val settingValue = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            
            settingValue?.let {
                stringColonSplitter.setString(it)
                while (stringColonSplitter.hasNext()) {
                    val accessibilityService = stringColonSplitter.next()
                    if (accessibilityService.equals(service, ignoreCase = true)) {
                        return true
                    }
                }
            }
        }

        return false
    }
}