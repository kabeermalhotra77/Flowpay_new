package com.flowpay.upi.offline.plugins.ussd

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log
import org.json.JSONObject

class USSDAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "USSDAccessibilityService"
        var isRunning = false
        var callback: ((String) -> Unit)? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        Log.d(TAG, "USSD Accessibility Service connected")
        
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or 
                        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            packageNames = arrayOf("com.android.phone")
        }
        
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                handleUSSDDialog(event)
            }
        }
    }

    private fun handleUSSDDialog(event: AccessibilityEvent) {
        val source = event.source ?: return
        
        try {
            // Look for USSD dialog content
            val dialogText = extractDialogText(source)
            if (dialogText.isNotEmpty() && isUSSDDialog(dialogText)) {
                Log.d(TAG, "USSD dialog detected: $dialogText")
                
                // Process USSD response
                processUSSDResponse(dialogText, source)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling USSD dialog", e)
        } finally {
            source.recycle()
        }
    }

    private fun extractDialogText(node: AccessibilityNodeInfo): String {
        val text = StringBuilder()
        
        fun traverse(node: AccessibilityNodeInfo) {
            node.text?.let { text.append(it).append(" ") }
            
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { child ->
                    traverse(child)
                    child.recycle()
                }
            }
        }
        
        traverse(node)
        return text.toString().trim()
    }

    private fun isUSSDDialog(text: String): Boolean {
        val ussdKeywords = listOf(
            "USSD", "UPI", "Money Transfer", "Enter Amount", 
            "Enter PIN", "Transaction", "Confirm", "Cancel"
        )
        
        return ussdKeywords.any { keyword ->
            text.contains(keyword, ignoreCase = true)
        }
    }

    private fun processUSSDResponse(text: String, source: AccessibilityNodeInfo) {
        // Parse USSD menu structure
        when {
            text.contains("Money Transfer", ignoreCase = true) -> {
                selectOption(source, "3") // Typically option 3 for money transfer
            }
            text.contains("Enter VPA", ignoreCase = true) -> {
                // VPA will be entered by user action
                notifyCallback("VPA_INPUT_REQUIRED")
            }
            text.contains("Enter Amount", ignoreCase = true) -> {
                notifyCallback("AMOUNT_INPUT_REQUIRED")
            }
            text.contains("Enter PIN", ignoreCase = true) -> {
                notifyCallback("PIN_INPUT_REQUIRED")
            }
            text.contains("successful", ignoreCase = true) -> {
                notifyCallback("TRANSACTION_SUCCESS")
            }
            text.contains("failed", ignoreCase = true) -> {
                notifyCallback("TRANSACTION_FAILED")
            }
        }
    }

    private fun selectOption(source: AccessibilityNodeInfo, option: String) {
        // Find and click the option button
        findClickableNodeWithText(source, option)?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }

    private fun findClickableNodeWithText(node: AccessibilityNodeInfo, text: String): AccessibilityNodeInfo? {
        if (node.isClickable && node.text?.contains(text) == true) {
            return node
        }
        
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { child ->
                val result = findClickableNodeWithText(child, text)
                child.recycle()
                if (result != null) return result
            }
        }
        
        return null
    }

    private fun notifyCallback(message: String) {
        callback?.invoke(message)
        
        // Also broadcast to the app
        val intent = Intent("com.flowpay.upi.offline.USSD_RESPONSE").apply {
            putExtra("message", message)
            putExtra("timestamp", System.currentTimeMillis())
        }
        sendBroadcast(intent)
    }

    override fun onInterrupt() {
        isRunning = false
        Log.d(TAG, "USSD Accessibility Service interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        callback = null
        Log.d(TAG, "USSD Accessibility Service destroyed")
    }
}