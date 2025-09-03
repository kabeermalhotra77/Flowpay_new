import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QrCode, History, Settings, Scan, Wallet, ArrowUpRight, CheckCircle, XCircle, Loader2, Phone, MessageSquare } from 'lucide-react';
import { PaymentDetails, UserProfile, BankDetails, QRData } from '@/types/payment';
import { StorageService } from '@/services/storage';
import { QRScannerService } from '@/services/qrScanner';
import { SimpleUSSDService, PaymentResult } from '@/services/simpleUSSDService';
import { BANKS } from '@/constants/banks';
import { AmountInputDialog } from './AmountInputDialog';

interface MainScreenProps {
  profile: UserProfile;
  onStartPayment: (paymentData: PaymentDetails) => void;
  onShowSettings: () => void;
  currentPayment?: PaymentDetails | null;
  onPaymentComplete: () => void;
}

export function MainScreen({ profile, onStartPayment, onShowSettings, currentPayment, onPaymentComplete }: MainScreenProps) {
  const [recentPayments, setRecentPayments] = useState<PaymentDetails[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankDetails | null>(null);
  const [showAmountDialog, setShowAmountDialog] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<QRData | null>(null);
  
  // Payment processing states
  const [paymentStatus, setPaymentStatus] = useState<'dialing' | 'waiting' | 'success' | 'failed' | 'timeout' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  useEffect(() => {
    loadData();
    setupSMSEventListener();
    
    // Cleanup on unmount
    return () => {
      SimpleUSSDService.clearPaymentCallback();
    };
  }, []);

  useEffect(() => {
    // Handle current payment when it changes
    if (currentPayment && !isProcessing) {
      initiatePayment(currentPayment);
    }
  }, [currentPayment]);

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

  const setupSMSEventListener = () => {
    // Listen for SMS events from native bridge
    const handlePaymentSMS = (event: any) => {
      const data = event.detail || event.data;
      if (data && data.action === 'paymentSMSReceived') {
        const result = SimpleUSSDService.processPaymentSMS(data.data.message);
        if (result) {
          handlePaymentResult(result);
        }
      }
    };

    document.addEventListener('paymentSMSReceived', handlePaymentSMS);
    
    // Set up payment callback
    SimpleUSSDService.setPaymentCallback(handlePaymentResult);
  };

  const initiatePayment = async (paymentData: PaymentDetails) => {
    try {
      setIsProcessing(true);
      setPaymentStatus('dialing');
      setPaymentProgress(0);
      setPaymentMessage('Initiating payment...');
      setPaymentResult(null);

      const bank = BANKS.find(b => b.id === paymentData.bankId) || BANKS[0];
      
      // Start payment process
      const success = await SimpleUSSDService.initiatePayment(paymentData, bank);
      
      if (success) {
        setPaymentStatus('waiting');
        setPaymentMessage('USSD dialed. Please enter your PIN when prompted...');
        setPaymentProgress(50);
      } else {
        setPaymentStatus('failed');
        setPaymentMessage('Failed to dial USSD. Please try again.');
        setPaymentProgress(0);
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setPaymentStatus('failed');
      setPaymentMessage('Payment failed. Please try again.');
      setPaymentProgress(0);
    }
  };

  const handlePaymentResult = (result: PaymentResult) => {
    setPaymentResult(result);
    
    if (result.success) {
      setPaymentStatus('success');
      setPaymentMessage('Payment successful!');
      setPaymentProgress(100);
      
      // Update payment in storage
      updatePaymentStatus('completed', result.transactionRef);
    } else {
      setPaymentStatus('failed');
      setPaymentMessage(result.message);
      setPaymentProgress(0);
      
      // Update payment in storage
      updatePaymentStatus('failed');
    }
  };

  const updatePaymentStatus = async (status: PaymentDetails['status'], txnRef?: string) => {
    if (!currentPayment) return;
    
    try {
      await StorageService.updatePaymentStatus(currentPayment.id, status, txnRef);
      
      // Add to history if not already there
      const history = await StorageService.getPaymentHistory();
      const existingPayment = history.find(p => p.id === currentPayment.id);
      
      if (!existingPayment) {
        const updatedPayment = { 
          ...currentPayment, 
          status, 
          transactionRef: txnRef 
        };
        await StorageService.addPayment(updatedPayment);
      }
      
      // Refresh recent payments
      loadData();
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const handlePaymentComplete = () => {
    setIsProcessing(false);
    setPaymentStatus(null);
    setPaymentProgress(0);
    setPaymentMessage('');
    setPaymentResult(null);
    SimpleUSSDService.reset();
    onPaymentComplete();
  };

  const handleRetryPayment = () => {
    if (currentPayment) {
      initiatePayment(currentPayment);
    }
  };

  const handleMarkSuccessful = () => {
    if (currentPayment) {
      const mockResult: PaymentResult = {
        success: true,
        message: 'Payment marked as successful',
        timestamp: new Date()
      };
      handlePaymentResult(mockResult);
    }
  };

  const handleMarkFailed = () => {
    if (currentPayment) {
      const mockResult: PaymentResult = {
        success: false,
        message: 'Payment marked as failed',
        timestamp: new Date()
      };
      handlePaymentResult(mockResult);
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

  const renderContent = () => {
    if (isProcessing) {
      return renderProcessingState();
    }
    if (showAmountDialog) {
      return renderAmountDialog();
    }
    return renderMainContent();
  };

  const renderProcessingState = () => {
    return (
      <div className="mobile-container">
        <div className="flex flex-col min-h-screen bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h1 className="text-lg font-semibold">Payment Processing</h1>
          </div>

          {/* Payment Details Card */}
          <div className="p-4">
            <Card className="bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-center">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatAmount(currentPayment?.amount || 0)}</p>
                  <p className="text-muted-foreground">to {currentPayment?.vpa}</p>
                  {currentPayment?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPayment.description}
                    </p>
                  )}
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bank:</span>
                  <span>{selectedBank?.name}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span>USSD (*99#)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Section */}
          <div className="flex-1 p-4">
            <Card className="bg-card/95 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center space-y-6">
                  {/* Status Icon */}
                  <div className="flex justify-center">
                    {getStatusIcon()}
                  </div>

                  {/* Status Title */}
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      {getStatusTitle()}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {paymentMessage}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  {paymentStatus === 'dialing' || paymentStatus === 'waiting' ? (
                    <div className="space-y-2">
                      <Progress value={paymentProgress} className="w-full" />
                      <p className="text-xs text-muted-foreground">
                        {Math.round(paymentProgress)}% Complete
                      </p>
                    </div>
                  ) : null}

                  {/* Transaction Reference */}
                  {paymentStatus === 'success' && paymentResult?.transactionRef && (
                    <div className="bg-secondary/10 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm font-medium">Transaction ID</span>
                      </div>
                      <p className="text-xs font-mono">{paymentResult.transactionRef}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {paymentStatus !== 'dialing' && paymentStatus !== 'waiting' && (
                    <div className="space-y-3 pt-4">
                      <Button 
                        onClick={handlePaymentComplete} 
                        className="w-full"
                        variant={paymentStatus === 'success' ? 'default' : 'secondary'}
                      >
                        {paymentStatus === 'success' ? 'Done' : 'Try Again'}
                      </Button>
                      
                      {paymentStatus === 'failed' && (
                        <Button 
                          onClick={handleRetryPayment} 
                          variant="outline" 
                          className="w-full"
                        >
                          Retry Payment
                        </Button>
                      )}

                      {paymentStatus === 'timeout' && (
                        <div className="space-y-2">
                          <Button 
                            onClick={handleMarkSuccessful} 
                            variant="outline" 
                            className="w-full"
                          >
                            Mark Successful
                          </Button>
                          <Button 
                            onClick={handleMarkFailed} 
                            variant="outline" 
                            className="w-full"
                          >
                            Mark Failed
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'dialing':
        return <Phone className="w-16 h-16 text-primary animate-pulse" />;
      case 'waiting':
        return <MessageSquare className="w-16 h-16 text-primary animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-secondary" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-destructive" />;
      case 'timeout':
        return <XCircle className="w-16 h-16 text-orange-500" />;
      default:
        return <Loader2 className="w-16 h-16 animate-spin text-primary" />;
    }
  };

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'dialing':
        return 'Dialing USSD';
      case 'waiting':
        return 'Waiting for SMS';
      case 'success':
        return 'Payment Successful';
      case 'failed':
        return 'Payment Failed';
      case 'timeout':
        return 'Payment Timeout';
      default:
        return 'Processing Payment';
    }
  };

  const renderAmountDialog = () => {
    return (
      <AmountInputDialog
        isOpen={showAmountDialog}
        qrData={scannedQRData}
        onConfirm={handleAmountConfirm}
        onCancel={handleAmountCancel}
      />
    );
  };

  const renderMainContent = () => {
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
              onClick={() => {
                console.log('Settings button clicked'); // Debug log
                onShowSettings();
              }}
              className="bg-white/20 hover:bg-white/30 border-0"
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

        </div>
      </div>
    );
  };

  return renderContent();
}