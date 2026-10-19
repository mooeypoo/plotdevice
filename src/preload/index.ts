import { contextBridge } from 'electron'
import type { PlotDeviceApi } from '../contract/api'

const plotDevice: PlotDeviceApi = {
  contractVersion: 1
}

contextBridge.exposeInMainWorld('plotDevice', plotDevice)
