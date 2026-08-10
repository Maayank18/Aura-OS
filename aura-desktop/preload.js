const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemState: () => ipcRenderer.invoke('get-system-state'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', { dx, dy }),
  onGlobalHotkey: (callback) => {
    ipcRenderer.removeAllListeners('global-hotkey');
    ipcRenderer.on('global-hotkey', (_event, action) => callback(action));
  }
});
