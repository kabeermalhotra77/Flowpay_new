import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { QRData } from '../types/payment';
import { BrowserMultiFormatReader } from '@zxing/library';

export class QRScannerService {
  private static codeReader = new BrowserMultiFormatReader();

  static async scanQRCode(): Promise<QRData | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false
      });

      if (image.dataUrl) {
        return await this.parseQRFromImage(image.dataUrl);
      }
      
      return null;
    } catch (error) {
      console.error('QR Scan error:', error);
      throw new Error('Failed to scan QR code');
    }
  }

  static async parseQRFromImage(dataUrl: string): Promise<QRData | null> {
    try {
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const result = await this.codeReader.decodeFromImageElement(img);
      
      if (result) {
        return this.parseUPIString(result.getText());
      }
      
      return null;
    } catch (error) {
      console.error('QR Parse error:', error);
      return null;
    }
  }

  static parseUPIString(upiString: string): QRData | null {
    try {
      const url = new URL(upiString);
      
      if (url.protocol !== 'upi:') {
        throw new Error('Not a UPI URL');
      }

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
      console.error('UPI Parse error:', error);
      return null;
    }
  }

  // For testing - simulate QR scan
  static mockQRScan(): QRData {
    return {
      vpa: 'merchant@paytm',
      amount: 100,
      description: 'Test Payment',
      merchantName: 'Test Merchant'
    };
  }
}