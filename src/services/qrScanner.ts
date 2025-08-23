import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { QRData } from '../types/payment';
import { BrowserMultiFormatReader } from '@zxing/library';

export class QRScannerService {
  private static codeReader = new BrowserMultiFormatReader();

  static async scanQRCode(): Promise<QRData | null> {
    try {
      console.log('Starting camera for QR scan...');
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        promptLabelHeader: 'Scan QR Code',
        promptLabelPhoto: 'Take Photo',
        promptLabelPicture: 'Select from Gallery'
      });

      console.log('Photo captured, processing...');

      if (image.dataUrl) {
        const qrData = await this.parseQRFromImage(image.dataUrl);
        console.log('QR parsing result:', qrData);
        return qrData;
      }
      
      console.log('No image data received');
      return null;
    } catch (error) {
      console.error('QR Scan error:', error);
      
      // If camera fails, offer mock data for testing
      if (confirm('Camera not available. Use test payment data instead?')) {
        return this.mockQRScan();
      }
      
      throw new Error('Failed to scan QR code');
    }
  }

  static async parseQRFromImage(dataUrl: string): Promise<QRData | null> {
    try {
      console.log('Creating image element for QR parsing...');
      
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      console.log('Image loaded, decoding QR...');
      const result = await this.codeReader.decodeFromImageElement(img);
      
      if (result) {
        console.log('QR code detected:', result.getText());
        return this.parseUPIString(result.getText());
      }
      
      console.log('No QR code found in image');
      return null;
    } catch (error) {
      console.error('QR Parse error:', error);
      
      // Try to extract any UPI-like strings from manual input
      if (confirm('Could not read QR code. Enter UPI ID manually?')) {
        const manualVPA = prompt('Enter UPI ID (e.g., merchant@paytm):');
        const manualAmount = prompt('Enter amount (optional):');
        
        if (manualVPA) {
          return {
            vpa: manualVPA,
            amount: manualAmount ? parseFloat(manualAmount) : undefined,
            description: 'Manual Entry'
          };
        }
      }
      
      return null;
    }
  }

  static parseUPIString(upiString: string): QRData | null {
    try {
      console.log('Parsing UPI string:', upiString);
      
      // Handle different UPI QR formats
      if (upiString.startsWith('upi://')) {
        return this.parseUPIURL(upiString);
      } else if (upiString.includes('pa=') || upiString.includes('@')) {
        return this.parseUPIParams(upiString);
      } else {
        // Try to extract VPA directly if it's just an email-like string
        if (upiString.includes('@')) {
          return {
            vpa: upiString.trim(),
            description: 'Direct VPA'
          };
        }
      }
      
      throw new Error('Unrecognized QR format');
    } catch (error) {
      console.error('UPI Parse error:', error);
      return null;
    }
  }

  private static parseUPIURL(upiString: string): QRData | null {
    try {
      const url = new URL(upiString);
      const params = new URLSearchParams(url.search);
      
      const pa = params.get('pa'); // VPA
      const am = params.get('am'); // Amount
      const tn = params.get('tn'); // Description
      const pn = params.get('pn'); // Merchant name

      if (!pa) {
        throw new Error('Invalid UPI QR: Missing VPA');
      }

      return {
        vpa: pa,
        amount: am ? parseFloat(am) : undefined,
        description: tn || undefined,
        merchantName: pn || undefined
      };
    } catch (error) {
      console.error('UPI URL Parse error:', error);
      return null;
    }
  }

  private static parseUPIParams(upiString: string): QRData | null {
    try {
      // Handle query-string-like format
      const params = new URLSearchParams(upiString.includes('?') ? upiString.split('?')[1] : upiString);
      
      const pa = params.get('pa');
      const am = params.get('am');
      const tn = params.get('tn');
      const pn = params.get('pn');

      if (pa) {
        return {
          vpa: pa,
          amount: am ? parseFloat(am) : undefined,
          description: tn || undefined,
          merchantName: pn || undefined
        };
      }

      // If no 'pa' param, check if string contains @ symbol
      if (upiString.includes('@')) {
        const vpaMatch = upiString.match(/[\w.-]+@[\w.-]+/);
        if (vpaMatch) {
          return {
            vpa: vpaMatch[0],
            description: 'Extracted VPA'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('UPI Params Parse error:', error);
      return null;
    }
  }

  // For testing - simulate QR scan
  static mockQRScan(): QRData {
    const mockOptions = [
      {
        vpa: 'merchant@paytm',
        amount: 100,
        description: 'Coffee Shop Payment',
        merchantName: 'Cafe Delight'
      },
      {
        vpa: 'shop@phonepe',
        amount: 250,
        description: 'Grocery Purchase',
        merchantName: 'Fresh Mart'
      },
      {
        vpa: 'vendor@gpay',
        amount: 50,
        description: 'Snacks',
        merchantName: 'Street Food Corner'
      }
    ];
    
    return mockOptions[Math.floor(Math.random() * mockOptions.length)];
  }

  // Check camera permissions
  static async checkCameraPermission(): Promise<boolean> {
    try {
      // In a real app, you'd check camera permissions here
      // For now, assume camera is available in mobile environment
      return true;
    } catch (error) {
      console.error('Camera permission check failed:', error);
      return false;
    }
  }
}