// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  vault: {
    exists: () => ipcRenderer.invoke('vault:exists'),
    read: () => ipcRenderer.invoke('vault:read'),
    write: (data) => ipcRenderer.invoke('vault:write', data),
  },
});
