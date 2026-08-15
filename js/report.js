const ReportModule = (function() {
    function init() {
        document.getElementById('reportGenerate').addEventListener('click', generateReport);
        document.getElementById('reportExportHTML').addEventListener('click', exportHTML);
        document.getElementById('reportPrint').addEventListener('click', () => window.print());
    }

    function generateReport() {
        const observations = document.getElementById('reportObservations').value;
        const file = AppState.currentFile;
        const hashResults = AppState.lastHash || {};
        const report = {
            dataAnaliza: new Date().toISOString(),
            fisier: file ? file.name : 'N/A',
            dimensiune: file ? formatBytes(file.size) : 'N/A',
            hash: hashResults,
            format: file ? file.type : 'N/A',
            rezolutie: AppState.currentImage ? `${AppState.currentImage.width}×${AppState.currentImage.height}` : 'N/A',
            metadata: AppState.lastMetadata || 'N/A',
            metode: 'Foto/Video, Hash, Histogram, ELA, OCR etc.',
            rezultate: 'Vezi secțiunile corespunzătoare',
            observatii: observations,
            limitari: 'Toate rezultatele sunt indicatori tehnici. Interpretarea aparține specialistului.'
        };
        AppState.reportData = report;
        const preview = document.getElementById('reportPreview');
        preview.innerHTML = `
            <h3>Raport de Analiză</h3>
            <table>
                <tr><td>Data analizei</td><td>${escapeHtml(report.dataAnaliza)}</td></tr>
                <tr><td>Fișier</td><td>${escapeHtml(report.fisier)}</td></tr>
                <tr><td>Dimensiune</td><td>${escapeHtml(report.dimensiune)}</td></tr>
                <tr><td>Format</td><td>${escapeHtml(report.format)}</td></tr>
                <tr><td>Rezoluție</td><td>${escapeHtml(report.rezolutie)}</td></tr>
                <tr><td>Hash SHA-256</td><td>${escapeHtml(report.hash['SHA-256'] || 'N/A')}</td></tr>
                <tr><td>Hash SHA-384</td><td>${escapeHtml(report.hash['SHA-384'] || 'N/A')}</td></tr>
                <tr><td>Hash SHA-512</td><td>${escapeHtml(report.hash['SHA-512'] || 'N/A')}</td></tr>
                <tr><td>Observații</td><td>${escapeHtml(report.observatii)}</td></tr>
            </table>
            <h4>Limitări și avertismente</h4>
            <p>${escapeHtml(report.limitari)}</p>
        `;
        addAuditEvent('report_generated', file ? file.name : 'N/A');
    }

    function exportHTML() {
        if (!AppState.reportData) generateReport();
        const report = AppState.reportData;
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Raport</title></head><body>
            <h1>Raport de Analiză</h1>
            <p>Data: ${escapeHtml(report.dataAnaliza)}</p>
            <p>Fișier: ${escapeHtml(report.fisier)}</p>
            <p>Dimensiune: ${escapeHtml(report.dimensiune)}</p>
            <p>Hash: ${escapeHtml(JSON.stringify(report.hash))}</p>
            <p>Observații: ${escapeHtml(report.observatii)}</p>
            <p>Limitări: ${escapeHtml(report.limitari)}</p>
        </body></html>`;
        downloadBlob(new Blob([html], {type: 'text/html'}), 'raport-analiza.html');
    }

    return { init, generateReport };
})();