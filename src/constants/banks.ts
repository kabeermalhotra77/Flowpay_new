import { BankDetails } from '../types/payment';

// Comprehensive bank configuration for Indian UPI system
export const BANKS: BankDetails[] = [
  { 
    id: 'sbi', 
    name: 'State Bank of India', 
    ussdCode: '*99*41#', 
    upiId: '@sbi',
  },
  { 
    id: 'hdfc', 
    name: 'HDFC Bank', 
    ussdCode: '*99*42#', 
    upiId: '@hdfcbank',
  },
  { 
    id: 'icici', 
    name: 'ICICI Bank', 
    ussdCode: '*99*43#', 
    upiId: '@icici',
  },
  { 
    id: 'axis', 
    name: 'Axis Bank', 
    ussdCode: '*99*44#', 
    upiId: '@axisbank',
  },
  { 
    id: 'pnb', 
    name: 'Punjab National Bank', 
    ussdCode: '*99*45#', 
    upiId: '@pnb',
  },
  { 
    id: 'bob', 
    name: 'Bank of Baroda', 
    ussdCode: '*99*46#', 
    upiId: '@bob',
  },
  { 
    id: 'kotak', 
    name: 'Kotak Mahindra Bank', 
    ussdCode: '*99*47#', 
    upiId: '@kotak',
  },
  { 
    id: 'idbi', 
    name: 'IDBI Bank', 
    ussdCode: '*99*48#', 
    upiId: '@idbi',
  },
  { 
    id: 'canara', 
    name: 'Canara Bank', 
    ussdCode: '*99*49#', 
    upiId: '@cnrb',
  },
  { 
    id: 'union', 
    name: 'Union Bank of India', 
    ussdCode: '*99*50#', 
    upiId: '@unionbank',
  },
];

export const getBankById = (id: string): BankDetails | undefined => {
  return BANKS.find(bank => bank.id === id);
};

export const getBankByUSSDCode = (ussdCode: string): BankDetails | undefined => {
  return BANKS.find(bank => bank.ussdCode === ussdCode);
};

export const getBankByUPIId = (upiId: string): BankDetails | undefined => {
  return BANKS.find(bank => bank.upiId === upiId);
};