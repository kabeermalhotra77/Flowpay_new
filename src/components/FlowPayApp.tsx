import React, { useState, useEffect } from 'react';
import { SetupScreen } from './SetupScreen';
import { MainScreen } from './MainScreen';
import { ProcessingScreen } from './ProcessingScreen';
import { UserProfile, PaymentDetails } from '@/types/payment';
import { StorageService } from '@/services/storage';

type AppScreen = 'setup' | 'main' | 'processing';

export function FlowPayApp() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('setup');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      if (profile && profile.isSetupComplete) {
        setUserProfile(profile);
        setCurrentScreen('main');
      } else {
        setCurrentScreen('setup');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setCurrentScreen('setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentScreen('main');
  };

  const handleStartPayment = (paymentData: PaymentDetails) => {
    setCurrentPayment(paymentData);
    setCurrentScreen('processing');
  };

  const handlePaymentComplete = () => {
    setCurrentPayment(null);
    setCurrentScreen('main');
  };

  const handleShowSettings = () => {
    // For now, just reset to setup
    setCurrentScreen('setup');
  };

  const handleBackToMain = () => {
    setCurrentPayment(null);
    setCurrentScreen('main');
  };

  if (isLoading) {
    return (
      <div className="mobile-container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-8 h-8 bg-primary-foreground rounded-full"></div>
            </div>
            <p className="text-lg font-semibold">Loading FlowPay...</p>
          </div>
        </div>
      </div>
    );
  }

  switch (currentScreen) {
    case 'setup':
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
    
    case 'main':
      return userProfile ? (
        <MainScreen 
          profile={userProfile}
          onStartPayment={handleStartPayment}
          onShowSettings={handleShowSettings}
        />
      ) : (
        <SetupScreen onSetupComplete={handleSetupComplete} />
      );
    
    case 'processing':
      return userProfile && currentPayment ? (
        <ProcessingScreen
          paymentData={currentPayment}
          profile={userProfile}
          onBack={handleBackToMain}
          onComplete={handlePaymentComplete}
        />
      ) : (
        <SetupScreen onSetupComplete={handleSetupComplete} />
      );
    
    default:
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }
}