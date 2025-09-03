import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Phone, CheckCircle, AlertCircle, Smartphone, Loader2 } from 'lucide-react';
import { PermissionService, PermissionStatus } from '@/services/permissionService';
import { toast } from 'sonner';

interface PermissionOnboardingScreenProps {
  onComplete: () => void;
}

interface PermissionItem {
  key: keyof PermissionStatus;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

export function PermissionOnboardingScreen({ onComplete }: PermissionOnboardingScreenProps) {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    phone: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPermission, setCurrentPermission] = useState<string | null>(null);

  const permissionItems: PermissionItem[] = [
    {
      key: 'camera',
      title: 'Camera Access',
      description: 'Scan QR codes to extract payment details',
      icon: <Camera className="w-6 h-6" />,
      required: true
    },
    {
      key: 'phone',
      title: 'Phone & SMS Access',
      description: 'Make USSD calls and receive payment confirmations via SMS',
      icon: <Phone className="w-6 h-6" />,
      required: true
    }
  ];

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const status = await PermissionService.checkAllPermissions();
      setPermissions(status);
    } catch (error) {
      console.error('Error checking permissions:', error);
      toast.error('Failed to check permissions');
    }
  };

  const requestPermission = async (permission: keyof PermissionStatus) => {
    setCurrentPermission(permission);
    setIsLoading(true);

    try {
      let granted = false;

      switch (permission) {
        case 'camera':
          granted = await PermissionService.requestCameraPermission();
          break;
        case 'phone':
          granted = await PermissionService.requestPhonePermission();
          break;
      }

      setPermissions(prev => ({
        ...prev,
        [permission]: granted
      }));

      if (granted) {
        toast.success(`${permission} permission granted`);
      }
    } catch (error) {
      console.error(`Error requesting ${permission} permission:`, error);
      toast.error(`Failed to request ${permission} permission`);
    } finally {
      setIsLoading(false);
      setCurrentPermission(null);
    }
  };

  const requestAllPermissions = async () => {
    setIsLoading(true);
    
    try {
      const status = await PermissionService.requestAllPermissions();
      setPermissions(status);
      
      const requiredGranted = status.camera && status.phone;
      if (requiredGranted) {
        toast.success('All required permissions granted!');
      } else {
        toast.warning('Some required permissions are still missing');
      }
    } catch (error) {
      console.error('Error requesting all permissions:', error);
      toast.error('Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = permissions.camera && permissions.phone;

  const getPermissionStatus = (permission: keyof PermissionStatus) => {
    if (permissions[permission]) {
      return { icon: <CheckCircle className="w-4 h-4" />, variant: 'default' as const, text: 'Granted' };
    }
    return { icon: <AlertCircle className="w-4 h-4" />, variant: 'secondary' as const, text: 'Required' };
  };

  // Progress indicator for permissions
  const PermissionProgressIndicator = () => {
    const requiredPermissions = ['camera', 'phone'];
    const grantedRequired = requiredPermissions.filter(key => permissions[key as keyof PermissionStatus]).length;
    const totalRequired = requiredPermissions.length;
    const progress = (grantedRequired / totalRequired) * 100;

    return (
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span>Required Permissions</span>
          <span>{grantedRequired}/{totalRequired}</span>
        </div>
        <Progress value={progress} className="w-full" />
        <p className="text-xs text-muted-foreground text-center">
          {progress === 100 ? 'All required permissions granted!' : 
           `${totalRequired - grantedRequired} more required`}
        </p>
      </div>
    );
  };

  return (
    <div className="mobile-container">
      <div className="flex flex-col min-h-screen p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Grant Permissions
          </h1>
          <p className="text-muted-foreground">
            FlowPay needs these permissions to provide secure offline payments
          </p>
        </div>

        {/* Progress Indicator */}
        <PermissionProgressIndicator />

        {/* Permission Cards */}
        <div className="space-y-4 flex-1">
          {permissionItems.map((item) => {
            const status = getPermissionStatus(item.key);
            const isProcessing = currentPermission === item.key && isLoading;
            const isGranted = permissions[item.key];

            return (
              <Card key={item.key} className={`transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm ${
                isGranted ? 'ring-2 ring-green-500/20 bg-green-50/50' : 
                isProcessing ? 'ring-2 ring-blue-500/20 bg-blue-50/50' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isGranted ? 'bg-green-100 text-green-600' :
                        isProcessing ? 'bg-blue-100 text-blue-600' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : item.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {item.title}
                          {item.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {item.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${
                      isGranted ? 'text-green-500' :
                      isProcessing ? 'text-blue-500' :
                      'text-gray-500'
                    }`}>
                      {isGranted ? <CheckCircle className="w-5 h-5" /> : 
                       isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> :
                       <AlertCircle className="w-5 h-5" />}
                      <span className="text-sm font-medium">
                        {isGranted ? 'Granted' : isProcessing ? 'Processing...' : 'Required'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {!isGranted && (
                  <CardContent className="pt-0">
                    <Button
                      onClick={() => requestPermission(item.key)}
                      disabled={isProcessing}
                      loading={isProcessing}
                      variant={item.required ? "default" : "outline"}
                      className="w-full"
                    >
                      {isProcessing ? 'Requesting...' : `Grant ${item.title}`}
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-4 mt-8">
          <Button
            onClick={requestAllPermissions}
            disabled={isLoading}
            loading={isLoading && !currentPermission}
            className="w-full"
            size="lg"
          >
            Grant All Permissions
          </Button>
          
          <Button
            onClick={onComplete}
            disabled={!canProceed}
            variant={canProceed ? "default" : "secondary"}
            className="w-full"
            size="lg"
          >
            {canProceed ? 'Continue to Setup' : 'Complete Required Permissions First'}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Camera</strong> permission is required for QR code scanning.<br/>
            <strong>Phone & SMS</strong> permissions are required for USSD payments and payment confirmations.
          </p>
        </div>
      </div>
    </div>
  );
}