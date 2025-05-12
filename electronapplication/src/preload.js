// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    // Invoke method for asynchronous calls from the renderer process
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),

    // On method for receiving messages from the main process
    on: (channel, callback) => ipcRenderer.on(channel, callback),

    // Remove listener for cleanup
    removeListener: (channel, callback) =>
      ipcRenderer.removeListener(channel, callback),
  },
});
