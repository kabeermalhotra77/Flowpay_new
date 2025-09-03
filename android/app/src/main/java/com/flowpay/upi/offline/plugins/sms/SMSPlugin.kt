package com.flowpay.upi.offline.plugins.sms

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "SMSPlugin",
    permissions = [
        Permission(strings = [Manifest.permission.RECEIVE_SMS], alias = "sms"),
        Permission(strings = [Manifest.permission.READ_SMS], alias = "readSms")
    ]
)
class SMSPlugin : Plugin() {

    companion object {
        private var isListening = false
    }

    @PluginMethod
    fun isSMSSupported(call: PluginCall) {
        val hasReceivePermission = hasPermission(Manifest.permission.RECEIVE_SMS)
        val hasReadPermission = hasPermission(Manifest.permission.READ_SMS)
        
        call.resolve(mapOf(
            "supported" to (hasReceivePermission && hasReadPermission),
            "hasReceivePermission" to hasReceivePermission,
            "hasReadPermission" to hasReadPermission
        ))
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (hasAllPermissions()) {
            call.resolve(mapOf("granted" to true))
        } else {
            requestPermissionForAlias("sms", call, "permissionCallback")
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val granted = hasAllPermissions()
        call.resolve(mapOf("granted" to granted))
    }

    @PluginMethod
    fun startSMSListener(call: PluginCall) {
        if (!hasAllPermissions()) {
            call.reject("SMS permissions not granted")
            return
        }

        try {
            // Set bridge for SMS receiver
            PaymentSMSReceiver.setBridge(bridge)
            isListening = true
            
            call.resolve(mapOf(
                "success" to true,
                "message" to "SMS listener started successfully"
            ))
        } catch (e: Exception) {
            call.reject("Failed to start SMS listener: ${e.message}")
        }
    }

    @PluginMethod
    fun stopSMSListener(call: PluginCall) {
        try {
            PaymentSMSReceiver.setBridge(null)
            isListening = false
            
            call.resolve(mapOf(
                "success" to true,
                "message" to "SMS listener stopped successfully"
            ))
        } catch (e: Exception) {
            call.reject("Failed to stop SMS listener: ${e.message}")
        }
    }

    @PluginMethod
    fun isSMSListenerActive(call: PluginCall) {
        call.resolve(mapOf(
            "active" to isListening
        ))
    }

    private fun hasAllPermissions(): Boolean {
        return hasPermission(Manifest.permission.RECEIVE_SMS) && 
               hasPermission(Manifest.permission.READ_SMS)
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
}
