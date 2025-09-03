package com.flowpay.upi.offline

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register custom plugins
        registerPlugin(com.flowpay.upi.offline.plugins.ussd.USSDPlugin::class.java)
        registerPlugin(com.flowpay.upi.offline.plugins.secureui.SecureUiPlugin::class.java)
        registerPlugin(com.flowpay.upi.offline.plugins.sms.SMSPlugin::class.java)
    }
}