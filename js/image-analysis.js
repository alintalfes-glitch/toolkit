const ImageAnalysis = (function() {
    let originalImage = null;
    let workingCanvas = null;
    let workingCtx = null;
    let currentZoom = 1;
    let rotation = 0;
    let flipH = false;
    let flipV = false;
    let cropMode = false;
    let cropStart = null;
    let cropRect = null;

    function init() {
        const canvas = document.getElementById('photoCanvas');
        workingCanvas = canvas;
        workingCtx = canvas.getContext('2d');

        document.getElementById('zoomLevel').addEventListener('change', e => {
            currentZoom = parseFloat(e.target.value);
            render();
        });
        document.getElementById('zoomIn').addEventListener('click', () => {
            currentZoom = Math.min(16, currentZoom * 2);
            document.getElementById('zoomLevel').value = currentZoom;
            render();
        });
        document.getElementById('zoomOut').addEventListener('click', () => {
            currentZoom = Math.max(1, currentZoom / 2);
            document.getElementById('zoomLevel').value = currentZoom;
            render();
        });
        document.getElementById('rotateBtn').addEventListener('click', () => {
            rotation = (rotation + 90) % 360;
            render();
        });
        document.getElementById('flipH').addEventListener('click', () => {
            flipH = !flipH;
            render();
        });
        document.getElementById('flipV').addEventListener('click', () => {
            flipV = !flipV;
            render();
        });
        document.getElementById('cropBtn').addEventListener('click', toggleCropMode);
        document.getElementById('resetPhoto').addEventListener('click', reset);
        document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
        document.getElementById('exportImage').addEventListener('click', exportImage);

        canvas.addEventListener('mousedown', onCropStart);
        canvas.addEventListener('mousemove', onCropMove);
        canvas.addEventListener('mouseup', onCropEnd);
        canvas.addEventListener('touchstart', onCropStart);
        canvas.addEventListener('touchmove', onCropMove);
        canvas.addEventListener('touchend', onCropEnd);
    }

    function loadFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Fișierul nu este o imagine');
            return;
        }
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            reset();
            displayPhotoInfo(file);
            addAuditEvent('image_loaded', file.name);
        };
        img.src = URL.createObjectURL(file);
        AppState.currentImage = file;
    }

    function displayPhotoInfo(file) {
        const info = document.getElementById('photoInfo');
        info.innerHTML = `
            <p><strong>Nume:</strong> ${escapeHtml(file.name)}</p>
            <p><strong>Dimensiune:</strong> ${formatBytes(file.size)}</p>
            <p><strong>Format:</strong> ${file.type || 'Nedisponibil'}</p>
            <p><strong>Rezoluție:</strong> ${originalImage.width} × ${originalImage.height}</p>
            <p><strong>Raport aspect:</strong> ${(originalImage.width / originalImage.height).toFixed(2)}:1</p>
            <p><strong>Pixeli:</strong> ${(originalImage.width * originalImage.height).toLocaleString()}</p>
        `;
    }

    function reset() {
        rotation = 0;
        flipH = false;
        flipV = false;
        currentZoom = 1;
        cropMode = false;
        cropRect = null;
        cropStart = null;
        document.getElementById('zoomLevel').value = 1;
        if (originalImage) {
            workingCanvas.width = originalImage.width;
            workingCanvas.height = originalImage.height;
            workingCtx.drawImage(originalImage, 0, 0);
        }
        render();
    }

    function render() {
        if (!originalImage) return;
        const canvas = workingCanvas;
        const ctx = workingCtx;
        // Save current canvas content if crop not active
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(originalImage, 0, 0);
        // Apply flips
        if (flipH) {
            tempCtx.save();
            tempCtx.translate(tempCanvas.width, 0);
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(originalImage, 0, 0);
            tempCtx.restore();
        }
        if (flipV) {
            tempCtx.save();
            tempCtx.translate(0, tempCanvas.height);
            tempCtx.scale(1, -1);
            tempCtx.drawImage(tempCanvas, 0, 0);
            tempCtx.restore();
        }
        // Apply rotation
        if (rotation !== 0) {
            const rad = rotation * Math.PI / 180;
            const newW = Math.abs(tempCanvas.width * Math.cos(rad)) + Math.abs(tempCanvas.height * Math.sin(rad));
            const newH = Math.abs(tempCanvas.width * Math.sin(rad)) + Math.abs(tempCanvas.height * Math.cos(rad));
            const rotCanvas = document.createElement('canvas');
            rotCanvas.width = newW;
            rotCanvas.height = newH;
            const rotCtx = rotCanvas.getContext('2d');
            rotCtx.translate(newW/2, newH/2);
            rotCtx.rotate(rad);
            rotCtx.drawImage(tempCanvas, -tempCanvas.width/2, -tempCanvas.height/2);
            tempCanvas.width = rotCanvas.width;
            tempCanvas.height = rotCanvas.height;
            tempCtx.drawImage(rotCanvas, 0, 0);
        }
        // Apply crop if exists
        if (cropRect) {
            const cropped = document.createElement('canvas');
            cropped.width = cropRect.w;
            cropped.height = cropRect.h;
            cropped.getContext('2d').drawImage(tempCanvas, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
            tempCanvas.width = cropped.width;
            tempCanvas.height = cropped.height;
            tempCtx.drawImage(cropped, 0, 0);
        }
        // Set canvas and apply zoom
        canvas.width = tempCanvas.width * currentZoom;
        canvas.height = tempCanvas.height * currentZoom;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }

    function toggleCropMode() {
        cropMode = !cropMode;
        cropRect = null;
        cropStart = null;
        canvas.style.cursor = cropMode ? 'crosshair' : 'default';
        showToast(cropMode ? 'Selectează zona de crop' : 'Crop oprit');
    }

    function onCropStart(e) {
        if (!cropMode || !originalImage) return;
        const rect = workingCanvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        cropStart = {x, y};
        cropRect = {x, y, w: 0, h: 0};
    }

    function onCropMove(e) {
        if (!cropMode || !cropStart) return;
        e.preventDefault();
        const rect = workingCanvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        cropRect.x = Math.min(cropStart.x, x);
        cropRect.y = Math.min(cropStart.y, y);
        cropRect.w = Math.abs(x - cropStart.x);
        cropRect.h = Math.abs(y - cropStart.y);
        // Draw crop rectangle on canvas
        render();
        workingCtx.strokeStyle = 'red';
        workingCtx.lineWidth = 2;
        workingCtx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }

    function onCropEnd() {
        if (!cropMode || !cropStart) return;
        cropMode = false;
        cropStart = null;
        workingCanvas.style.cursor = 'default';
        render();
    }

    function toggleFullscreen() {
        const container = document.getElementById('photoCanvasContainer');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }

    async function exportImage() {
        if (!workingCanvas) return;
        try {
            const blob = await canvasToBlob(workingCanvas, 'image/png');
            downloadBlob(blob, 'processed-image.png');
            addAuditEvent('image_exported', AppState.currentFile ? AppState.currentFile.name : 'processed');
        } catch (err) {
            showToast('Export eșuat: ' + err.message);
        }
    }

    return {
        init,
        loadFile,
        reset,
        exportImage,
        getCanvas: () => workingCanvas,
        getOriginalImage: () => originalImage
    };
})();