package com.flowpay.upi.offline.plugins.ussd

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.telecom.TelecomManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(
    name = "USSDPlugin",
    permissions = [
        Permission(
            strings = [Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE],
            alias = "phone"
        )
    ]
)
class USSDPlugin : Plugin() {

    @PluginMethod
    fun dialUSSD(call: PluginCall) {
        if (!hasPhonePermission()) {
            requestPermissionForAlias("phone", call, "phonePermissionCallback")
            return
        }

        val ussdCode = call.getString("ussdCode")
        val simSlot = call.getInt("simSlot", 0)

        if (ussdCode == null) {
            call.reject("USSD code is required")
            return
        }

        try {
            val encodedCode = Uri.encode(ussdCode)
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$encodedCode")
                if (simSlot != null && simSlot > 0) {
                    // Handle dual SIM if needed
                    putExtra("com.android.phone.extra.slot", simSlot)
                }
            }

            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
                call.resolve()
            } else {
                call.reject("No app can handle USSD dialing")
            }
        } catch (e: Exception) {
            call.reject("Failed to dial USSD: ${e.message}")
        }
    }

    @PluginMethod
    fun getDualSimInfo(call: PluginCall) {
        if (!hasPhonePermission()) {
            requestPermissionForAlias("phone", call, "phonePermissionCallback")
            return
        }

        try {
            val subscriptionManager = context.getSystemService(SubscriptionManager::class.java)
            val telephonyManager = context.getSystemService(TelephonyManager::class.java)
            
            val simInfo = JSONArray()
            
            if (ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                val subscriptions = subscriptionManager?.activeSubscriptionInfoList
                
                subscriptions?.forEachIndexed { index, subInfo ->
                    val simData = JSONObject().apply {
                        put("slotIndex", subInfo.simSlotIndex)
                        put("carrierName", subInfo.carrierName.toString())
                        put("displayName", subInfo.displayName.toString())
                        put("subscriptionId", subInfo.subscriptionId)
                        put("isDefault", subInfo.simSlotIndex == 0)
                    }
                    simInfo.put(simData)
                }
            }

            val result = JSONObject().apply {
                put("isDualSim", simInfo.length() > 1)
                put("simCount", simInfo.length())
                put("simInfo", simInfo)
            }

            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to get SIM info: ${e.message}")
        }
    }

    @PluginMethod
    fun selectSIM(call: PluginCall) {
        val simSlot = call.getInt("simSlot")
        if (simSlot == null) {
            call.reject("SIM slot is required")
            return
        }

        // Store selected SIM preference
        val prefs = context.getSharedPreferences("flowpay_prefs", 0)
        prefs.edit().putInt("selected_sim_slot", simSlot).apply()

        call.resolve()
    }

    @PluginMethod
    fun isUSSDSupported(call: PluginCall) {
        val telephonyManager = context.getSystemService(TelephonyManager::class.java)
        val isSupported = telephonyManager?.phoneType != TelephonyManager.PHONE_TYPE_NONE
        
        val result = JSONObject().apply {
            put("supported", isSupported)
            put("phoneType", telephonyManager?.phoneType ?: 0)
        }
        
        call.resolve(result)
    }

    @PermissionCallback
    private fun phonePermissionCallback(call: PluginCall) {
        if (hasPhonePermission()) {
            // Retry the original call
            when (call.methodName) {
                "dialUSSD" -> dialUSSD(call)
                "getDualSimInfo" -> getDualSimInfo(call)
                else -> call.resolve()
            }
        } else {
            call.reject("Phone permission denied")
        }
    }

    private fun hasPhonePermission(): Boolean {
        return ActivityCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED &&
               ActivityCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    }
}