import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { QRData } from '../types/payment';
import { BrowserMultiFormatReader } from '@zxing/library';

export class QRScannerService {
  private static codeReader = new BrowserMultiFormatReader();

  static async scanQRCode(): Promise<QRData | null> {
    try {
      console.log('Starting camera for QR scan...');
      
      // Try to use live camera stream first for better UX
      try {
        const qrData = await this.scanWithMediaStream();
        if (qrData) {
          console.log('QR scanned from live stream:', qrData);
          return qrData;
        }
      } catch (streamError) {
        console.log('Live stream scan failed, falling back to photo capture:', streamError);
      }
      
      // Fallback to photo capture
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

  // Live camera stream scanner for better UX
  static async scanWithMediaStream(): Promise<QRData | null> {
    return new Promise((resolve, reject) => {
      let stream: MediaStream | null = null;
      let scanInterval: NodeJS.Timeout | null = null;
      
      // Create video element
      const video = document.createElement('video');
      video.style.width = '100%';
      video.style.height = '300px';
      video.style.objectFit = 'cover';
      video.autoplay = true;
      video.playsInline = true;
      
      // Create canvas for QR detection
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
      `;
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Close';
      closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
      `;
      
      const instruction = document.createElement('div');
      instruction.textContent = 'Point camera at QR code';
      instruction.style.cssText = `
        margin-bottom: 20px;
        font-size: 18px;
        text-align: center;
      `;
      
      overlay.appendChild(closeBtn);
      overlay.appendChild(instruction);
      overlay.appendChild(video);
      document.body.appendChild(overlay);
      
      const cleanup = () => {
        if (scanInterval) clearInterval(scanInterval);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        document.body.removeChild(overlay);
      };
      
      closeBtn.onclick = () => {
        cleanup();
        reject(new Error('User cancelled scan'));
      };
      
      // Start camera
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Start scanning every 500ms
          scanInterval = setInterval(async () => {
            if (ctx && video.videoWidth > 0) {
              ctx.drawImage(video, 0, 0);
              
              try {
                // Create image from canvas for zxing
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const img = new Image();
                img.src = imageDataUrl;
                
                await new Promise((imgResolve, imgReject) => {
                  img.onload = imgResolve;
                  img.onerror = imgReject;
                });
                
                const code = await this.codeReader.decodeFromImageElement(img);
                if (code) {
                  const qrData = this.parseUPIString(code.getText());
                  if (qrData) {
                    cleanup();
                    resolve(qrData);
                  }
                }
              } catch (e) {
                // Continue scanning
              }
            }
          }, 500);
        };
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }

  // Check camera permissions
  static async checkCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Camera permission check failed:', error);
      return false;
    }
  }
}