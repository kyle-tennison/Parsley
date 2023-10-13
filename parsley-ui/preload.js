const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping'),
  readJson: () => ipcRenderer.invoke('readJson')
  // we can also expose variables, not just functions
})

// contextBridge.exposeInIsolatedWorld('util', {
//     
// })