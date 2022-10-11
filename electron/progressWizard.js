const progress_green = document.querySelector('#progress-green')
const progress_status = document.querySelector('#progress-status')

const updateInterval = setInterval(async () => {
    const progress = await window.api.get('update-progress')
    progress_green.style.width = progress.percent + '%'

    progress_status.innerHTML = progress.status

    if(progress.percent === 100){
        const end = await window.api.get('finish-save')
        clearInterval(updateInterval)
    }
}, 10)