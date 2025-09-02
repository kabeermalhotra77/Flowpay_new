export interface BankDetails {
  id: string;
  name: string;
  ussdCode: string;
  upiId: string;
}

export interface PaymentDetails {
  id: string;
  vpa: string;
  amount: number;
  description?: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  bankId: string;
  transactionRef?: string;
}

export interface UserProfile {
  mobileNumber: string;
  selectedBankId: string;
  upiPin?: string; // Encrypted
  isSetupComplete: boolean;
}

export interface QRData {
  vpa: string;
  amount?: number;
  description?: string;
  merchantName?: string;
}

export interface USSDResponse {
  step: number;
  message: string;
  success: boolean;
  data?: any;
}

// SUPPORTED_BANKS moved to src/constants/banks.ts