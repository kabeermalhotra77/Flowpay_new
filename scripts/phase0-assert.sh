#!/usr/bin/env bash
set -euo pipefail
RED='\033[0;31m'; GRN='\033[0;32m'; NC='\033[0m'
pass(){ echo -e "${GRN}✔ $*${NC}"; }
fail(){ echo -e "${RED}✘ $*${NC}"; exit 1; }

# ----- 1) Toolchain pins -----
grep -q 'compileSdkVersion = 34' android/variables.gradle || fail "compileSdkVersion != 34"
grep -q 'targetSdkVersion = 34'  android/variables.gradle || fail "targetSdkVersion != 34"
grep -q 'minSdkVersion = 24'     android/variables.gradle || fail "minSdkVersion != 24"
grep -q 'android.enableJetifier=false' android/gradle.properties || fail "Jetifier not disabled"
grep -q "com.android.tools.build:gradle:8.3" android/build.gradle || fail "AGP not 8.3.x"
grep -q 'gradle-8.4' android/gradle/wrapper/gradle-wrapper.properties || fail "Gradle wrapper not 8.4"
pass "Toolchain pinned (API 34/24, Jetifier off, AGP/Gradle ok)."

# ----- 2) Manifest -----
grep -q 'android.permission.CALL_PHONE' android/app/src/main/AndroidManifest.xml || fail "CALL_PHONE missing"
grep -q 'android.permission.CAMERA'     android/app/src/main/AndroidManifest.xml || fail "CAMERA missing"
grep -q 'androidx.core.content.FileProvider' android/app/src/main/AndroidManifest.xml || fail "FileProvider missing"
grep -q 'android:exported="true"' android/app/src/main/AndroidManifest.xml || fail "exported=true missing on launcher"
[ -f android/app/src/main/res/xml/file_paths.xml ] || fail "file_paths.xml missing"
pass "Manifest permissions/provider/exported ok."

# ----- 3) R8/ProGuard -----
grep -q 'assumenosideeffects class android.util.Log' android/app/proguard-rules.pro || fail "Log strip rule missing"
grep -q 'com.getcapacitor' android/app/proguard-rules.pro || fail "Capacitor keep rule missing"
grep -q 'com.flowpay.upi.offline.plugins' android/app/proguard-rules.pro || fail "App plugin keep rule missing"
pass "R8 rules present (keeps + log strip)."

# ----- 4) FLAG_SECURE plugin -----
[ -f android/app/src/main/java/com/flowpay/upi/offline/plugins/secureui/SecureUiPlugin.kt ] || fail "SecureUiPlugin.kt missing"
grep -q '@CapacitorPlugin(name = "SecureUi")' android/app/src/main/java/com/flowpay/upi/offline/plugins/secureui/SecureUiPlugin.kt || fail "SecureUi annotation missing"
pass "SecureUi plugin present."

# ----- 5) Constants & flags -----
grep -q 'VITE_USSD_SIMULATED'  src/constants/flags.ts || fail "VITE_USSD_SIMULATED missing"
grep -q 'VITE_PIN_SECURE_UI_V2' src/constants/flags.ts || fail "VITE_PIN_SECURE_UI_V2 missing"
grep -q 'VITE_LOG_LEVEL'        src/constants/flags.ts || fail "VITE_LOG_LEVEL missing"
grep -q 'export const FLAGS' src/constants/flags.ts || fail "FLAGS export missing"
grep -q 'export const BANKS' src/constants/banks.ts || fail "BANKS export missing"
pass "Env & constants ok."

# ----- 6) Optional: device checks (non-fatal) -----
if command -v adb >/dev/null 2>&1 && adb devices | grep -qE '\tdevice$'; then
  PKG="com.flowpay.upi.offline"
  adb shell pm list packages | grep -q "$PKG" && pass "Device: $PKG installed." || echo "NOTE: $PKG not installed."
  adb shell dumpsys package $PKG | grep -q 'android.permission.CALL_PHONE' && pass "CALL_PHONE present on device." || echo "NOTE: CALL_PHONE not found on device."
  adb shell dumpsys package $PKG | grep -q 'android.permission.CAMERA' && pass "CAMERA present on device." || echo "NOTE: CAMERA not found on device."
else
  echo "NOTE: No adb device; skipping runtime checks."
fi

pass "All Phase 0 assertions passed."
