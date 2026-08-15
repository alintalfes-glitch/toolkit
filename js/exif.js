const ExifModule = (function() {
    function init() {
        document.getElementById('startAnalysisBtn').addEventListener('click', () => {
            if (AppState.currentFile) extractMetadata(AppState.currentFile);
        });
    }

    async function extractMetadata(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Metadata EXIF disponibilă doar pentru imagini');
            return;
        }
        showLoading('Extragere metadata...');
        try {
            const exif = await exifr.parse(file, {tiff: true, exif: true, gps: true, interop: true, jfif: true, xmp: true});
            const available = [];
            const unavailable = [];
            const keys = {
                Make: 'Producător',
                Model: 'Model',
                Software: 'Software',
                DateTimeOriginal: 'Data/Ora originală',
                OffsetTimeOriginal: 'Timezone',
                GPSLatitude: 'Latitudine GPS',
                GPSLongitude: 'Longitudine GPS',
                FocalLength: 'Distanță focală',
                ISO: 'ISO',
                FNumber: 'Aperture',
                ExposureTime: 'Timp expunere',
                Orientation: 'Orientare',
                ImageWidth: 'Lățime imagine',
                ImageHeight: 'Înălțime imagine',
                ColorSpace: 'Spațiu culoare'
            };
            for (const [key, label] of Object.entries(keys)) {
                if (exif && exif[key] !== undefined && exif[key] !== null && exif[key] !== '') {
                    let value = exif[key];
                    if (key === 'GPSLatitude' || key === 'GPSLongitude') {
                        value = Array.isArray(value) ? value.join('° ') + '"' : value;
                    }
                    available.push({label, value});
                } else {
                    unavailable.push(label);
                }
            }
            renderMetadata(available, unavailable);
            if (exif && exif.GPSLatitude && exif.GPSLongitude) {
                renderGPS(exif.GPSLatitude, exif.GPSLongitude);
            } else {
                document.getElementById('gpsSection').innerHTML = '';
            }
            addAuditEvent('metadata_extracted', file.name);
        } catch (err) {
            showToast('Eroare la citirea metadata: ' + err.message);
            document.getElementById('metadataAvailable').innerHTML = '<p>Eroare la citire.</p>';
            document.getElementById('metadataUnavailable').innerHTML = '';
        } finally {
            hideLoading();
        }
    }

    function renderMetadata(available, unavailable) {
        const availDiv = document.getElementById('metadataAvailable');
        const unavailDiv = document.getElementById('metadataUnavailable');
        availDiv.innerHTML = '<h3>Metadata disponibilă</h3>';
        if (available.length === 0) {
            availDiv.innerHTML += '<p>Nicio metadata disponibilă.</p>';
        } else {
            availDiv.innerHTML += '<table><tr><th>Câmp</th><th>Valoare</th></tr>' +
                available.map(a => `<tr><td>${escapeHtml(a.label)}</td><td>${escapeHtml(String(a.value))}</td></tr>`).join('') +
                '</table>';
        }
        unavailDiv.innerHTML = '<h3>Metadata indisponibilă</h3>';
        if (unavailable.length === 0) {
            unavailDiv.innerHTML += '<p>Toate câmpurile disponibile.</p>';
        } else {
            unavailDiv.innerHTML += '<ul>' + unavailable.map(u => `<li>${escapeHtml(u)}</li>`).join('') + '</ul>';
        }
    }

    function renderGPS(lat, lon) {
        const div = document.getElementById('gpsSection');
        div.innerHTML = `
            <h3>Coordonate GPS</h3>
            <p>Lat: ${escapeHtml(String(lat))}</p>
            <p>Lon: ${escapeHtml(String(lon))}</p>
            <button class="btn" id="copyGPS">Copiază</button>
            <button class="btn" id="convertDMS">Conversie DD ↔ DMS</button>
            <div id="dmsResult"></div>
        `;
        document.getElementById('copyGPS').addEventListener('click', () => {
            navigator.clipboard.writeText(`${lat}, ${lon}`).then(() => showToast('Coordonate copiate'));
        });
        document.getElementById('convertDMS').addEventListener('click', () => {
            const dmsLat = toDMS(lat);
            const dmsLon = toDMS(lon);
            document.getElementById('dmsResult').innerHTML = `
                <p>DMS Lat: ${escapeHtml(dmsLat)}</p>
                <p>DMS Lon: ${escapeHtml(dmsLon)}</p>
            `;
        });
    }

    function toDMS(coord) {
        const abs = Math.abs(coord);
        const degrees = Math.floor(abs);
        const minutesFloat = (abs - degrees) * 60;
        const minutes = Math.floor(minutesFloat);
        const seconds = Math.round((minutesFloat - minutes) * 60);
        const direction = coord >= 0 ? 'N' : 'S';
        return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
    }

    return { init, extractMetadata };
})();