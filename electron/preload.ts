// Minimal preload - the app uses standard Web APIs for file handling
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
