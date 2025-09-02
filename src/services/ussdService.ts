import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PaymentDetails, BankDetails, USSDResponse } from '../types/payment';
import { FLAGS } from '../constants/flags';
import { NativeUSSDService } from './nativeUSSDService';

export class USSDService {
  private static currentStep = 0;
  private static paymentData: PaymentDetails | null = null;
  private static selectedBank: BankDetails | null = null;

  static async initiatePayment(
    payment: PaymentDetails, 
    bank: BankDetails, 
    upiPin: string
  ): Promise<boolean> {
    try {
      // Use native service if available and not in simulation mode
      if (!FLAGS.USSD_SIMULATED) {
        return await NativeUSSDService.initiatePayment(payment, bank, upiPin);
      }

      // Fallback to simulation
      this.paymentData = payment;
      this.selectedBank = bank;
      this.currentStep = 0;

      // Simulate USSD automation steps
      await this.simulateUSSDFlow(payment, bank, upiPin);
      
      return true;
    } catch (error) {
      console.error('USSD Payment error:', error);
      return false;
    }
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
      
      // Simulate progress callback
      if (this.onProgress) {
        this.onProgress({
          step: i + 1,
          message: steps[i].message,
          success: i === steps.length - 1,
          data: i === steps.length - 1 ? { 
            transactionRef: this.generateTransactionRef() 
          } : undefined
        });
      }
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

  static reset(): void {
    this.currentStep = 0;
    this.paymentData = null;
    this.selectedBank = null;
    this.onProgress = null;
  }

  // Check if device supports USSD (simulation)
  static async isUSSDSupported(): Promise<boolean> {
    const info = await Device.getInfo();
    return info.platform === 'android'; // Real implementation would check more
  }

  // Encrypt PIN for storage (simplified)
  static encryptPin(pin: string): string {
    // In production, use proper encryption
    return btoa(pin + 'FLOWPAY_SALT');
  }

  static decryptPin(encryptedPin: string): string {
    // In production, use proper decryption
    try {
      return atob(encryptedPin).replace('FLOWPAY_SALT', '');
    } catch {
      return '';
    }
  }
}