const { app, dialog, Notification, shell } = require('electron')
const appWindow = require('./window')
const { autoUpdater } = require('electron-updater')

const fs = require('fs-extra')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')

const Store = require('electron-store')
const store = new Store();

let mainWindow = appWindow.get()
let childWindow

let outputFilepath = store.get('outputFilepath')
let outputFilename = store.get('outputFilename')

let vidCount = 0
let saveProgress = {
    status: 'Processing video..',
    percent: 0,
    duration: 0,
}

autoUpdater.on('update-available', () => {
    // mainWindow.webContents.send('update_available');
    showNotification('ExamCam Update Manager', 'Update available. Downloading...')
});

autoUpdater.on('update-downloaded', () => {
    // mainWindow.webContents.send('update_downloaded');
    dialog.showMessageBox(mainWindow, {
        'type': 'question',
        'title': 'ExamCam v'+app.getVersion(),
        'message': "Update downloaded. Update will be applied on app restart. Restart app now?",
        'buttons': [
            'Yes',
            'No'
        ]
    })
    .then((result) => {
        if (result.response !== 0) { return 'done' }

        if (result.response === 0) {
            // app.relaunch()
            // app.exit()
            autoUpdater.quitAndInstall();
        }

        return 'done.'
    })
    .catch((err) => {
        return err
    })
});

global.share.ipcMain.handle('start-rec', async (event) => {
    store.clear()
    console.log(app.getPath('temp'))
})

global.share.ipcMain.handle('process-video', async (event, arg) => {
    const pathTempFiles = app.getPath('temp')

    const buffer = Buffer.from(arg.input)

    vidCount = arg.num

    const vidName = 'vidTemp.mp4'
    await fs.outputFile(`${pathTempFiles}/tmp-examcam/${vidName}`, buffer)

    const videoFPSProcessed = await convertVideoFramerate(`${pathTempFiles}/tmp-examcam/${vidName}`, pathTempFiles)

    return videoFPSProcessed
})

global.share.ipcMain.handle('select-dir', async (event) => {
    try {
        const oFP = await setOutputFilepath()

        if(oFP){
            childWindow = appWindow.createChild('electron/pages/form.html')
            return true
        } else {
            return false
        }
    } catch (error) {
        showNotification('Error', 'Failed to set output settings.')
        return false
    }
})

global.share.ipcMain.handle('set-filename', async (event, arg) => {
    try {
        const nameSet = setOutputFilename({courseID: arg[0], field: arg[1], category: arg[2]})
        return nameSet
    } catch (error) {
        showNotification('Error', 'Failed to set output filename.')
        return false
    }
})

global.share.ipcMain.handle('update-progress', async (event) => {
    return saveProgress
})

global.share.ipcMain.handle('save-video', async (event, arg) => {
    mainWindow = await appWindow.get()

    mainWindow.loadFile('electron/pages/progress.html')

    const output = outputFilepath ? outputFilepath : app.getPath('desktop')
    
    const pathTempFiles = app.getPath('temp')

    let output_name = `${output}/${outputFilename}.mp4`

    await close_wizard()

    let videoNames = []

    for(let i = 0; i <= vidCount; i++){
        if(fs.existsSync(`${pathTempFiles}/tmp-examcam/vid${i}.mp4`)){
            videoNames.push(`${pathTempFiles}/tmp-examcam/vid${i}.mp4`)
        }
    };

    let mergedVideo = ffmpeg()

    videoNames.forEach(function(videoName){
        mergedVideo = mergedVideo.addInput(videoName);
    });

    return new Promise(async (resolve, reject) => { 
        mergedVideo.mergeToFile(output_name, outputFilepath)
            .on('progress', progress => {
                mainWindow.setProgressBar((progress.percent <= 100 ? progress.percent/100 : 1))
                saveProgress.percent = progress.percent <= 100 ? progress.percent : 100
            })
            .on('end', function() {
                fs.remove(`${pathTempFiles}/tmp-examcam`)
                saveProgress.percent = 100
                resolve(true)
            })
            .on('error', function(err) {
                console.error('save error: ' + err)
                mainWindow.loadFile('electron/pages/index.html')
                showNotification('Error', 'Video save failed')
                reject(err)
            })
    })
})

global.share.ipcMain.handle('finish-save', async () => {
    const output = outputFilepath ? outputFilepath : app.getPath('desktop')

    dialog.showMessageBox(mainWindow, {
        'type': 'warning',
        'title': 'ExamCam v'+app.getVersion(),
        'message': "Please ensure the video file is uploaded to ShareFile using the link in the TMS.",
        'buttons': [
            'OK'
        ]
    })
    .then(async () => {
        dialog.showMessageBox(mainWindow, {
            'type': 'question',
            'title': 'ExamCam v'+app.getVersion(),
            'message': "Video saved. Go to folder?",
            'buttons': [
                'Yes',
                'No'
            ]
        })
        .then((result) => {
            mainWindow.loadFile('electron/pages/index.html')

            if (result.response !== 0) { return 'done' }

            if (result.response === 0) {
                const out = outputFilepath ? `${outputFilepath}` : `${output}`
                shell.openPath(out)
            }

            return 'done.'
        })
        .catch((err) => {
            return err
        })
    })
    .catch((err) => {
        return err
    })
})

global.share.ipcMain.handle('close-window', async () => {
    const pathTempFiles = app.getPath('temp')

    if(fs.existsSync(`${pathTempFiles}/tmp-examcam`)){
        await fs.remove(`${pathTempFiles}/tmp-examcam`)
    }

    mainWindow = await appWindow.get()
    mainWindow.close();
    app.quit()
})

global.share.ipcMain.handle('close-wizard-window', async () => {
    close_wizard()
})

global.share.ipcMain.handle('min-window', async () => {
    mainWindow = await appWindow.get()
    mainWindow.minimize()
})

global.share.ipcMain.handle('close-warning', async () => {
    mainWindow = await appWindow.get()

    const result = await dialog.showMessageBox(mainWindow, {
        'type': 'question',
        'title': 'ExamCam Warning',
        'message': "Closing window will lose video. Proceed?",
        'buttons': [
            'OK',
            'Cancel'
        ]
    })
    .then((result) => {
        if(result.response !== 0) { 
            return false 
        }

        if(result.response === 0) {
            return true
        }
    })
    .catch((err) => {
        return false
    })

    return result
})

global.share.ipcMain.handle('send-note', async (event, arg) => {
    showNotification(arg.title, arg.body)
})

//====== functions
const convertVideoFramerate = async (vid, pathTempFiles) => {
    return new Promise((resolve, reject) => { 
        try {
            ffmpeg()
                .addInput(vid)
                .videoCodec('libx264')
                .format('mp4')
                .noAudio()
                .outputOptions('-pix_fmt yuv420p')
                .fps(30)
                .on('end', () => {
                    return resolve('done.')
                })
                .save(`${pathTempFiles}/tmp-examcam/vid${vidCount}.mp4`)  
                .run()

        } catch (error) {
            console.log('Error: ', error)
            mainWindow.loadFile('electron/pages/index.html')
            return reject(error)
        }
    })
}

const mergeVideos = async (videoNames, outputName, outputPath) => {
    try {
        let mergedVideo = ffmpeg()

        videoNames.forEach(function(videoName){
            mergedVideo = mergedVideo.addInput(videoName);
        });

        mergedVideo.mergeToFile(outputName, outputPath)

        return true

    } catch (error) {
        console.log('Error: ', error)
        mainWindow.loadFile('electron/pages/index.html')
        return false
    }
}

function showNotification(_title, _body) {
    new Notification({ 
        title: _title, 
        body: _body ,
        icon: path.join(__dirname, '/../assets/icon.ico'),
    }).show()
}

async function setOutputFilepath() {
    mainWindow = await appWindow.get()

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    })

    if(result.filePaths[0]){
        store.set('outputFilepath', result.filePaths[0])
        outputFilepath = await store.get('outputFilepath')
        return true
    } else {
        showNotification('Settings', 'No output filepath set.')
        return false
    }
}

async function setOutputFilename(data){
    try {
        let courseID = data.courseID.replace(/\s/g,'').replace(/[^A-Za-z0-9]/g, '')
        let field = data.field.replace(/\s/g,'').replace(/[^A-Za-z0-9]/g, '')
        let category = data.category.replace(/\s/g,'').replace(/[^A-Za-z0-9]/g, '')

        store.set('outputFilename', courseID + '_' + field + '_' + category)
        outputFilename = await store.get('outputFilename')

        return true
    } catch (error) {
        
    }
}

const close_wizard = async () => {
    childWindow = await appWindow.getChild()
    mainWindow = await appWindow.get()

    childWindow.close()

    mainWindow.show()
    mainWindow.focus()
}

//====== Update stuff
global.share.ipcMain.handle('app-version', (event) => {
    return app.getVersion()
});

global.share.ipcMain.handle('restart-app', () => {
    autoUpdater.quitAndInstall();
});