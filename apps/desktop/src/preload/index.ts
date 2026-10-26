import type { HostEvent, PlotDeviceApi } from '@plotdevice/contracts'
import { channels, eventChannel } from '@plotdevice/contracts/channels'
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

// The only bridge between the sandboxed page and the host: typed calls and one event stream, nothing else.
const api: PlotDeviceApi = {
  getAppInfo: () => ipcRenderer.invoke(channels.getAppInfo),
  getAbout: () => ipcRenderer.invoke(channels.getAbout),
  getPreferences: () => ipcRenderer.invoke(channels.getPreferences),
  setPreferences: (patch) => ipcRenderer.invoke(channels.setPreferences, patch),
  getRecentProjects: () => ipcRenderer.invoke(channels.getRecentProjects),
  forgetRecentProject: (root) => ipcRenderer.invoke(channels.forgetRecentProject, { root }),
  getOpenProject: () => ipcRenderer.invoke(channels.getOpenProject),
  openProject: (request) => ipcRenderer.invoke(channels.openProject, request),
  createProject: (details) => ipcRenderer.invoke(channels.createProject, details),
  changeContents: (change) => ipcRenderer.invoke(channels.changeContents, change),
  compileBook: () => ipcRenderer.invoke(channels.compileBook),
  renameChapter: (file, title) => ipcRenderer.invoke(channels.renameChapter, { file, title }),
  renameChapterFile: (file, newName) => ipcRenderer.invoke(channels.renameChapterFile, { file, newName }),
  openChapter: (file) => ipcRenderer.invoke(channels.openChapter, { file }),
  saveChapter: (request) => ipcRenderer.invoke(channels.saveChapter, request),
  resolveConflict: (request) => ipcRenderer.invoke(channels.resolveConflict, request),
  leftOff: (request) => ipcRenderer.invoke(channels.leftOff, request),
  flushed: () => ipcRenderer.invoke(channels.flushed),
  listOutlines: () => ipcRenderer.invoke(channels.listOutlines),
  createOutline: (title, about) => ipcRenderer.invoke(channels.createOutline, about ? { title, about } : { title }),
  openOutline: (file) => ipcRenderer.invoke(channels.openOutline, { file }),
  editOutline: (file, edit) => ipcRenderer.invoke(channels.editOutline, { file, edit }),
  undoOutline: (file) => ipcRenderer.invoke(channels.undoOutline, { file }),
  rememberPlace: (place) => ipcRenderer.invoke(channels.rememberPlace, place),
  listReferences: () => ipcRenderer.invoke(channels.listReferences),
  readReference: (file) => ipcRenderer.invoke(channels.readReference, { file }),
  createReference: (kind, title) => ipcRenderer.invoke(channels.createReference, { kind, title }),
  renameReference: (file, title) => ipcRenderer.invoke(channels.renameReference, { file, title }),
  renameReferenceFile: (file, newName) => ipcRenderer.invoke(channels.renameReferenceFile, { file, newName }),
  cardsAbout: (chapter) => ipcRenderer.invoke(channels.cardsAbout, { file: chapter }),
  editRelationship: (file, change) => ipcRenderer.invoke(channels.editRelationship, { file, change }),
  linkedFrom: (file) => ipcRenderer.invoke(channels.linkedFrom, { file }),
  getShelf: () => ipcRenderer.invoke(channels.getShelf),
  setShelf: (files) => ipcRenderer.invoke(channels.setShelf, { files }),
  listVersions: (file) => ipcRenderer.invoke(channels.listVersions, { file }),
  readVersion: (file, at) => ipcRenderer.invoke(channels.readVersion, { file, at }),
  restoreVersion: (file, at, revision) => ipcRenderer.invoke(channels.restoreVersion, { file, at, revision }),
  copyVersion: (file, at) => ipcRenderer.invoke(channels.copyVersion, { file, at }),
  onEvent: (listener) => {
    const forward = (_event: IpcRendererEvent, hostEvent: HostEvent): void => listener(hostEvent)
    ipcRenderer.on(eventChannel, forward)
    return () => ipcRenderer.removeListener(eventChannel, forward)
  },
}

contextBridge.exposeInMainWorld('plotDevice', api)
