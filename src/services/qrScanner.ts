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
      video.style.height = '100%';
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
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 16px;
        width: 100%;
        max-width: 400px;
        padding: 0;
        position: relative;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      `;

      // Create header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #e5e7eb;
      `;

      const title = document.createElement('h2');
      title.textContent = 'Scan QR Code';
      title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      `;

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
        padding: 4px;
        border-radius: 6px;
        transition: background-color 0.2s;
      `;
      closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#f3f4f6';
      closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';

      header.appendChild(title);
      header.appendChild(closeBtn);

      // Create camera container
      const cameraContainer = document.createElement('div');
      cameraContainer.style.cssText = `
        position: relative;
        margin: 24px;
        border-radius: 12px;
        overflow: hidden;
        background: #f3f4f6;
        aspect-ratio: 4/3;
      `;

      // Create corner indicators
      const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      corners.forEach(corner => {
        const cornerEl = document.createElement('div');
        cornerEl.style.cssText = `
          position: absolute;
          width: 40px;
          height: 40px;
          z-index: 10;
          ${corner.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
          ${corner.includes('left') ? 'left: 20px;' : 'right: 20px;'}
          border: 3px solid #3b82f6;
          ${corner === 'top-left' ? 'border-right: none; border-bottom: none;' : ''}
          ${corner === 'top-right' ? 'border-left: none; border-bottom: none;' : ''}
          ${corner === 'bottom-left' ? 'border-right: none; border-top: none;' : ''}
          ${corner === 'bottom-right' ? 'border-left: none; border-top: none;' : ''}
          border-radius: ${corner === 'top-left' ? '12px 0 0 0' : corner === 'top-right' ? '0 12px 0 0' : corner === 'bottom-left' ? '0 0 0 12px' : '0 0 12px 0'};
        `;
        cameraContainer.appendChild(cornerEl);
      });

      cameraContainer.appendChild(video);

      // Create instruction text
      const instruction = document.createElement('div');
      instruction.textContent = 'Position the QR code within the frame';
      instruction.style.cssText = `
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        margin: 16px 24px 24px;
      `;

      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.cssText = `
        padding: 0 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;

      const scanPhotoBtn = document.createElement('button');
      scanPhotoBtn.textContent = 'Scan from photo (camera)';
      scanPhotoBtn.style.cssText = `
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      scanPhotoBtn.onmouseover = () => scanPhotoBtn.style.backgroundColor = '#2563eb';
      scanPhotoBtn.onmouseout = () => scanPhotoBtn.style.backgroundColor = '#3b82f6';

      const demoBtn = document.createElement('button');
      demoBtn.textContent = 'Use Demo QR Code';
      demoBtn.style.cssText = `
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      demoBtn.onmouseover = () => demoBtn.style.backgroundColor = '#e5e7eb';
      demoBtn.onmouseout = () => demoBtn.style.backgroundColor = '#f3f4f6';

      buttonsContainer.appendChild(scanPhotoBtn);
      buttonsContainer.appendChild(demoBtn);

      modal.appendChild(header);
      modal.appendChild(cameraContainer);
      modal.appendChild(instruction);
      modal.appendChild(buttonsContainer);
      overlay.appendChild(modal);
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

      // Handle scan from photo button
      scanPhotoBtn.onclick = async () => {
        cleanup();
        try {
          // Use Capacitor camera to take photo
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

          if (image.dataUrl) {
            const qrData = await this.parseQRFromImage(image.dataUrl);
            if (qrData) {
              resolve(qrData);
            } else {
              reject(new Error('No QR code found in photo'));
            }
          } else {
            reject(new Error('No photo captured'));
          }
        } catch (error) {
          reject(error);
        }
      };

      // Handle demo button
      demoBtn.onclick = () => {
        cleanup();
        resolve(this.mockQRScan());
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