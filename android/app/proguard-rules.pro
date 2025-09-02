# Add project specific ProGuard rules here.

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# Keep FlowPay plugins
-keep class com.flowpay.upi.offline.plugins.** { *; }

# Keep reflection-based code
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Strip debug logs in release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
}

# Keep UPI related classes
-keep class * extends android.telecom.** { *; }
-keep class * extends android.telephony.** { *; }

# Accessibility service
-keep class * extends android.accessibilityservice.AccessibilityService { *; }

# OkHttp/Retrofit (if used later)
-dontwarn okhttp3.**
-dontwarn retrofit2.**