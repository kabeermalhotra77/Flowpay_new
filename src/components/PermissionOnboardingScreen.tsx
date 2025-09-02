import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Phone, Settings, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
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
    phone: false,
    accessibility: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentPermission, setCurrentPermission] = useState<string | null>(null);

  const permissionItems: PermissionItem[] = [
    {
      key: 'camera',
      title: 'Camera Access',
      description: 'Scan QR codes for quick payments',
      icon: <Camera className="w-6 h-6" />,
      required: true
    },
    {
      key: 'phone',
      title: 'Phone Access',
      description: 'Make USSD calls for offline payments',
      icon: <Phone className="w-6 h-6" />,
      required: true
    },
    {
      key: 'accessibility',
      title: 'Accessibility Service',
      description: 'Automate USSD navigation for seamless payments',
      icon: <Settings className="w-6 h-6" />,
      required: false
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
        case 'accessibility':
          granted = await PermissionService.requestAccessibilityPermission();
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

        {/* Permission Cards */}
        <div className="space-y-4 flex-1">
          {permissionItems.map((item) => {
            const status = getPermissionStatus(item.key);
            const isProcessing = currentPermission === item.key && isLoading;

            return (
              <Card key={item.key} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {item.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {item.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      {status.icon}
                      {status.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => requestPermission(item.key)}
                    disabled={permissions[item.key] || isProcessing}
                    loading={isProcessing}
                    variant={permissions[item.key] ? "secondary" : "default"}
                    className="w-full"
                  >
                    {permissions[item.key] 
                      ? 'Permission Granted' 
                      : isProcessing 
                        ? 'Requesting...' 
                        : `Grant ${item.title}`
                    }
                  </Button>
                </CardContent>
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
            <strong>Camera</strong> and <strong>Phone</strong> permissions are required. 
            <strong> Accessibility</strong> is optional but recommended for automated payments.
          </p>
        </div>
      </div>
    </div>
  );
}