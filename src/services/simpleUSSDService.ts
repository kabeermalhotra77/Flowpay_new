import { PaymentDetails, BankDetails } from '../types/payment';
import { NativeUSSDService } from './nativeUSSDService';

export interface PaymentResult {
  success: boolean;
  transactionRef?: string;
  amount?: number;
  vpa?: string;
  message: string;
  timestamp: Date;
}

export class SimpleUSSDService {
  private static smsListenerActive = false;
  private static currentPayment: PaymentDetails | null = null;
  private static paymentCallback: ((result: PaymentResult) => void) | null = null;
  private static timeoutId: NodeJS.Timeout | null = null;

  /**
   * Initiate a simple USSD payment
   * Format: *99*1*3*<VPA>*<AMT>*1#
   */
  static async initiatePayment(
    paymentData: PaymentDetails,
    bank: BankDetails
  ): Promise<boolean> {
    try {
      this.currentPayment = paymentData;
      
      // Construct USSD code: *99*1*3*<VPA>*<AMT>*1#
      const ussdCode = `*99*1*3*${paymentData.vpa}*${paymentData.amount}*1#`;
      
      console.log('Dialing USSD:', ussdCode);
      
      // Start SMS listener for payment confirmation
      await this.startSMSListener();
      
      // Dial the USSD code
      const success = await NativeUSSDService.dialUSSD(ussdCode);
      
      if (success) {
        // Set timeout for payment (60 seconds)
        this.setPaymentTimeout();
        return true;
      } else {
        this.stopSMSListener();
        return false;
      }
    } catch (error) {
      console.error('Failed to initiate USSD payment:', error);
      this.stopSMSListener();
      return false;
    }
  }

  /**
   * Start listening for SMS messages
   */
  private static async startSMSListener(): Promise<void> {
    try {
      // Start SMS listener via native plugin
      await NativeUSSDService.startSMSListener();
      this.smsListenerActive = true;
      console.log('SMS listener started');
    } catch (error) {
      console.error('Failed to start SMS listener:', error);
    }
  }

  /**
   * Stop SMS listener
   */
  private static stopSMSListener(): void {
    this.smsListenerActive = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    console.log('SMS listener stopped');
  }

  /**
   * Set payment timeout (60 seconds)
   */
  private static setPaymentTimeout(): void {
    this.timeoutId = setTimeout(() => {
      this.handlePaymentTimeout();
    }, 60000); // 60 seconds
  }

  /**
   * Handle payment timeout
   */
  private static handlePaymentTimeout(): void {
    console.log('Payment timeout - no SMS received');
    this.stopSMSListener();
    
    if (this.paymentCallback && this.currentPayment) {
      this.paymentCallback({
        success: false,
        message: 'Payment timeout - no confirmation received',
        timestamp: new Date()
      });
    }
  }

  /**
   * Process incoming SMS for payment confirmation
   */
  static processPaymentSMS(smsMessage: string): PaymentResult | null {
    if (!this.smsListenerActive || !this.currentPayment) {
      return null;
    }

    const result = this.parsePaymentSMS(smsMessage);
    if (result) {
      this.stopSMSListener();
      this.currentPayment = null;
      
      if (this.paymentCallback) {
        this.paymentCallback(result);
      }
    }

    return result;
  }

  /**
   * Parse SMS message for payment results
   */
  private static parsePaymentSMS(message: string): PaymentResult | null {
    const lowerMessage = message.toLowerCase();
    
    // Check if this is a payment-related SMS
    const isPaymentSMS = lowerMessage.includes('upi') || 
                        lowerMessage.includes('transaction') ||
                        lowerMessage.includes('payment') ||
                        lowerMessage.includes('transfer');

    if (!isPaymentSMS) {
      return null;
    }

    // Parse success/failure
    const isSuccess = /(?:txn|transaction).*(?:successful|completed|success)/i.test(message);
    const isFailure = /(?:txn|transaction).*(?:failed|declined|reversed|timeout)/i.test(message);

    if (!isSuccess && !isFailure) {
      return null;
    }

    // Extract amount
    const amountMatch = message.match(/(?:₹|INR\s?)\s?(\d+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

    // Extract UPI reference
    const refMatch = message.match(/(?:UPI\s*(?:Ref|Ref\.?|Reference|Txn|Txn\.?)\s*(?:No\.?|ID|#)?\s*|UTR\s*(?:No\.?)?\s*)([A-Z0-9]{10,18})/i);
    const transactionRef = refMatch ? refMatch[1] : undefined;

    // Extract VPA
    const vpaMatch = message.match(/([a-z0-9._-]+@[a-z][a-z0-9.-]+)/i);
    const vpa = vpaMatch ? vpaMatch[1] : undefined;

    return {
      success: isSuccess,
      transactionRef,
      amount,
      vpa,
      message: isSuccess ? 'Payment successful' : 'Payment failed',
      timestamp: new Date()
    };
  }

  /**
   * Set callback for payment results
   */
  static setPaymentCallback(callback: (result: PaymentResult) => void): void {
    this.paymentCallback = callback;
  }

  /**
   * Clear payment callback
   */
  static clearPaymentCallback(): void {
    this.paymentCallback = null;
  }

  /**
   * Check if SMS listener is active
   */
  static isSMSListenerActive(): boolean {
    return this.smsListenerActive;
  }

  /**
   * Get current payment data
   */
  static getCurrentPayment(): PaymentDetails | null {
    return this.currentPayment;
  }

  /**
   * Reset service state
   */
  static reset(): void {
    this.stopSMSListener();
    this.currentPayment = null;
    this.paymentCallback = null;
  }
}
