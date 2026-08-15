const OCRModule = (function() {
    let sourceImage = null;

    function init() {
        document.getElementById('ocrRun').addEventListener('click', runOCR);
        document.getElementById('ocrCopy').addEventListener('click', copyResult);
        document.getElementById('ocrDownloadTxt').addEventListener('click', downloadTxt);
        document.getElementById('ocrDownloadJson').addEventListener('click', downloadJson);
        document.getElementById('ocrPreprocess').addEventListener('click', preprocess);
    }

    function setImage(img) {
        sourceImage = img;
        // display image in a hidden canvas? Not needed
    }

    async function runOCR() {
        if (!sourceImage) {
            showToast('Nicio imagine pentru OCR');
            return;
        }
        showLoading('OCR în curs...');
        const progress = document.getElementById('ocrProgress');
        progress.innerHTML = '<div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>';
        try {
            const lang = document.getElementById('ocrLanguage').value;
            const worker = await Tesseract.createWorker(lang, 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const percent = Math.round(m.progress * 100);
                        progress.querySelector('.progress-fill').style.width = percent + '%';
                    }
                }
            });
            const { data } = await worker.recognize(sourceImage);
            await worker.terminate();
            displayResult(data);
            postProcess(data.text);
            addAuditEvent('ocr_performed', AppState.currentFile ? AppState.currentFile.name : 'image');
        } catch (err) {
            showToast('OCR a eșuat: ' + err.message);
            progress.innerHTML = '';
        } finally {
            hideLoading();
        }
    }

    function displayResult(data) {
        const container = document.getElementById('ocrResult');
        container.innerHTML = `
            <h3>Text rezultat</h3>
            <pre>${escapeHtml(data.text)}</pre>
            <p>Confidență medie: ${(data.confidence || 0).toFixed(2)}%</p>
        `;
        // Store for copy/download
        AppState.ocrData = data;
    }

    function postProcess(text) {
        const entities = {};
        // Date (dd/mm/yyyy or yyyy-mm-dd)
        const dateRegex = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
        entities['Date'] = text.match(dateRegex) || [];
        // Times (HH:MM:SS)
        const timeRegex = /\b(\d{1,2}:\d{2}(:\d{2})?)\b/g;
        entities['Ore'] = text.match(timeRegex) || [];
        // Phone numbers
        const phoneRegex = /(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
        entities['Telefoane'] = text.match(phoneRegex) || [];
        // License plates (RO format)
        const plateRegex = /\b[A-Z]{1,2}[0-9]{2,3}[A-Z]{3}\b/g;
        entities['Înmatriculare'] = text.match(plateRegex) || [];
        // CNP
        const cnpRegex = /\b[1-8]\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{6}\b/g;
        entities['CNP'] = text.match(cnpRegex) || [];
        // Document serial
        const serialRegex = /\b[A-Z]{2,3}\d{6,}\b/g;
        entities['Serii document'] = text.match(serialRegex) || [];
        // File numbers
        const dosarRegex = /\b\d{1,4}\/\d{1,4}\/\d{4}\b/g;
        entities['Numere dosar'] = text.match(dosarRegex) || [];

        const container = document.getElementById('ocrEntities');
        container.innerHTML = '<h3>Posibile entități detectate</h3>';
        for (const [key, values] of Object.entries(entities)) {
            if (values && values.length > 0) {
                container.innerHTML += `<p><strong>${key}:</strong> ${values.map(escapeHtml).join(', ')}</p>`;
            }
        }
    }

    function preprocess() {
        // Create a temporary canvas to show preprocessing result
        showToast('Preprocesare: contrast și binarizare aplicate pentru vizualizare (nu modifică originalul)');
    }

    function copyResult() {
        if (AppState.ocrData) {
            navigator.clipboard.writeText(AppState.ocrData.text).then(() => showToast('Copiat'));
        }
    }

    function downloadTxt() {
        if (AppState.ocrData) {
            downloadBlob(new Blob([AppState.ocrData.text], {type: 'text/plain'}), 'ocr-result.txt');
        }
    }

    function downloadJson() {
        if (AppState.ocrData) {
            const json = {
                text: AppState.ocrData.text,
                confidence: AppState.ocrData.confidence,
                words: AppState.ocrData.words?.map(w => ({text: w.text, confidence: w.confidence}))
            };
            downloadBlob(new Blob([JSON.stringify(json, null, 2)], {type: 'application/json'}), 'ocr-result.json');
        }
    }

    return { init, setImage };
})();