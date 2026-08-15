const VideoModule = (function() {
    let video = null;
    let frameCanvas = null;
    let currentFile = null;
    let frameNumber = 0;
    let fps = 30;

    function init() {
        video = document.getElementById('videoPlayer');
        frameCanvas = document.getElementById('frameCanvas');
        document.getElementById('frameBackward').addEventListener('click', stepBackward);
        document.getElementById('frameForward').addEventListener('click', stepForward);
        document.getElementById('playbackSpeed').addEventListener('change', e => {
            video.playbackRate = parseFloat(e.target.value);
        });
        document.getElementById('extractFrameBtn').addEventListener('click', extractFrame);
        document.getElementById('exportFramePNG').addEventListener('click', () => exportFrame('png'));
        document.getElementById('exportFrameJPEG').addEventListener('click', () => exportFrame('jpeg'));
        document.getElementById('hashFrameBtn').addEventListener('click', hashFrame);
        document.getElementById('generateContactSheet').addEventListener('click', generateContactSheet);
        document.getElementById('exportContactSheet').addEventListener('click', exportContactSheet);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', updateTimestamp);
    }

    function loadFile(file) {
        if (!file.type.startsWith('video/')) {
            showToast('Fișierul nu este video');
            return;
        }
        currentFile = file;
        video.src = URL.createObjectURL(file);
        video.load();
        addAuditEvent('video_loaded', file.name);
    }

    function onLoadedMetadata() {
        fps = getFPS();
        const info = document.getElementById('videoInfo');
        const tracks = video.videoTracks || [];
        const audioTracks = video.audioTracks || [];
        info.innerHTML = `
            <p><strong>Durată:</strong> ${video.duration.toFixed(2)} s</p>
            <p><strong>Rezoluție:</strong> ${video.videoWidth} × ${video.videoHeight}</p>
            <p><strong>FPS:</strong> ${fps > 0 ? fps.toFixed(2) : 'Nedisponibil'}</p>
            <p><strong>Format:</strong> ${currentFile.type || 'Nedisponibil'}</p>
            <p><strong>Codec:</strong> ${getCodec() || 'Nedisponibil'}</p>
            <p><strong>Streams:</strong> Video: ${video.videoWidth ? '1' : '0'}, Audio: ${audioTracks.length || (video.mozHasAudio ? '1' : '0')}</p>
        `;
    }

    function getFPS() {
        if (video.webkitDecodedFrameCount && video.currentTime) {
            return video.webkitDecodedFrameCount / video.currentTime;
        }
        return 0;
    }

    function getCodec() {
        // Try to get from MSE if available
        if (video.getVideoPlaybackQuality) {
            return 'Nedisponibil';
        }
        return null;
    }

    function updateTimestamp() {
        const ts = formatTimestamp(video.currentTime);
        document.getElementById('videoTimestamp').textContent = ts;
        if (fps > 0) {
            frameNumber = Math.floor(video.currentTime * fps);
        }
    }

    function formatTimestamp(seconds) {
        const h = Math.floor(seconds/3600);
        const m = Math.floor((seconds%3600)/60);
        const s = Math.floor(seconds%60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
    }

    function stepForward() {
        if (fps > 0) {
            video.currentTime = Math.min(video.duration, video.currentTime + 1/fps);
        } else {
            video.currentTime += 0.04; // approx
        }
    }

    function stepBackward() {
        if (fps > 0) {
            video.currentTime = Math.max(0, video.currentTime - 1/fps);
        } else {
            video.currentTime -= 0.04;
        }
    }

    function extractFrame() {
        if (!video.videoWidth) {
            showToast('Video neîncărcat');
            return;
        }
        frameCanvas.width = video.videoWidth;
        frameCanvas.height = video.videoHeight;
        frameCanvas.getContext('2d').drawImage(video, 0, 0);
        const info = document.getElementById('extractedFrameInfo');
        info.innerHTML = `
            <p>Timestamp: ${formatTimestamp(video.currentTime)}</p>
            <p>Frame: ${frameNumber > 0 ? frameNumber : 'Nedisponibil'}</p>
            <p>Rezoluție: ${video.videoWidth} × ${video.videoHeight}</p>
        `;
        addAuditEvent('frame_extracted', currentFile ? currentFile.name : 'video');
    }

    async function exportFrame(type) {
        if (!frameCanvas.width) {
            extractFrame();
        }
        const mime = type === 'png' ? 'image/png' : 'image/jpeg';
        const ext = type === 'png' ? 'png' : 'jpg';
        try {
            const blob = await canvasToBlob(frameCanvas, mime, 0.92);
            downloadBlob(blob, `frame-${formatTimestamp(video.currentTime).replace(/[:.]/g,'-')}.${ext}`);
        } catch (err) {
            showToast('Export eșuat: ' + err.message);
        }
    }

    async function hashFrame() {
        if (!frameCanvas.width) {
            extractFrame();
        }
        try {
            const blob = await canvasToBlob(frameCanvas, 'image/png');
            const file = new File([blob], 'frame.png', {type: 'image/png'});
            const results = await HashModule.calculateHash(file);
            showModal(`<h3>Hash frame</h3><pre>${JSON.stringify(results, null, 2)}</pre>`);
            addAuditEvent('frame_hash_calculated', 'frame.png', results['SHA-256']);
        } catch (err) {
            showToast('Eroare hash: ' + err.message);
        }
    }

    async function generateContactSheet() {
        if (!video.videoWidth) {
            showToast('Video neîncărcat');
            return;
        }
        const count = parseInt(document.getElementById('contactSheetCount').value);
        const interval = parseFloat(document.getElementById('contactSheetInterval').value);
        if (interval <= 0) { showToast('Interval invalid'); return; }
        showLoading('Generare contact sheet...');
        const container = document.getElementById('contactSheetContainer');
        container.innerHTML = '';
        const thumbnails = [];
        for (let i = 0; i < count; i++) {
            const t = i * interval;
            if (t > video.duration) break;
            await seekTo(t);
            const c = document.createElement('canvas');
            c.width = 160;
            c.height = Math.round(160 * video.videoHeight / video.videoWidth);
            c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
            const img = document.createElement('img');
            img.src = c.toDataURL('image/jpeg', 0.8);
            const ts = formatTimestamp(t);
            thumbnails.push({ img, ts });
        }
        // Display
        thumbnails.forEach(({img, ts}) => {
            const div = document.createElement('div');
            div.className = 'contact-sheet-item';
            div.appendChild(img);
            const span = document.createElement('span');
            span.className = 'timestamp';
            span.textContent = ts;
            div.appendChild(span);
            container.appendChild(div);
        });
        hideLoading();
    }

    function seekTo(time) {
        return new Promise((resolve) => {
            video.currentTime = time;
            video.addEventListener('seeked', function handler() {
                video.removeEventListener('seeked', handler);
                resolve();
            });
        });
    }

    async function exportContactSheet() {
        const container = document.getElementById('contactSheetContainer');
        if (!container.children.length) return;
        try {
            const sheet = document.createElement('canvas');
            const cols = 4;
            const rows = Math.ceil(container.children.length / cols);
            const cellW = 200, cellH = 150;
            sheet.width = cols * cellW;
            sheet.height = rows * (cellH + 20);
            const ctx = sheet.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0,0,sheet.width,sheet.height);
            Array.from(container.children).forEach((div, i) => {
                const img = div.querySelector('img');
                const ts = div.querySelector('.timestamp').textContent;
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = col * cellW;
                const y = row * (cellH + 20);
                ctx.drawImage(img, x, y, cellW, cellH);
                ctx.fillStyle = '#fff';
                ctx.font = '12px sans-serif';
                ctx.fillText(ts, x+5, y+cellH+15);
            });
            const blob = await canvasToBlob(sheet, 'image/png');
            downloadBlob(blob, 'contact-sheet.png');
        } catch (err) {
            showToast('Export eșuat: ' + err.message);
        }
    }

    return { init, loadFile, getVideo: () => video, getFrameCanvas: () => frameCanvas };
})();