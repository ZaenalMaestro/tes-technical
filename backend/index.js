import PDFParser from "pdf2json";
import http from 'http'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from "path";
import { jsPDF } from "jspdf";

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');

    if (req.method === 'POST' && req.url === '/upload') {
        try {
            const file = await getRequestFile(req)
            await storeRequestFile(file)
            const dataExtracted = await getExtractedFile(file.name)
            saveToPDF(file.name, dataExtracted)

            const dataBuffer = await readFile(`./document/${file.name}`)

            const responses = {
                message: 'file upload successfully',
                buffer: dataBuffer.toJSON(),
                fileName: file.name
            }

            await removeFile(`./document/${file.name}`)
            return setResponse(res, 200, responses)
        } catch (err) {
            return setResponse(res, 400, { error: err.message })
        }
    }
    return setResponse(res, 200, { message: 'Node Js Extract pdf' })
})

server.listen(3000, () => console.info('server run on http://localhost:3000'))

async function getRequestFile(req) {
    const form = formidable({}),
        [fields, files] = await form.parse(req),
        filename = files.files[0].originalFilename

    return {
        filePath: files.files[0].filepath,
        name: generateFilename(filename)
    }
}

function setResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });

    return res.end(JSON.stringify(data, null, 2));
}

async function getExtractedFile(filename) {
    return new Promise((resolve, rejects) => {
        const pdfParser = new PDFParser(this, 1);

        pdfParser.on("pdfParser_dataError", rejects);

        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            let textContent = pdfParser.getRawTextContent()
            textContent = dataPreProcessing(textContent)
            textContent = formatText(textContent)

            resolve(textContent)
        });

        const pdfPath = path.join('./document', filename)
        pdfParser.loadPDF(pdfPath);

    })


}

function dataPreProcessing(textContent) {
    textContent = splitText(textContent)
    const data = {}

    const dataH1 = getTextFrom(textContent, ['H.1'])
    data.h1 = removeAllSpace(dataH1)

    data.h2 = getTextFrom(textContent, ['H.2'])

    const dataA1 = getTextFrom(textContent, ['A.1'])
    data.a1 = removeAllSpace(dataA1)

    data.a4 = getTextFrom(textContent, ['A.4'])

    const dataB1 = getTextByIndex(textContent, ['B.1 '], 1)
    data.b1 = getWord(1, dataB1)
    data.b12 = getTextFrom(textContent, ['B.12'])
    const dataC1 = getTextByIndex(textContent, ['C.6'], 2)
    data.c1 = removeAllSpace(dataC1)
    data.c5 = getTextFrom(textContent, ['c.5', 'MARTINA YULIANTI'])

    return data
}

function formatText(textContent) {
    let content = ''
    content += `H1: ${textContent.h1}\n`
    content += `H2: ${textContent.h2}\n`
    content += `A1: ${textContent.a1}   -   A4 : ${textContent.a4}\n`
    content += `B1: ${textContent.b1}   -   B12: ${textContent.b12}\n`
    content += `C1: ${textContent.c1}   -   C5: ${textContent.c5}`

    return content
}

function removeUnimportant(text) {
    const wordsToRemove = [
        'KEMENTERIAN KEUANGAN RI',
        'DIREKTORAT JENDERAL PAJAK',
        'BUKTI PEMOTONGAN PAJAK PENGHASILAN PASAL 21',
        'FINAL/TIDAK FINAL ',
        'A. IDENTITAS PENERIMA PENGHASILAN YANG DIPOTONG ',
        'B. PPh PASAL 21 YANG DIPOTONG ',
        'MASA PAJAK (mm-yyyy)',
        'X',
        'Final',
        'Tidak Final',
        'h.1',
        'h.2',
        'h.3',
        'h.5',
        'a.1',
        'pembatalan',
        '11.3',
        '11.4',
        'DASAR PENGENAAN PAJAK',
        'V2TX6XJG',
        'nomor',
        'npwp',
    ]

    const regex = new RegExp(wordsToRemove.join('|'), 'gi')
    return text.replace(regex, '').replace(/\s+/g, ' ')
}

function splitText(texts) {
    texts = texts.split('\n')


    return texts
}

function getTextByIndex(texts, keyword, nextIndex) {
    const regex = new RegExp(keyword.join('|'), 'i');

    let currentIndex = 0
    texts.map((text, index) => {
        if (regex.test(text) === true) {
            currentIndex = index + nextIndex
        }
    })
    let result = texts[currentIndex];
    result = result.replace(/\r/g, '');

    return result
}



function getTextFrom(texts, rules) {
    const regex = new RegExp(rules.join('|'), 'i');

    texts = texts.filter((text) => {
        return regex.test(text) === true
    })

    let text = texts[0]
    if (text === undefined) {
        return 'data empty'
    }


    text = removeUnimportant(text)
    text = text.trim()
    text = removeAllSymbol(text)

    return text
}

function removeAllSymbol(texts) {
    return texts.replace(/[^a-zA-Z0-9-.\s-]/g, ' ');
}
function removeAllSpace(text) {
    return text.replace(/\s/g, "");
}

function getWord(number, text) {
    const index = number - 1
    return text.substring(index, text.indexOf(' '));
}

async function storeRequestFile({ name, filePath }) {
    const content = await readFile(filePath),
        destination = path.join('./document', name)

    await fs.writeFile(destination, content);
}

function saveToPDF(fileName, dataExtracted) {
    const doc = new jsPDF();

    doc.text(dataExtracted, 10, 10);
    doc.save(`./document/${fileName}`);
}

async function readFile(filePath) {
    return await fs.readFile(filePath)
}

async function removeFile(filepath) {
    await fs.unlink(filepath)
}

function generateFilename(filename) {
    filename = filename.replace(' ', '')

    const now = new Date();
    const timeInMilliseconds = now.getTime();
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    return `${timeInMilliseconds}-${randomNumber}-${filename}`;
}
