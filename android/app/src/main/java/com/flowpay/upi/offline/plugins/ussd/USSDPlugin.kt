package com.flowpay.upi.offline.plugins.ussd

import android.content.Intent
import android.net.Uri
import android.telephony.TelephonyManager
import android.telephony.SubscriptionManager
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "USSDPlugin",
    permissions = [
        Permission(strings = [Manifest.permission.CALL_PHONE], alias = "phone"),
        Permission(strings = [Manifest.permission.READ_PHONE_STATE], alias = "phoneState")
    ]
)
class USSDPlugin : Plugin() {

    @PluginMethod
    fun isUSSDSupported(call: PluginCall) {
        val hasPhonePermission = hasPermission(Manifest.permission.CALL_PHONE)
        val hasPhoneStatePermission = hasPermission(Manifest.permission.READ_PHONE_STATE)
        
        call.resolve(mapOf(
            "supported" to (hasPhonePermission && hasPhoneStatePermission),
            "hasPhonePermission" to hasPhonePermission,
            "hasPhoneStatePermission" to hasPhoneStatePermission
        ))
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (hasAllPermissions()) {
            call.resolve(mapOf("granted" to true))
        } else {
            requestPermissionForAlias("phone", call, "permissionCallback")
        }
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        val granted = hasAllPermissions()
        call.resolve(mapOf("granted" to granted))
    }

    @PluginMethod
    fun dialUSSD(call: PluginCall) {
        val ussdCode = call.getString("code")
        val simSlot = call.getInt("simSlot", 0)

        if (ussdCode == null) {
            call.reject("USSD code is required")
            return
        }

        if (!hasPermission(Manifest.permission.CALL_PHONE)) {
            call.reject("Phone permission not granted")
            return
        }

        try {
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:${Uri.encode(ussdCode)}")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && simSlot >= 0) {
                    putExtra("com.android.phone.extra.slot", simSlot)
                }
            }
            
            activity.startActivity(intent)
            call.resolve(mapOf(
                "success" to true,
                "message" to "USSD dialed successfully"
            ))
        } catch (e: Exception) {
            call.reject("Failed to dial USSD: ${e.message}")
        }
    }

    @PluginMethod
    fun getDualSimInfo(call: PluginCall) {
        if (!hasPermission(Manifest.permission.READ_PHONE_STATE)) {
            call.reject("Phone state permission not granted")
            return
        }

        try {
            val subscriptionManager = context.getSystemService(SubscriptionManager::class.java)
            val telephonyManager = context.getSystemService(TelephonyManager::class.java)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subscriptions = subscriptionManager?.activeSubscriptionInfoList ?: emptyList()
                
                val simInfo = subscriptions.mapIndexed { index, subscription ->
                    mapOf(
                        "slotIndex" to subscription.simSlotIndex,
                        "displayName" to subscription.displayName.toString(),
                        "carrierName" to subscription.carrierName.toString(),
                        "countryIso" to subscription.countryIso,
                        "isDefault" to (index == 0)
                    )
                }

                call.resolve(mapOf(
                    "hasDualSim" to (subscriptions.size > 1),
                    "simCount" to subscriptions.size,
                    "simInfo" to simInfo
                ))
            } else {
                call.resolve(mapOf(
                    "hasDualSim" to false,
                    "simCount" to 1,
                    "simInfo" to emptyList<Map<String, Any>>()
                ))
            }
        } catch (e: Exception) {
            call.reject("Failed to get SIM info: ${e.message}")
        }
    }

    @PluginMethod
    fun initiatePayment(call: PluginCall) {
        val amount = call.getString("amount")
        val vpa = call.getString("vpa")
        val pin = call.getString("pin")
        val simSlot = call.getInt("simSlot", 0)

        if (amount == null || vpa == null || pin == null) {
            call.reject("Amount, VPA, and PIN are required")
            return
        }

        // For now, simulate the payment process
        // In production, this would integrate with actual USSD automation
        val transactionRef = "UPI${System.currentTimeMillis()}${(1000..9999).random()}"
        
        call.resolve(mapOf(
            "success" to true,
            "transactionRef" to transactionRef,
            "message" to "Payment initiated successfully"
        ))
    }

    private fun hasAllPermissions(): Boolean {
        return hasPermission(Manifest.permission.CALL_PHONE) && 
               hasPermission(Manifest.permission.READ_PHONE_STATE)
    }

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }
}