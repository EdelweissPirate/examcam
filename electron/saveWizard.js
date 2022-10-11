const save_form = document.querySelector("#form-save-wizard")
const courseID_form = document.querySelector("#courseID_form")
const courseField_form = document.querySelector("#courseField_form")
const courseCategory_form = document.querySelector('#courseCategory_form')
const submit_button = document.querySelector('#submit-save-wizard')

let inputs = [courseID_form, courseField_form, courseCategory_form]
let outputs = []

inputs.map((item, i) => {
    item.addEventListener('change', (e) => {
        e.preventDefault()
        outputs[i] = e.target.value
    })
})

save_form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if(outputs.length === 3){
        //set filename
        await window.api.get('set-filename', outputs)

        // save video
        await window.api.get('save-video', {path: 'temp.mp4'})
    }
})


