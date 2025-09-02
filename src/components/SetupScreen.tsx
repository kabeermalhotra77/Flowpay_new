import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, CreditCard, Shield } from 'lucide-react';
import { BANKS } from '@/constants/banks';
import { StorageService } from '@/services/storage';
import { UserProfile } from '@/types/payment';
import { USSDService } from '@/services/ussdService';

interface SetupScreenProps {
  onSetupComplete: (profile: UserProfile) => void;
}

export function SetupScreen({ onSetupComplete }: SetupScreenProps) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [upiPin, setUpiPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      if (profile) {
        setMobileNumber(profile.mobileNumber);
        setSelectedBankId(profile.selectedBankId);
        if (profile.isSetupComplete) {
          onSetupComplete(profile);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const validateMobileNumber = (number: string): boolean => {
    const indianMobileRegex = /^[6-9]\d{9}$/;
    return indianMobileRegex.test(number);
  };

  const validatePin = (pin: string): boolean => {
    return /^\d{4,6}$/.test(pin);
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateMobileNumber(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!selectedBankId) {
      setError('Please select your bank');
      return;
    }

    if (!validatePin(upiPin)) {
      setError('UPI PIN must be 4-6 digits');
      return;
    }

    if (upiPin !== confirmPin) {
      setError('UPI PIN and confirmation do not match');
      return;
    }

    setIsLoading(true);

    try {
      const encryptedPin = USSDService.encryptPin(upiPin);
      
      const profile: UserProfile = {
        mobileNumber,
        selectedBankId,
        upiPin: encryptedPin,
        isSetupComplete: true
      };

      await StorageService.saveUserProfile(profile);
      onSetupComplete(profile);
    } catch (error) {
      setError('Failed to save setup. Please try again.');
      console.error('Setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-container">
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <div className="payment-card mt-8 mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Setup FlowPay</h1>
            <p className="text-primary-foreground/80">Configure your UPI payments</p>
          </div>
        </div>

        {/* Setup Form */}
        <div className="flex-1 p-4 space-y-6">
          <Card className="bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Mobile Number</CardTitle>
                  <CardDescription>
                    Enter your registered mobile number
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={10}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Bank Selection</CardTitle>
                  <CardDescription>
                    Choose your primary bank for UPI payments
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="bank">Select Bank</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>UPI PIN</CardTitle>
                  <CardDescription>
                    Set your 4-6 digit UPI PIN for secure payments
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">UPI PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="4-6 digit PIN"
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value)}
                  maxLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  placeholder="Re-enter PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  maxLength={6}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full h-12 text-lg font-semibold"
          >
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
}