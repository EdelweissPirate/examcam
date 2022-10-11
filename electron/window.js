const { BrowserWindow } = require('electron')
const path = require('path')

let windows = new Set();

let mainWindow
let childWindow

function create() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        frame: false,
        width: 500,
        height: 500,
        resizable: false,
        icon: path.join(__dirname, '/../assets/icon.ico'),
        show: false,
        title: 'Exam Cam',
        webPreferences: {
            preload: path.join(__dirname, '/preload.js'),
            devTools: false
        }
    })

    // and load the index.html of the app.
    mainWindow.loadFile('electron/pages/index.html')

    windows.add(mainWindow)

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        mainWindow.focus()
    })

    mainWindow.on('closed', async () => {
        windows.delete(mainWindow)
    })

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    return mainWindow
}

async function get(){
    return mainWindow
}

function createChild(htmlURL){
    // Create the browser window.
    childWindow = new BrowserWindow({
        show: false,
        parent: mainWindow,
        modal: true,
        frame: false,
        width: 500,
        height: 500,
        resizable: false,
        icon: path.join(__dirname, '/../assets/icon.ico'),
        show: false,
        title: 'Exam Cam - Save Wizard',
        webPreferences: {
            preload: path.join(__dirname, '/preload.js'),
            devTools: false
        }
    })

    // and load the index.html of the app.
    childWindow.loadFile(htmlURL)
    // mainWindow.loadFile(htmlURL)

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    windows.add(childWindow)

    childWindow.once('ready-to-show', () => {
        childWindow.show()
        childWindow.focus()
    })

    childWindow.on('closed', async () => {
        windows.delete(childWindow)
    })

    return childWindow
}

async function getChild(){
    return childWindow
}

async function getWindows(){
    return windows
}

module.exports = {create, get, createChild, getChild, getWindows}