// IPC channel names. Kept free of zod so the preload script stays tiny.
export const channels = {
  getAppInfo: 'plotdevice:get-app-info',
  getPreferences: 'plotdevice:get-preferences',
  setPreferences: 'plotdevice:set-preferences',
} as const
