package com.flowpay.upi.offline.plugins.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log
import com.getcapacitor.Bridge
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginResult
import org.json.JSONObject

class PaymentSMSReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "PaymentSMSReceiver"
        private var bridge: Bridge? = null
        
        fun setBridge(bridge: Bridge?) {
            this.bridge = bridge
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            
            for (message in messages) {
                val messageBody = message.messageBody
                val sender = message.originatingAddress
                
                Log.d(TAG, "Received SMS from: $sender")
                Log.d(TAG, "SMS Body: $messageBody")
                
                // Check if this is a payment-related SMS
                if (isPaymentSMS(messageBody)) {
                    Log.d(TAG, "Payment SMS detected, processing...")
                    processPaymentSMS(context, messageBody, sender)
                }
            }
        }
    }

    private fun isPaymentSMS(message: String): Boolean {
        val lowerMessage = message.lowercase()
        return lowerMessage.contains("upi") || 
               lowerMessage.contains("transaction") ||
               lowerMessage.contains("payment") ||
               lowerMessage.contains("transfer") ||
               lowerMessage.contains("money")
    }

    private fun processPaymentSMS(context: Context, message: String, sender: String?) {
        try {
            val result = parsePaymentSMS(message)
            
            if (result != null) {
                Log.d(TAG, "Payment SMS parsed successfully: $result")
                
                // Send result to React Native via bridge
                bridge?.let { bridge ->
                    val pluginResult = PluginResult().apply {
                        put("action", "paymentSMSReceived")
                        put("data", result)
                    }
                    
                    // Send to SMSPlugin
                    bridge.triggerWindowJSEvent("paymentSMSReceived", pluginResult.data.toString())
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing payment SMS", e)
        }
    }

    private fun parsePaymentSMS(message: String): JSONObject? {
        try {
            val lowerMessage = message.lowercase()
            
            // Check if this is a payment-related SMS
            val isPaymentSMS = lowerMessage.contains("upi") || 
                              lowerMessage.contains("transaction") ||
                              lowerMessage.contains("payment") ||
                              lowerMessage.contains("transfer")

            if (!isPaymentSMS) {
                return null
            }

            // Parse success/failure
            val isSuccess = Regex("(?:txn|transaction).*(?:successful|completed|success)", RegexOption.IGNORE_CASE).containsMatchIn(message)
            val isFailure = Regex("(?:txn|transaction).*(?:failed|declined|reversed|timeout)", RegexOption.IGNORE_CASE).containsMatchIn(message)

            if (!isSuccess && !isFailure) {
                return null
            }

            // Extract amount
            val amountMatch = Regex("(?:₹|INR\\s?)\\s?(\\d+(?:\\.\\d{1,2})?)").find(message)
            val amount = amountMatch?.groupValues?.get(1)?.toDoubleOrNull()

            // Extract UPI reference
            val refMatch = Regex("(?:UPI\\s*(?:Ref|Ref\\.?|Reference|Txn|Txn\\.?)\\s*(?:No\\.?|ID|#)?\\s*|UTR\\s*(?:No\\.?)?\\s*)([A-Z0-9]{10,18})", RegexOption.IGNORE_CASE).find(message)
            val transactionRef = refMatch?.groupValues?.get(1)

            // Extract VPA
            val vpaMatch = Regex("([a-z0-9._-]+@[a-z][a-z0-9.-]+)", RegexOption.IGNORE_CASE).find(message)
            val vpa = vpaMatch?.groupValues?.get(1)

            return JSONObject().apply {
                put("success", isSuccess)
                put("message", message)
                put("timestamp", System.currentTimeMillis())
                
                if (transactionRef != null) {
                    put("transactionRef", transactionRef)
                }
                if (amount != null) {
                    put("amount", amount)
                }
                if (vpa != null) {
                    put("vpa", vpa)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing payment SMS", e)
            return null
        }
    }
}
