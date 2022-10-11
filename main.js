// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const appWindow = require('./electron/window')
// const { autoUpdater } = require('electron-updater')
// autoUpdater.autoDownload = true;

const os = require('os');

var ffmpeg = require('fluent-ffmpeg');

global.share = { ipcMain }
const isWin = os.platform() == 'win32';

let mainWindow

app.whenReady().then(() => {
    mainWindow = appWindow.create()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) mainWindow = appWindow.create()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

//=======Package ffmpeg
//Get the paths to the packaged versions of the binaries we want to use
const ffmpegPath = require('ffmpeg-static').replace(
    'app.asar',
    'app.asar.unpacked'
);
const ffprobePath = require('ffprobe-static').path.replace(
    'app.asar',
    'app.asar.unpacked'
);

//tell the ffmpeg package where it can find the needed binaries.
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

if (isWin) {
    app.setAppUserModelId(`ExamCam v${app.getVersion()}`);
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
require('./electron/ipc');