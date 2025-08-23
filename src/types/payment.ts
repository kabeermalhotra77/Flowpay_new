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

export const SUPPORTED_BANKS: BankDetails[] = [
  { id: 'sbi', name: 'State Bank of India', ussdCode: '*99*41#', upiId: '@sbi' },
  { id: 'hdfc', name: 'HDFC Bank', ussdCode: '*99*42#', upiId: '@hdfcbank' },
  { id: 'icici', name: 'ICICI Bank', ussdCode: '*99*43#', upiId: '@icici' },
  { id: 'axis', name: 'Axis Bank', ussdCode: '*99*44#', upiId: '@axisbank' },
  { id: 'pnb', name: 'Punjab National Bank', ussdCode: '*99*45#', upiId: '@pnb' },
  { id: 'bob', name: 'Bank of Baroda', ussdCode: '*99*46#', upiId: '@bob' },
];