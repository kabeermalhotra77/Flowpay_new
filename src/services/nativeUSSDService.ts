import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PaymentDetails, BankDetails, USSDResponse } from '../types/payment';
import { FLAGS } from '../constants/flags';

// Native plugin interfaces
interface USSDPlugin {
  dialUSSD(options: { ussdCode: string, simSlot?: number }): Promise<void>;
  getDualSimInfo(): Promise<{ isDualSim: boolean, simCount: number, simInfo: any[] }>;
  selectSIM(options: { simSlot: number }): Promise<void>;
  isUSSDSupported(): Promise<{ supported: boolean, phoneType: number }>;
}

interface SecureUiPlugin {
  enableSecureMode(): Promise<void>;
  disableSecureMode(): Promise<void>;
  setSecureForPin(options: { enabled: boolean }): Promise<void>;
}

interface AccessibilityPlugin {
  isAccessibilityServiceEnabled(): Promise<{ enabled: boolean }>;
  openAccessibilitySettings(): Promise<void>;
  requestAccessibilityPermission(): Promise<{ message: string }>;
  getAccessibilityServiceStatus(): Promise<{ enabled: boolean, serviceName: string, message: string }>;
}

// Get native plugins
const USSDPlugin = Capacitor.isNativePlatform() ? 
  (Capacitor as any).Plugins.USSDPlugin as USSDPlugin : null;

const SecureUi = Capacitor.isNativePlatform() ? 
  (Capacitor as any).Plugins.SecureUi as SecureUiPlugin : null;

const AccessibilityPlugin = Capacitor.isNativePlatform() ? 
  (Capacitor as any).Plugins.AccessibilityPlugin as AccessibilityPlugin : null;

export class NativeUSSDService {
  private static currentStep = 0;
  private static paymentData: PaymentDetails | null = null;
  private static selectedBank: BankDetails | null = null;
  private static selectedSimSlot = 0;

  static async initiatePayment(
    payment: PaymentDetails, 
    bank: BankDetails, 
    upiPin: string
  ): Promise<boolean> {
    try {
      this.paymentData = payment;
      this.selectedBank = bank;
      this.currentStep = 0;

      // Enable secure mode for PIN entry
      await this.enableSecureMode();

      if (FLAGS.USSD_SIMULATED || !Capacitor.isNativePlatform()) {
        // Fallback to simulation
        await this.simulateUSSDFlow(payment, bank, upiPin);
      } else {
        // Real native USSD flow
        await this.executeNativeUSSDFlow(payment, bank, upiPin);
      }
      
      return true;
    } catch (error) {
      console.error('Native USSD Payment error:', error);
      await this.disableSecureMode();
      return false;
    }
  }

  private static async executeNativeUSSDFlow(
    payment: PaymentDetails,
    bank: BankDetails,
    pin: string
  ): Promise<void> {
    try {
      // Check USSD support
      if (USSDPlugin) {
        const { supported } = await USSDPlugin.isUSSDSupported();
        if (!supported) {
          throw new Error('USSD not supported on this device');
        }
      }

      // Check accessibility service
      if (AccessibilityPlugin) {
        const { enabled } = await AccessibilityPlugin.isAccessibilityServiceEnabled();
        if (!enabled) {
          this.notifyProgress(1, 'Please enable accessibility service for automated USSD');
          await AccessibilityPlugin.requestAccessibilityPermission();
          throw new Error('Accessibility service required');
        }
      }

      // Get SIM info for dual SIM handling
      let simSlot = 0;
      if (USSDPlugin) {
        const simInfo = await USSDPlugin.getDualSimInfo();
        if (simInfo.isDualSim) {
          // Use stored preference or default to first SIM
          simSlot = this.selectedSimSlot;
        }
      }

      // Start USSD flow
      this.notifyProgress(1, 'Dialing USSD code...');
      
      if (USSDPlugin) {
        await USSDPlugin.dialUSSD({ 
          ussdCode: bank.ussdCode, 
          simSlot: simSlot 
        });
      }

      // Wait for accessibility service to handle automation
      await this.waitForUSSDAutomation(payment, pin);

    } catch (error) {
      console.error('Native USSD flow error:', error);
      this.notifyProgress(10, 'Payment failed: ' + error.message, false);
      throw error;
    }
  }

  private static async waitForUSSDAutomation(
    payment: PaymentDetails,
    pin: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let step = 1;
      const maxSteps = 10;
      
      // Listen for accessibility service responses
      const handleUSSDResponse = (event: any) => {
        const message = event.detail || event.message;
        step++;

        switch (message) {
          case 'VPA_INPUT_REQUIRED':
            this.notifyProgress(step, `Entering VPA: ${payment.vpa}`);
            // VPA would be entered programmatically
            break;
            
          case 'AMOUNT_INPUT_REQUIRED':
            this.notifyProgress(step, `Entering amount: ₹${payment.amount}`);
            break;
            
          case 'PIN_INPUT_REQUIRED':
            this.notifyProgress(step, 'Entering UPI PIN...');
            break;
            
          case 'TRANSACTION_SUCCESS':
            this.notifyProgress(maxSteps, 'Payment completed successfully!', true, {
              transactionRef: this.generateTransactionRef()
            });
            resolve();
            break;
            
          case 'TRANSACTION_FAILED':
            this.notifyProgress(maxSteps, 'Payment failed', false);
            reject(new Error('Transaction failed'));
            break;
            
          default:
            this.notifyProgress(step, message);
        }
      };

      // Set up event listener (implementation depends on how accessibility service communicates)
      document.addEventListener('ussd-response', handleUSSDResponse);

      // Timeout after 60 seconds
      setTimeout(() => {
        document.removeEventListener('ussd-response', handleUSSDResponse);
        reject(new Error('USSD automation timeout'));
      }, 60000);
    });
  }

  private static async simulateUSSDFlow(
    payment: PaymentDetails,
    bank: BankDetails,
    pin: string
  ): Promise<void> {
    const steps = [
      { message: 'Dialing *99#...', delay: 1000 },
      { message: 'Connected to USSD service', delay: 1500 },
      { message: 'Selecting language (English)', delay: 1000 },
      { message: 'Choosing Money Transfer option', delay: 1500 },
      { message: `Entering VPA: ${payment.vpa}`, delay: 2000 },
      { message: `Entering amount: ₹${payment.amount}`, delay: 1500 },
      { message: 'Confirming transaction details', delay: 2000 },
      { message: 'Entering UPI PIN...', delay: 2500 },
      { message: 'Processing payment...', delay: 3000 },
      { message: 'Payment completed successfully!', delay: 1000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      this.currentStep = i + 1;
      
      // Trigger haptic feedback for key steps
      if ([1, 4, 7, 9].includes(i)) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
      
      await new Promise(resolve => setTimeout(resolve, steps[i].delay));
      
      this.notifyProgress(
        i + 1,
        steps[i].message,
        i === steps.length - 1,
        i === steps.length - 1 ? { 
          transactionRef: this.generateTransactionRef() 
        } : undefined
      );
    }
  }

  private static notifyProgress(
    step: number, 
    message: string, 
    success: boolean = false, 
    data?: any
  ): void {
    if (this.onProgress) {
      this.onProgress({
        step,
        message,
        success,
        data
      });
    }
  }

  private static generateTransactionRef(): string {
    return `UPI${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  static onProgress: ((response: USSDResponse) => void) | null = null;

  static setProgressCallback(callback: (response: USSDResponse) => void): void {
    this.onProgress = callback;
  }

  static getCurrentStep(): number {
    return this.currentStep;
  }

  static async reset(): Promise<void> {
    this.currentStep = 0;
    this.paymentData = null;
    this.selectedBank = null;
    this.onProgress = null;
    await this.disableSecureMode();
  }

  // Security methods
  static async enableSecureMode(): Promise<void> {
    if (FLAGS.PIN_SECURE_UI_V2 && SecureUi && Capacitor.isNativePlatform()) {
      try {
        await SecureUi.enableSecureMode();
      } catch (error) {
        console.warn('Failed to enable secure mode:', error);
      }
    }
  }

  static async disableSecureMode(): Promise<void> {
    if (SecureUi && Capacitor.isNativePlatform()) {
      try {
        await SecureUi.disableSecureMode();
      } catch (error) {
        console.warn('Failed to disable secure mode:', error);
      }
    }
  }

  // SIM management
  static async getDualSimInfo(): Promise<any> {
    if (USSDPlugin && Capacitor.isNativePlatform()) {
      return await USSDPlugin.getDualSimInfo();
    }
    return { isDualSim: false, simCount: 1, simInfo: [] };
  }

  static async selectSIM(simSlot: number): Promise<void> {
    this.selectedSimSlot = simSlot;
    if (USSDPlugin && Capacitor.isNativePlatform()) {
      await USSDPlugin.selectSIM({ simSlot });
    }
  }

  // Device capability checks
  static async isUSSDSupported(): Promise<boolean> {
    if (USSDPlugin && Capacitor.isNativePlatform()) {
      const { supported } = await USSDPlugin.isUSSDSupported();
      return supported;
    }
    return false; // Web/simulation mode
  }

  static async isAccessibilityEnabled(): Promise<boolean> {
    if (AccessibilityPlugin && Capacitor.isNativePlatform()) {
      const { enabled } = await AccessibilityPlugin.isAccessibilityServiceEnabled();
      return enabled;
    }
    return false;
  }

  // Legacy methods for compatibility
  static encryptPin(pin: string): string {
    return btoa(pin + 'FLOWPAY_SALT');
  }

  static decryptPin(encryptedPin: string): string {
    try {
      return atob(encryptedPin).replace('FLOWPAY_SALT', '');
    } catch {
      return '';
    }
  }
}