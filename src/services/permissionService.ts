import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { toast } from 'sonner';

// Native plugin interfaces for permissions
interface USSDPlugin {
  isUSSDSupported(): Promise<{ supported: boolean; hasPhonePermission: boolean; hasPhoneStatePermission: boolean }>;
  requestPermissions(): Promise<{ granted: boolean }>;
}

// Get native plugins
const USSDPlugin = Capacitor.isNativePlatform() ? 
  (Capacitor as any).Plugins.USSDPlugin as USSDPlugin : null;

export interface PermissionStatus {
  camera: boolean;
  phone: boolean;
}

export class PermissionService {
  
  static async checkAllPermissions(): Promise<PermissionStatus> {
    const [camera, phone] = await Promise.all([
      this.checkCameraPermission(),
      this.checkPhonePermission()
    ]);

    return { camera, phone };
  }

  static async checkCameraPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true; // Web doesn't need explicit camera permission for getUserMedia
    }

    try {
      const permission = await Camera.checkPermissions();
      return permission.camera === 'granted';
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return false;
    }
  }

  static async requestCameraPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      const permission = await Camera.requestPermissions();
      const granted = permission.camera === 'granted';
      
      if (!granted) {
        toast.error('Camera permission is required to scan QR codes');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      toast.error('Failed to request camera permission');
      return false;
    }
  }

  static async checkPhonePermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true; // Allow simulation on web
    }

    try {
      if (USSDPlugin) {
        const result = await USSDPlugin.isUSSDSupported();
        return result.supported && result.hasPhonePermission && result.hasPhoneStatePermission;
      }
      return false;
    } catch (error) {
      console.error('Error checking phone permission:', error);
      return false;
    }
  }

  static async requestPhonePermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      toast.info('Using simulation mode on web platform');
      return true; // Allow simulation on web
    }

    try {
      if (USSDPlugin) {
        const result = await USSDPlugin.requestPermissions();
        if (result.granted) {
          toast.success('Phone permissions granted');
        } else {
          toast.error('Phone permissions denied');
        }
        return result.granted;
      }
      return false;
    } catch (error) {
      console.error('Error requesting phone permission:', error);
      toast.error('Failed to request phone permission');
      return false;
    }
  }



  static async requestAllPermissions(): Promise<PermissionStatus> {
    const results = await Promise.all([
      this.requestCameraPermission(),
      this.requestPhonePermission()
    ]);

    return {
      camera: results[0],
      phone: results[1]
    };
  }

  static async validatePermissionsForPayment(): Promise<boolean> {
    const permissions = await this.checkAllPermissions();
    
    if (!permissions.camera) {
      toast.error('Camera permission required for QR scanning');
      return false;
    }

    if (!permissions.phone && Capacitor.isNativePlatform()) {
      toast.error('Phone permission required for USSD payments and SMS confirmations');
      return false;
    }

    return true;
  }

  static getPermissionStatusMessage(status: PermissionStatus): string {
    const messages: string[] = [];
    
    if (!status.camera) {
      messages.push('Camera permission needed for QR scanning');
    }
    
    if (!status.phone && Capacitor.isNativePlatform()) {
      messages.push('Phone permission needed for USSD payments and SMS confirmations');
    }

    if (messages.length === 0) {
      return 'All permissions granted';
    }

    return messages.join(', ');
  }
}