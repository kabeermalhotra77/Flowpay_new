import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.30d76b9293f24617b9002d4791287e0c',
  appName: 'FlowPay - Offline UPI Payments',
  webDir: 'dist',
  server: {
    url: 'https://30d76b92-93f2-4617-b900-2d4791287e0c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    },
    Preferences: {
      group: 'FlowPayApp'
    }
  }
};

export default config;