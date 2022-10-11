// // This file is required by the index.html file and will
// // be executed in the renderer process for that window.
// // No Node.js APIs are available in this process because
// // `nodeIntegration` is turned off. Use `preload.js` to
// // selectively enable features needed in the rendering
// // process.

const rec_button = document.querySelector("#start-record")
const stop_button = document.querySelector("#stop-record")
const close_button = document.querySelector('#close-window')
const min_button = document.querySelector('#min-window')

const video = document.querySelector('video')
const recordSVG = document.getElementById('record_svg')

let camera_stream = null
let media_recorder = null
let imageCapture = null
let recordInterval = null
let vidNum = 0
let blobFrames
let frameBlobs = []
let blobsBreak = 3500 // 1000 = one thousand fames; 3600 = one hour

function errorCallback(e) {
    console.log('Error', e)
}

rec_button.addEventListener('click', async function(e) {
    if(media_recorder?.state === 'recording'){
        if(media_recorder) media_recorder.stop();
        recordSVG.src = '../../assets/icons/circle.svg'
        rec_button.classList = 'btn-record'
        return
    }

    if(!media_recorder || media_recorder?.state === 'inactive'){
        media_recorder = null
        vidNum = 0

        media_recorder = new MediaRecorder(camera_stream, { mimeType: 'video/webm' });
        const track = camera_stream.getVideoTracks()[0];
        imageCapture = new ImageCapture(track);

        media_recorder.addEventListener('stop', function() {
            rec_button.style.background = "";
            rec_button.style.color = "";
        });

        media_recorder.start(1000);
        
        recordSVG.src = '../../assets/icons/circle-white.svg'
        
        rec_button.classList = 'btn-record-live'

        await window.api.get('start-rec')
        window.api.get('send-note', {title: 'Camera recording', body: 'Wave hello!'})

        takePhoto()

        recordInterval = setInterval(() => {
            takePhoto()
        }, 1000)
    }

    e.target.blur()
})

stop_button.addEventListener('click', async function() {
	if(media_recorder?.state === 'recording') {
        media_recorder.stop();
        clearInterval(recordInterval)

        recordSVG.src = '../../assets/icons/circle.svg'
        rec_button.classList = 'btn-record'

        await window.api.get('send-note', {title: 'Recording stopped', body: "Don't forget to save."})
        
        // save remaining frames
        blobFrames = await constructBlob()
        await processVideo(blobFrames)

        await window.api.get('select-dir')
    }
})

close_button.addEventListener('click', async (e) => {
    e.preventDefault()

    if(media_recorder?.state === 'recording') {
        const okToClose = await window.api.get('close-warning')
        
        console.log(okToClose)
        if(okToClose){
            await media_recorder.stop();
            setTimeout(async () => {
                await window.api.get('close-window')
            }, 500)
        }
    } else {
        await window.api.get('close-window')
    }
});

min_button.addEventListener('click', async () => {
    await window.api.get('min-window')
});

const start_camera = async () => {
    await navigator.getUserMedia({video: true, audio: true, frameRate: 1}, (localMediaStream) => {
        video.srcObject = localMediaStream
        video.autoplay = true
        video.muted = true
        camera_stream = localMediaStream

        rec_button.classList.remove('btn-disabled')
        stop_button.classList.remove('btn-disabled')
    }, (e) => {errorCallback(e)})
}

const takePhoto = async () => {
    imageCapture.takePhoto().then(async (blob) => {
        frameBlobs.push(blob)
        
        if(frameBlobs.length > blobsBreak){
            blobFrames = await constructBlob()
            await processVideo(blobFrames)
        }
    }).catch((error) => {
        errorCallback(error)
    });
}

const constructBlob = async () => {
    const blob = new Blob(frameBlobs, { type: 'video/webm' });
    frameBlobs = []
    return blob
}

const processVideo = async (blob) => {
    let reader = new FileReader()

    reader.onload = async function() {
        if(reader.readyState == 2) {
            await window.api.get('process-video', {num: vidNum, input: reader.result })
            
            // if(vidNum < 2){
                vidNum++
            // } else {
                // vidNum = 1
            // }
        }
    }

    reader.readAsArrayBuffer(blob)
}

const checkAppVersion = async () => {
    const version = document.getElementById('version');

    const versionVal = await window.api.get('app-version')
    console.log(versionVal)
    version.innerHTML = `v${versionVal}`
}

checkAppVersion()

start_camera()