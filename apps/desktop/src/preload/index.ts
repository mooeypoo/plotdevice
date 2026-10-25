import type { HostEvent, PlotDeviceApi } from '@plotdevice/contracts'
import { channels, eventChannel } from '@plotdevice/contracts/channels'
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

// The only bridge between the sandboxed page and the host: typed calls and one event stream, nothing else.
const api: PlotDeviceApi = {
  getAppInfo: () => ipcRenderer.invoke(channels.getAppInfo),
  getPreferences: () => ipcRenderer.invoke(channels.getPreferences),
  setPreferences: (patch) => ipcRenderer.invoke(channels.setPreferences, patch),
  getRecentProjects: () => ipcRenderer.invoke(channels.getRecentProjects),
  forgetRecentProject: (root) => ipcRenderer.invoke(channels.forgetRecentProject, { root }),
  getOpenProject: () => ipcRenderer.invoke(channels.getOpenProject),
  openProject: (request) => ipcRenderer.invoke(channels.openProject, request),
  createProject: (details) => ipcRenderer.invoke(channels.createProject, details),
  changeContents: (change) => ipcRenderer.invoke(channels.changeContents, change),
  renameChapter: (file, title) => ipcRenderer.invoke(channels.renameChapter, { file, title }),
  renameChapterFile: (file, newName) => ipcRenderer.invoke(channels.renameChapterFile, { file, newName }),
  openChapter: (file) => ipcRenderer.invoke(channels.openChapter, { file }),
  saveChapter: (request) => ipcRenderer.invoke(channels.saveChapter, request),
  resolveConflict: (request) => ipcRenderer.invoke(channels.resolveConflict, request),
  leftOff: (request) => ipcRenderer.invoke(channels.leftOff, request),
  flushed: () => ipcRenderer.invoke(channels.flushed),
  onEvent: (listener) => {
    const forward = (_event: IpcRendererEvent, hostEvent: HostEvent): void => listener(hostEvent)
    ipcRenderer.on(eventChannel, forward)
    return () => ipcRenderer.removeListener(eventChannel, forward)
  },
}

contextBridge.exposeInMainWorld('plotDevice', api)
