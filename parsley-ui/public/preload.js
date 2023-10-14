const { contextBridge } = require('electron');
const { isMac, isWindows } = require('./detect-platform');

contextBridge.exposeInMainWorld('electron', {
  // ...other APIs to expose to renderer process
  isMac,
  isWindows,
});