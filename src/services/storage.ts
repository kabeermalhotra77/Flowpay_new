import { Preferences } from '@capacitor/preferences';
import { UserProfile, PaymentDetails } from '../types/payment';

export class StorageService {
  private static readonly USER_PROFILE_KEY = 'user_profile';
  private static readonly PAYMENT_HISTORY_KEY = 'payment_history';
  private static readonly UPI_PIN_KEY = 'upi_pin_encrypted';

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    await Preferences.set({
      key: this.USER_PROFILE_KEY,
      value: JSON.stringify(profile)
    });
  }

  static async getUserProfile(): Promise<UserProfile | null> {
    const { value } = await Preferences.get({ key: this.USER_PROFILE_KEY });
    return value ? JSON.parse(value) : null;
  }

  static async savePaymentHistory(payments: PaymentDetails[]): Promise<void> {
    await Preferences.set({
      key: this.PAYMENT_HISTORY_KEY,
      value: JSON.stringify(payments)
    });
  }

  static async getPaymentHistory(): Promise<PaymentDetails[]> {
    const { value } = await Preferences.get({ key: this.PAYMENT_HISTORY_KEY });
    return value ? JSON.parse(value) : [];
  }

  static async addPayment(payment: PaymentDetails): Promise<void> {
    const history = await this.getPaymentHistory();
    history.unshift(payment); // Add to beginning
    
    // Keep only last 50 transactions
    if (history.length > 50) {
      history.splice(50);
    }
    
    await this.savePaymentHistory(history);
  }

  static async updatePaymentStatus(
    paymentId: string, 
    status: PaymentDetails['status'],
    transactionRef?: string
  ): Promise<void> {
    const history = await this.getPaymentHistory();
    const payment = history.find(p => p.id === paymentId);
    
    if (payment) {
      payment.status = status;
      if (transactionRef) {
        payment.transactionRef = transactionRef;
      }
      await this.savePaymentHistory(history);
    }
  }

  static async clearAllData(): Promise<void> {
    await Preferences.clear();
  }
}
