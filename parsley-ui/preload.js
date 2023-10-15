// Parsley 2023
// Kyle Tennison

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  readConfig: () => ipcRenderer.invoke("readConfig"),
  writeConfig: (config) => ipcRenderer.invoke("writeConfig", config),
  openConfig: () => ipcRenderer.invoke("openConfig"),
  runParse: () => ipcRenderer.invoke("runParse"),
  setRoot: () => ipcRenderer.invoke("setRoot"),
  getRoot: () => ipcRenderer.invoke("getRoot"),
  exit: (hard=false) => ipcRenderer.invoke("exit", hard),
  minimize: () => ipcRenderer.invoke("minimize"),
  openExternal: (link) => ipcRenderer.invoke("openExternal", link),
  
  on: (signal, data) => ipcRenderer.on(signal, data),
});
