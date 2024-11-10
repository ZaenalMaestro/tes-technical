const input = document.getElementById('file')
const btnSubmit = document.getElementById('btn-submit')
const btnDownload = document.getElementById('download-file')
const overlay = document.querySelector('.overlay')
const popUp = document.querySelector('.pop-up')
const btnClose = document.querySelector('.close')

btnClose.addEventListener('click', () => popUpToggle())

btnSubmit.addEventListener('click', async () => {
    btnSubmit.disabled = true
    file = input.files[0]
    const formData = new FormData();
    formData.append('files', file);

    let response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData
    })

    if (response.status !== 200) {
        btnSubmit.disabled = false
        return alert('tidak dapat submit file')
    }

    response = await response.json()
    
    const dataBuffer = response.buffer.data;
    const fileName = response.fileName;
    pdfResult(dataBuffer, fileName)

    btnSubmit.disabled = false

})

function pdfResult(dataBuffer, fileName) {
    const dataBlob = new Blob([new Uint8Array(dataBuffer).buffer])
    const url = window.URL.createObjectURL(dataBlob);
    btnDownload.href = url;
    btnDownload.setAttribute('download', fileName);

    popUpToggle()
}

function popUpToggle() {
    overlay.classList.toggle('active')
    popUp.classList.toggle('active')
}
