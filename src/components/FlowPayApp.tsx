import React, { useState, useEffect } from 'react';
import { SetupScreen } from './SetupScreen';
import { MainScreen } from './MainScreen';
import { PermissionOnboardingScreen } from './PermissionOnboardingScreen';
import { SettingsScreen } from './SettingsScreen';
import { UserProfile, PaymentDetails } from '@/types/payment';
import { StorageService } from '@/services/storage';

type AppScreen = 'permissions' | 'setup' | 'main' | 'settings';

export function FlowPayApp() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('permissions');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Start with permissions screen for new flow
      setCurrentScreen('permissions');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setCurrentScreen('permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionsComplete = () => {
    setCurrentScreen('setup');
  };

  const handleSetupComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentScreen('main');
  };

  const handleStartPayment = (paymentData: PaymentDetails) => {
    setCurrentPayment(paymentData);
    // Payment will be handled directly in MainScreen now
  };

  const handlePaymentComplete = () => {
    setCurrentPayment(null);
    setCurrentScreen('main');
  };

  const handleShowSettings = () => {
    setCurrentScreen('settings');
  };

  const handleBackFromSettings = () => {
    setCurrentScreen('main');
  };

  const handleResetApp = () => {
    setUserProfile(null);
    setCurrentScreen('permissions');
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
    case 'permissions':
      return <PermissionOnboardingScreen onComplete={handlePermissionsComplete} />;
    
    case 'setup':
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
    
    case 'main':
      return userProfile ? (
        <MainScreen 
          profile={userProfile}
          onStartPayment={handleStartPayment}
          onShowSettings={handleShowSettings}
          currentPayment={currentPayment}
          onPaymentComplete={handlePaymentComplete}
        />
      ) : (
        <SetupScreen onSetupComplete={handleSetupComplete} />
      );

    case 'settings':
      return (
        <SettingsScreen
          profile={userProfile}
          onBack={handleBackFromSettings}
          onResetApp={handleResetApp}
        />
      );
    
    default:
      return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }
}