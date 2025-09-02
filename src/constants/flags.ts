// Environment flags with type safety
export const FLAGS = {
  USSD_SIMULATED: import.meta.env.VITE_USSD_SIMULATED === 'true',
  PIN_SECURE_UI_V2: import.meta.env.VITE_PIN_SECURE_UI_V2 === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
  MOCK_PAYMENTS: import.meta.env.VITE_MOCK_PAYMENTS === 'true',
  ENABLE_ROOT_DETECTION: import.meta.env.VITE_ENABLE_ROOT_DETECTION === 'true',
  CERTIFICATE_PINNING: import.meta.env.VITE_CERTIFICATE_PINNING === 'true',
  ANALYTICS_ENABLED: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
} as const;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const isDebugMode = (): boolean => FLAGS.DEBUG_MODE;
export const isSimulated = (): boolean => FLAGS.USSD_SIMULATED;
export const shouldUseMockPayments = (): boolean => FLAGS.MOCK_PAYMENTS;