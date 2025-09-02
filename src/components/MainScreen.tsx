import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, History, Settings, Scan, Wallet, ArrowUpRight } from 'lucide-react';
import { PaymentDetails, UserProfile, BankDetails, QRData } from '@/types/payment';
import { StorageService } from '@/services/storage';
import { QRScannerService } from '@/services/qrScanner';
import { BANKS } from '@/constants/banks';
import { AmountInputDialog } from './AmountInputDialog';

interface MainScreenProps {
  profile: UserProfile;
  onStartPayment: (paymentData: PaymentDetails) => void;
  onShowSettings: () => void;
}

export function MainScreen({ profile, onStartPayment, onShowSettings }: MainScreenProps) {
  const [recentPayments, setRecentPayments] = useState<PaymentDetails[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankDetails | null>(null);
  const [showAmountDialog, setShowAmountDialog] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<QRData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const payments = await StorageService.getPaymentHistory();
      setRecentPayments(payments.slice(0, 5)); // Show only recent 5
      
      const bank = BANKS.find(b => b.id === profile.selectedBankId);
      setSelectedBank(bank || null);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleScanQR = async () => {
    setIsScanning(true);
    
    try {
      console.log('Starting QR scan...');
      console.log('Profile bank ID:', profile.selectedBankId);
      
      // Check camera permission first
      const hasPermission = await QRScannerService.checkCameraPermission();
      if (!hasPermission) {
        console.log('Camera permission denied, using mock data');
      }
      
      // Try real camera scan first
      let qrData: any = null;
      try {
        qrData = await QRScannerService.scanQRCode();
      } catch (error) {
        console.log('Camera scan failed, showing options...');
        
        // Offer alternatives if camera fails
        const useMock = confirm('Camera unavailable. Would you like to:\n- OK: Use demo payment\n- Cancel: Try again');
        
        if (useMock) {
          qrData = QRScannerService.mockQRScan();
        } else {
          setIsScanning(false);
          return;
        }
      }
      
      console.log('QR data received:', qrData);
      
      if (qrData) {
        // Store QR data and show amount dialog
        setScannedQRData(qrData);
        setShowAmountDialog(true);
      } else {
        console.log('No QR data received');
        alert('No valid QR code detected. Please try again.');
      }
    } catch (error) {
      console.error('QR Scan failed:', error);
      alert('QR scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAmountConfirm = (amount: number) => {
    if (scannedQRData) {
      const paymentData: PaymentDetails = {
        id: `PAY_${Date.now()}`,
        vpa: scannedQRData.vpa,
        amount: amount,
        description: scannedQRData.description || scannedQRData.merchantName || 'QR Payment',
        timestamp: Date.now(),
        status: 'pending',
        bankId: profile.selectedBankId
      };
      
      console.log('Starting payment with data:', paymentData);
      setShowAmountDialog(false);
      setScannedQRData(null);
      onStartPayment(paymentData);
    }
  };

  const handleAmountCancel = () => {
    setShowAmountDialog(false);
    setScannedQRData(null);
    setIsScanning(false);
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: PaymentDetails['status']): string => {
    switch (status) {
      case 'completed': return 'bg-secondary text-secondary-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="mobile-container">
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header Card */}
        <div className="payment-card mt-8 mx-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">FlowPay</h1>
              <p className="text-primary-foreground/80">Offline UPI Payments</p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={onShowSettings}
              className="bg-white/20 hover:bg-white/30"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm">Connected Bank</p>
                <p className="text-lg font-semibold">{selectedBank?.name}</p>
              </div>
              <Wallet className="w-8 h-8 text-primary-foreground/60" />
            </div>
          </div>
        </div>

        {/* Scan to Pay Section */}
        <div className="p-4">
          <div className="text-center py-8">
            <Button
              onClick={handleScanQR}
              disabled={isScanning}
              className="scan-button"
            >
              {isScanning ? (
                <div className="animate-spin">
                  <QrCode className="w-12 h-12" />
                </div>
              ) : (
                <Scan className="w-12 h-12" />
              )}
            </Button>
            <p className="mt-4 text-lg font-semibold">
              {isScanning ? 'Scanning...' : 'Scan to Pay'}
            </p>
            <p className="text-muted-foreground text-sm">
              Point camera at UPI QR code
            </p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="flex-1 px-4 pb-4">
          <Card className="bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle>Recent Payments</CardTitle>
                    <CardDescription>
                      Your latest transactions
                    </CardDescription>
                  </div>
                </div>
                {recentPayments.length > 0 && (
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No transactions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Your payment history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="transaction-item">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">
                            {payment.description || payment.vpa}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {formatAmount(payment.amount)}
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.timestamp)}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(payment.status)}`}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Amount Input Dialog */}
        <AmountInputDialog
          isOpen={showAmountDialog}
          qrData={scannedQRData}
          onConfirm={handleAmountConfirm}
          onCancel={handleAmountCancel}
        />
      </div>
    </div>
  );
}