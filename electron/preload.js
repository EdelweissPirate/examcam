// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer, contextBridge } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  
})

contextBridge.exposeInMainWorld("api", {
  get: async (channel, arg) => {
    // whitelist channels  
    let validChannels = [
      "start-rec",
      "select-dir",
      "set-filename",
      "save-video",
      "close-window",
      "min-window",
      "app-version",
      "restart-app",
      "send-note",
      "close-wizard-window",
      "close-warning",
      "update-progress",
      "finish-save",
      "process-video"
    ];
    
      if (validChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, arg)
      }
  }  
});
