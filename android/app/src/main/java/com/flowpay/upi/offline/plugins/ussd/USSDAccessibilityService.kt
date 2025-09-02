package com.flowpay.upi.offline.plugins.ussd

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log
import android.os.Handler
import android.os.Looper

class USSDAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "USSDAccessibilityService"
        private var instance: USSDAccessibilityService? = null
        
        fun getInstance(): USSDAccessibilityService? = instance
    }

    private val handler = Handler(Looper.getMainLooper())

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED
            
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            
            packageNames = arrayOf(
                "com.android.phone",
                "com.samsung.android.dialer",
                "com.miui.securitycenter",
                "com.huawei.android.dialer"
            )
        }
        
        serviceInfo = info
        Log.d(TAG, "USSDAccessibilityService connected and configured")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        try {
            when (event.eventType) {
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                    handleUSSDDialog(event)
                }
                AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                    handleTextChange(event)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling accessibility event", e)
        }
    }

    private fun handleUSSDDialog(event: AccessibilityEvent) {
        val rootNode = rootInActiveWindow ?: return
        
        // Look for USSD dialog patterns
        val ussdTexts = findUSSDContent(rootNode)
        if (ussdTexts.isNotEmpty()) {
            Log.d(TAG, "USSD Dialog detected: $ussdTexts")
            
            // Check if this is a payment-related USSD
            val isPaymentUSSD = ussdTexts.any { text ->
                text.contains("money", ignoreCase = true) ||
                text.contains("transfer", ignoreCase = true) ||
                text.contains("pay", ignoreCase = true) ||
                text.contains("amount", ignoreCase = true) ||
                text.contains("UPI", ignoreCase = true)
            }
            
            if (isPaymentUSSD) {
                automateUSSDNavigation(rootNode, ussdTexts)
            }
        }
    }

    private fun findUSSDContent(node: AccessibilityNodeInfo): List<String> {
        val texts = mutableListOf<String>()
        
        if (node.text != null && node.text.isNotEmpty()) {
            texts.add(node.text.toString())
        }
        
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            texts.addAll(findUSSDContent(child))
            child.recycle()
        }
        
        return texts
    }

    private fun automateUSSDNavigation(rootNode: AccessibilityNodeInfo, ussdTexts: List<String>) {
        // This is a simplified automation logic
        // In production, this would be more sophisticated based on specific bank USSD flows
        
        val allText = ussdTexts.joinToString(" ").toLowerCase()
        
        when {
            allText.contains("select language") -> {
                selectOption(rootNode, "1") // Usually English
            }
            allText.contains("money transfer") || allText.contains("send money") -> {
                selectOption(rootNode, "1") // Usually the first option
            }
            allText.contains("enter mobile number") || allText.contains("enter vpa") -> {
                // This would be handled by the main app, not auto-filled
                Log.d(TAG, "VPA/Mobile input detected - waiting for user input")
            }
            allText.contains("enter amount") -> {
                Log.d(TAG, "Amount input detected - waiting for user input")
            }
            allText.contains("enter pin") || allText.contains("upi pin") -> {
                Log.d(TAG, "PIN input detected - waiting for secure input")
            }
            allText.contains("transaction successful") -> {
                Log.d(TAG, "Transaction completed successfully")
                // Could trigger a callback to the main app here
            }
            allText.contains("transaction failed") -> {
                Log.d(TAG, "Transaction failed")
                // Could trigger an error callback to the main app here
            }
        }
    }

    private fun selectOption(rootNode: AccessibilityNodeInfo, option: String) {
        // Look for input fields or clickable elements with the option
        val inputNodes = findClickableNodes(rootNode)
        
        for (node in inputNodes) {
            if (node.text?.toString() == option || node.contentDescription?.toString() == option) {
                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                Log.d(TAG, "Clicked option: $option")
                break
            }
        }
        
        inputNodes.forEach { it.recycle() }
    }

    private fun findClickableNodes(node: AccessibilityNodeInfo): List<AccessibilityNodeInfo> {
        val clickableNodes = mutableListOf<AccessibilityNodeInfo>()
        
        if (node.isClickable || node.isFocusable) {
            clickableNodes.add(node)
        }
        
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            clickableNodes.addAll(findClickableNodes(child))
        }
        
        return clickableNodes
    }

    private fun handleTextChange(event: AccessibilityEvent) {
        // Monitor text changes in USSD dialogs
        val text = event.text?.toString() ?: return
        Log.d(TAG, "Text changed in USSD: $text")
    }

    override fun onInterrupt() {
        Log.d(TAG, "USSDAccessibilityService interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.d(TAG, "USSDAccessibilityService destroyed")
    }

    // Methods that can be called from the main plugin
    fun isServiceActive(): Boolean = instance != null

    fun performUSSDAction(action: String, data: String? = null): Boolean {
        return try {
            when (action) {
                "navigate_back" -> {
                    performGlobalAction(GLOBAL_ACTION_BACK)
                    true
                }
                "navigate_home" -> {
                    performGlobalAction(GLOBAL_ACTION_HOME)
                    true
                }
                else -> false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error performing USSD action: $action", e)
            false
        }
    }
}