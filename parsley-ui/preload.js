const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  readConfig: () => ipcRenderer.invoke("readConfig"),
  writeConfig: (config) => ipcRenderer.invoke("writeConfig", config),
  openConfig: () => ipcRenderer.invoke("openConfig"),
  runParse: () => ipcRenderer.invoke("runParse"),
  setRoot: () => ipcRenderer.invoke("setRoot"),
  getRoot: () => ipcRenderer.invoke("getRoot"),
});
