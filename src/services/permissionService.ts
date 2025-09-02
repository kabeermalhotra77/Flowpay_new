import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { toast } from 'sonner';

// Native plugin interfaces for permissions
interface USSDPlugin {
  isUSSDSupported(): Promise<{ supported: boolean }>;
}

interface AccessibilityPlugin {
  isAccessibilityServiceEnabled(): Promise<{ enabled: boolean }>;
  requestAccessibilityPermission(): Promise<{ message: string }>;
  openAccessibilitySettings(): Promise<void>;
}

// Get native plugins
const USSDPlugin = Capacitor.isNativePlatform() ? 
  (Capacitor as any).Plugins.USSDPlugin as USSDPlugin : null;

const AccessibilityPlugin = Capacitor.isNativePlatform() ? 
  (Capacitor as any).Plugins.AccessibilityPlugin as AccessibilityPlugin : null;

export interface PermissionStatus {
  camera: boolean;
  phone: boolean;
  accessibility: boolean;
}

export class PermissionService {
  
  static async checkAllPermissions(): Promise<PermissionStatus> {
    const [camera, phone, accessibility] = await Promise.all([
      this.checkCameraPermission(),
      this.checkPhonePermission(),
      this.checkAccessibilityPermission()
    ]);

    return { camera, phone, accessibility };
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
      return false; // Web can't make phone calls
    }

    try {
      if (USSDPlugin) {
        const result = await USSDPlugin.isUSSDSupported();
        return result.supported;
      }
      return false;
    } catch (error) {
      console.error('Error checking phone permission:', error);
      return false;
    }
  }

  static async requestPhonePermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Phone calls are not supported on web platform');
      return false;
    }

    // Phone permission is requested automatically when trying to dial USSD
    // The actual permission request happens in the native USSD plugin
    toast.info('Phone permission will be requested when making payments');
    return true;
  }

  static async checkAccessibilityPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false; // Web doesn't have accessibility services
    }

    try {
      if (AccessibilityPlugin) {
        const result = await AccessibilityPlugin.isAccessibilityServiceEnabled();
        return result.enabled;
      }
      return false;
    } catch (error) {
      console.error('Error checking accessibility permission:', error);
      return false;
    }
  }

  static async requestAccessibilityPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Accessibility services are not supported on web platform');
      return false;
    }

    try {
      if (AccessibilityPlugin) {
        const result = await AccessibilityPlugin.requestAccessibilityPermission();
        toast.info(result.message);
        
        // Open accessibility settings
        await AccessibilityPlugin.openAccessibilitySettings();
        return false; // User needs to manually enable in settings
      }
      return false;
    } catch (error) {
      console.error('Error requesting accessibility permission:', error);
      toast.error('Failed to request accessibility permission');
      return false;
    }
  }

  static async requestAllPermissions(): Promise<PermissionStatus> {
    const results = await Promise.all([
      this.requestCameraPermission(),
      this.requestPhonePermission(),
      this.requestAccessibilityPermission()
    ]);

    return {
      camera: results[0],
      phone: results[1],
      accessibility: results[2]
    };
  }

  static async validatePermissionsForPayment(): Promise<boolean> {
    const permissions = await this.checkAllPermissions();
    
    if (!permissions.camera) {
      toast.error('Camera permission required for QR scanning');
      return false;
    }

    if (!permissions.phone && Capacitor.isNativePlatform()) {
      toast.error('Phone permission required for USSD payments');
      return false;
    }

    if (!permissions.accessibility && Capacitor.isNativePlatform()) {
      toast.warning('Accessibility service recommended for automatic USSD handling');
      // Don't block payment, just warn
    }

    return true;
  }

  static getPermissionStatusMessage(status: PermissionStatus): string {
    const messages: string[] = [];
    
    if (!status.camera) {
      messages.push('Camera permission needed for QR scanning');
    }
    
    if (!status.phone && Capacitor.isNativePlatform()) {
      messages.push('Phone permission needed for USSD payments');
    }
    
    if (!status.accessibility && Capacitor.isNativePlatform()) {
      messages.push('Accessibility service recommended for automation');
    }

    if (messages.length === 0) {
      return 'All permissions granted';
    }

    return messages.join(', ');
  }
}