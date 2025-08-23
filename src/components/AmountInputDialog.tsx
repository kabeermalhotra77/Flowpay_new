import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QRData } from '@/types/payment';

interface AmountInputDialogProps {
  isOpen: boolean;
  qrData: QRData | null;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export function AmountInputDialog({ isOpen, qrData, onConfirm, onCancel }: AmountInputDialogProps) {
  const [amount, setAmount] = useState(qrData?.amount?.toString() || '');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setError('');
    onConfirm(numAmount);
  };

  const formatAmount = (value: string) => {
    // Remove non-numeric characters except decimal
    const cleaned = value.replace(/[^\d.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value);
    setAmount(formatted);
    if (error) setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Payment Amount</DialogTitle>
          <DialogDescription>
            {qrData?.merchantName && (
              <div className="mb-2">
                <span className="font-medium">Merchant: </span>
                {qrData.merchantName}
              </div>
            )}
            {qrData?.description && (
              <div className="mb-2">
                <span className="font-medium">Description: </span>
                {qrData.description}
              </div>
            )}
            <div>
              <span className="font-medium">UPI ID: </span>
              {qrData?.vpa}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                className="pl-8 text-lg"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Pay ₹{amount || '0'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}