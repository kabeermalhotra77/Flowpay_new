# Phase 0 — Groundwork & Hygiene (Locked)

- Toolchain: AGP 8.3.x / Gradle 8.4, compile/target 34, min 24, Jetifier OFF.
- Manifest: CALL_PHONE, CAMERA, FileProvider, exported launcher.
- R8: keeps for Capacitor/plugins, strips android.util.Log.
- Security: FLAG_SECURE toggled via SecureUi plugin for PIN screens.
- Config: .env.example with USSD_SIMULATED, PIN_SECURE_UI_V2, LOG_LEVEL; typed banks/flags.
- DoD: Signed debug build installs; permissions prompt correctly; no sensitive logs in release.

**Run assertions:**

```bash
npm run verify:phase0
```
