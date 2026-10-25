import type { PlotDeviceApi } from '@plotdevice/contracts'
import { channels } from '@plotdevice/contracts/channels'
import { contextBridge, ipcRenderer } from 'electron'

// The only bridge between the sandboxed page and the host: three typed calls, nothing else.
const api: PlotDeviceApi = {
  getAppInfo: () => ipcRenderer.invoke(channels.getAppInfo),
  getPreferences: () => ipcRenderer.invoke(channels.getPreferences),
  setPreferences: (patch) => ipcRenderer.invoke(channels.setPreferences, patch),
}

contextBridge.exposeInMainWorld('plotDevice', api)
