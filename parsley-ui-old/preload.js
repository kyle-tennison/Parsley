const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping'),
  readConfig: () => ipcRenderer.invoke('readConfig'),
  writeConfig: (object) => ipcRenderer.invoke('writeConfig', object)
  // we can also expose variables, not just functions
})

// contextBridge.exposeInIsolatedWorld('util', {
//     
// })