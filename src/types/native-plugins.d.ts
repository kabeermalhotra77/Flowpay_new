declare module '@capacitor/core' {
  interface PluginRegistry {
    USSDPlugin: USSDPlugin;
    SMSPlugin: SMSPlugin;
    SecureUiPlugin: SecureUiPlugin;
  }
}

interface USSDPlugin {
  dialUSSD(options: { code: string; simSlot?: number }): Promise<{ success: boolean; message: string }>;
  constructUSSDCode(options: { vpa: string; amount: string }): Promise<{ ussdCode: string; message: string }>;
  getDualSimInfo(): Promise<{ hasDualSim: boolean; simCount: number; simInfo: any[] }>;
  isUSSDSupported(): Promise<{ supported: boolean; hasPhonePermission: boolean; hasPhoneStatePermission: boolean }>;
  requestPermissions(): Promise<{ granted: boolean }>;
}

interface SMSPlugin {
  startSMSListener(): Promise<{ success: boolean; message: string }>;
  stopSMSListener(): Promise<{ success: boolean; message: string }>;
  isSMSListenerActive(): Promise<{ active: boolean }>;
  isSMSSupported(): Promise<{ supported: boolean; hasReceivePermission: boolean; hasReadPermission: boolean }>;
  requestPermissions(): Promise<{ granted: boolean }>;
}

interface SecureUiPlugin {
  enableSecureMode(): Promise<void>;
  disableSecureMode(): Promise<void>;
  setSecureForPin(options: { enabled: boolean }): Promise<void>;
}