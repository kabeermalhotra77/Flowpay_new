import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Settings, 
  Shield, 
  Camera, 
  Phone, 
  Accessibility, 
  Info, 
  Database,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { PermissionService, PermissionStatus } from '@/services/permissionService';
import { StorageService } from '@/services/storage';
import { NativeUSSDService } from '@/services/nativeUSSDService';
import { FLAGS } from '@/constants/flags';
import { UserProfile } from '@/types/payment';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface SettingsScreenProps {
  profile: UserProfile | null;
  onBack: () => void;
  onResetApp: () => void;
}

interface AppInfo {
  version: string;
  platform: string;
  isNative: boolean;
  ussdSupported: boolean;
  accessibilityEnabled: boolean;
}

export function SettingsScreen({ profile, onBack, onResetApp }: SettingsScreenProps) {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    camera: false,
    phone: false,
    accessibility: false
  });
  const [appInfo, setAppInfo] = useState<AppInfo>({
    version: '1.0.0',
    platform: 'web',
    isNative: false,
    ussdSupported: false,
    accessibilityEnabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [simulationMode, setSimulationMode] = useState(FLAGS.USSD_SIMULATED);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setIsLoading(true);
    try {
      // Load permissions status
      const permissionStatus = await PermissionService.checkAllPermissions();
      setPermissions(permissionStatus);

      // Load app information
      const isNative = Capacitor.isNativePlatform();
      const ussdSupported = await NativeUSSDService.isUSSDSupported();
      const accessibilityEnabled = await NativeUSSDService.isAccessibilityEnabled();

      setAppInfo({
        version: '1.0.0-beta',
        platform: isNative ? Capacitor.getPlatform() : 'web',
        isNative,
        ussdSupported,
        accessibilityEnabled
      });
    } catch (error) {
      console.error('Error loading settings data:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (permission: keyof PermissionStatus) => {
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
      
      setPermissions(prev => ({ ...prev, [permission]: granted }));
    } catch (error) {
      console.error(`Error requesting ${permission} permission:`, error);
      toast.error(`Failed to request ${permission} permission`);
    }
  };

  const clearAllData = async () => {
    try {
      await StorageService.clearAllData();
      toast.success('All data cleared successfully');
      onResetApp();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    }
  };

  const exportData = async () => {
    try {
      const profile = await StorageService.getUserProfile();
      const history = await StorageService.getPaymentHistory();
      
      const exportData = {
        profile,
        paymentHistory: history,
        exportedAt: new Date().toISOString(),
        version: appInfo.version
      };

      const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowpay-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "secondary"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {label}
      </Badge>
    );
  };

  return (
    <div className="mobile-container">
      <div className="flex flex-col min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">App configuration and permissions</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* User Profile Info */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  User Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mobile:</span>
                  <span className="text-sm font-medium">{profile.mobileNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bank:</span>
                  <span className="text-sm font-medium">{profile.selectedBankId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Setup Complete:</span>
                  {getStatusBadge(profile.isSetupComplete, profile.isSetupComplete ? 'Yes' : 'No')}
                </div>
              </CardContent>
            </Card>
          )}

          {/* App Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                App Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Version:</span>
                <span className="text-sm font-medium">{appInfo.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Platform:</span>
                <span className="text-sm font-medium capitalize">{appInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Native App:</span>
                {getStatusBadge(appInfo.isNative, appInfo.isNative ? 'Yes' : 'Web')}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">USSD Support:</span>
                {getStatusBadge(appInfo.ussdSupported, appInfo.ussdSupported ? 'Available' : 'Unavailable')}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Accessibility:</span>
                {getStatusBadge(appInfo.accessibilityEnabled, appInfo.accessibilityEnabled ? 'Enabled' : 'Disabled')}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissions
              </CardTitle>
              <CardDescription>
                Manage app permissions for full functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera Permission */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Camera Access</p>
                    <p className="text-xs text-muted-foreground">Required for QR code scanning</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.camera, permissions.camera ? 'Granted' : 'Denied')}
                  {!permissions.camera && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => requestPermission('camera')}
                    >
                      Grant
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Phone Permission */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone Access</p>
                    <p className="text-xs text-muted-foreground">Required for USSD dialing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.phone, permissions.phone ? 'Granted' : 'Denied')}
                  {!permissions.phone && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => requestPermission('phone')}
                    >
                      Grant
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Accessibility Permission */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Accessibility className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Accessibility Service</p>
                    <p className="text-xs text-muted-foreground">Optional for USSD automation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(permissions.accessibility, permissions.accessibility ? 'Enabled' : 'Disabled')}
                  {!permissions.accessibility && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => requestPermission('accessibility')}
                    >
                      Enable
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                App Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Simulation Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Use simulated payments instead of real USSD
                  </p>
                </div>
                <Switch 
                  checked={simulationMode}
                  onCheckedChange={setSimulationMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={exportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Export App Data
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => toast.info('Import feature coming soon')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import App Data
              </Button>

              <Separator />

              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={clearAllData}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </CardContent>
          </Card>

          {/* Feature Flags (Debug) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Current feature configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">USSD Simulated:</span>
                {getStatusBadge(FLAGS.USSD_SIMULATED, FLAGS.USSD_SIMULATED ? 'Yes' : 'No')}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Mock Payments:</span>
                {getStatusBadge(FLAGS.MOCK_PAYMENTS, FLAGS.MOCK_PAYMENTS ? 'Yes' : 'No')}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Secure UI v2:</span>
                {getStatusBadge(FLAGS.PIN_SECURE_UI_V2, FLAGS.PIN_SECURE_UI_V2 ? 'Yes' : 'No')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="mt-8">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={loadSettingsData}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}