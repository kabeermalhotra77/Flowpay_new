import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Receipt } from 'lucide-react';
import { PaymentDetails, UserProfile, BankDetails, USSDResponse } from '@/types/payment';
import { StorageService } from '@/services/storage';
import { USSDService } from '@/services/ussdService';
import { SUPPORTED_BANKS } from '@/types/payment';

interface ProcessingScreenProps {
  paymentData: PaymentDetails;
  profile: UserProfile;
  onBack: () => void;
  onComplete: () => void;
}

export function ProcessingScreen({ 
  paymentData, 
  profile, 
  onBack, 
  onComplete 
}: ProcessingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [transactionRef, setTransactionRef] = useState('');
  const [bank, setBank] = useState<BankDetails | null>(null);

  useEffect(() => {
    const selectedBank = SUPPORTED_BANKS.find(b => b.id === profile.selectedBankId);
    setBank(selectedBank || null);
    initiatePayment();
  }, []);

  const initiatePayment = async () => {
    try {
      const upiPin = profile.upiPin ? USSDService.decryptPin(profile.upiPin) : '';
      
      if (!bank) {
        throw new Error('Bank not found');
      }

      // Set up progress callback
      USSDService.setProgressCallback(handleUSSDProgress);
      
      // Start the payment process
      const success = await USSDService.initiatePayment(paymentData, bank, upiPin);
      
      if (!success) {
        setStatus('failed');
        await updatePaymentStatus('failed');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setStatus('failed');
      setCurrentStep('Payment failed. Please try again.');
      await updatePaymentStatus('failed');
    }
  };

  const handleUSSDProgress = async (response: USSDResponse) => {
    setCurrentStep(response.message);
    
    // Calculate progress based on step (10 total steps)
    const progressValue = Math.min((response.step / 10) * 100, 100);
    setProgress(progressValue);

    if (response.success && response.step === 10) {
      setStatus('success');
      if (response.data?.transactionRef) {
        setTransactionRef(response.data.transactionRef);
        await updatePaymentStatus('completed', response.data.transactionRef);
      } else {
        await updatePaymentStatus('completed');
      }
    } else if (response.step === 10 && !response.success) {
      setStatus('failed');
      await updatePaymentStatus('failed');
    }
  };

  const updatePaymentStatus = async (
    status: PaymentDetails['status'], 
    txnRef?: string
  ) => {
    try {
      await StorageService.updatePaymentStatus(paymentData.id, status, txnRef);
      
      // If this is a new payment, add it to history
      const history = await StorageService.getPaymentHistory();
      const existingPayment = history.find(p => p.id === paymentData.id);
      
      if (!existingPayment) {
        const updatedPayment = { 
          ...paymentData, 
          status, 
          transactionRef: txnRef 
        };
        await StorageService.addPayment(updatedPayment);
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-16 h-16 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-secondary" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-destructive" />;
      default:
        return <Loader2 className="w-16 h-16 animate-spin text-primary" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'processing':
        return 'Processing Payment';
      case 'success':
        return 'Payment Successful';
      case 'failed':
        return 'Payment Failed';
      default:
        return 'Processing Payment';
    }
  };

  return (
    <div className="mobile-container">
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Payment Processing</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Payment Details Card */}
        <div className="p-4">
          <Card className="bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{formatAmount(paymentData.amount)}</p>
                <p className="text-muted-foreground">to {paymentData.vpa}</p>
                {paymentData.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {paymentData.description}
                  </p>
                )}
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank:</span>
                <span>{bank?.name}</span>
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
                    {currentStep}
                  </p>
                </div>

                {/* Progress Bar */}
                {status === 'processing' && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round(progress)}% Complete
                    </p>
                  </div>
                )}

                {/* Transaction Reference */}
                {status === 'success' && transactionRef && (
                  <div className="bg-secondary/10 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Receipt className="w-4 h-4" />
                      <span className="text-sm font-medium">Transaction ID</span>
                    </div>
                    <p className="text-xs font-mono">{transactionRef}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {status !== 'processing' && (
                  <div className="space-y-3 pt-4">
                    <Button 
                      onClick={onComplete} 
                      className="w-full"
                      variant={status === 'success' ? 'default' : 'secondary'}
                    >
                      {status === 'success' ? 'Done' : 'Try Again'}
                    </Button>
                    
                    {status === 'failed' && (
                      <Button 
                        onClick={onBack} 
                        variant="outline" 
                        className="w-full"
                      >
                        Go Back
                      </Button>
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
}