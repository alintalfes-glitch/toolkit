const ComparisonModule = (function() {
    let imgA = null, imgB = null;
    let canvasA, canvasB, overlayCanvas, diffCanvas, blinkCanvas;
    let blinkInterval = null;
    let blinkVisible = true;

    function init() {
        canvasA = document.getElementById('compareCanvasA');
        canvasB = document.getElementById('compareCanvasB');
        overlayCanvas = document.getElementById('overlayCanvas');
        diffCanvas = document.getElementById('differenceCanvas');
        blinkCanvas = document.getElementById('blinkCanvas');

        document.getElementById('compareA').addEventListener('change', e => loadImage(e.target.files[0], 'A'));
        document.getElementById('compareB').addEventListener('change', e => loadImage(e.target.files[0], 'B'));
        document.getElementById('compareReset').addEventListener('click', reset);
        document.getElementById('overlayOpacity').addEventListener('input', renderOverlay);
        document.getElementById('blinkToggle').addEventListener('click', toggleBlink);

        // Perspective
        const perspCanvas = document.getElementById('perspectiveCanvas');
        let points = [];
        perspCanvas.addEventListener('click', (e) => {
            if (points.length >= 4) points = [];
            const rect = perspCanvas.getBoundingClientRect();
            points.push({x: e.clientX - rect.left, y: e.clientY - rect.top});
            drawPerspectivePoints();
            if (points.length === 4) {
                showToast('4 puncte selectate. Apăsați Aplică');
            }
        });
        document.getElementById('perspectiveReset').addEventListener('click', () => {
            points = [];
            drawPerspectivePoints();
        });
        document.getElementById('perspectiveApply').addEventListener('click', () => applyPerspective(points));
        document.getElementById('perspectiveExport').addEventListener('click', exportPerspective);
    }

    function loadImage(file, which) {
        const img = new Image();
        img.onload = () => {
            if (which === 'A') imgA = img; else imgB = img;
            renderAll();
            addAuditEvent('comparison_image_loaded', file.name);
        };
        img.src = URL.createObjectURL(file);
    }

    function reset() {
        imgA = null; imgB = null;
        canvasA.width = 0; canvasB.width = 0;
        overlayCanvas.width = 0; diffCanvas.width = 0; blinkCanvas.width = 0;
        stopBlink();
    }

    function renderAll() {
        renderSideBySide();
        renderOverlay();
        renderDifference();
        renderBlink();
    }

    function drawImageToCanvas(canvas, img) {
        if (!img) return;
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
    }

    function renderSideBySide() {
        drawImageToCanvas(canvasA, imgA);
        drawImageToCanvas(canvasB, imgB);
    }

    function renderOverlay() {
        if (!imgA || !imgB) return;
        overlayCanvas.width = Math.max(imgA.width, imgB.width);
        overlayCanvas.height = Math.max(imgA.height, imgB.height);
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
        ctx.globalAlpha = 1;
        ctx.drawImage(imgA, 0, 0);
        ctx.globalAlpha = parseFloat(document.getElementById('overlayOpacity').value);
        ctx.drawImage(imgB, 0, 0);
        ctx.globalAlpha = 1;
    }

    function renderDifference() {
        if (!imgA || !imgB) return;
        const w = Math.max(imgA.width, imgB.width);
        const h = Math.max(imgA.height, imgB.height);
        diffCanvas.width = w;
        diffCanvas.height = h;
        const ctx = diffCanvas.getContext('2d');
        const tempA = document.createElement('canvas');
        tempA.width = w; tempA.height = h;
        tempA.getContext('2d').drawImage(imgA, 0, 0);
        const tempB = document.createElement('canvas');
        tempB.width = w; tempB.height = h;
        tempB.getContext('2d').drawImage(imgB, 0, 0);
        const dataA = tempA.getContext('2d').getImageData(0,0,w,h).data;
        const dataB = tempB.getContext('2d').getImageData(0,0,w,h).data;
        const diffData = ctx.createImageData(w,h);
        for (let i = 0; i < dataA.length; i += 4) {
            const diff = Math.abs(dataA[i]-dataB[i]) + Math.abs(dataA[i+1]-dataB[i+1]) + Math.abs(dataA[i+2]-dataB[i+2]);
            const val = Math.min(255, diff);
            diffData.data[i] = val;
            diffData.data[i+1] = val;
            diffData.data[i+2] = val;
            diffData.data[i+3] = 255;
        }
        ctx.putImageData(diffData, 0, 0);
    }

    function renderBlink() {
        if (!imgA || !imgB) return;
        blinkCanvas.width = Math.max(imgA.width, imgB.width);
        blinkCanvas.height = Math.max(imgA.height, imgB.height);
        blinkVisible = true;
        drawBlinkFrame();
    }

    function drawBlinkFrame() {
        const ctx = blinkCanvas.getContext('2d');
        ctx.clearRect(0,0,blinkCanvas.width, blinkCanvas.height);
        ctx.drawImage(blinkVisible ? imgA : imgB, 0, 0);
    }

    function toggleBlink() {
        if (blinkInterval) {
            stopBlink();
        } else {
            blinkInterval = setInterval(() => {
                blinkVisible = !blinkVisible;
                drawBlinkFrame();
            }, 500);
        }
    }

    function stopBlink() {
        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
        }
    }

    // Perspective
    function drawPerspectivePoints() {
        const canvas = document.getElementById('perspectiveCanvas');
        const ctx = canvas.getContext('2d');
        if (!imgA) return;
        canvas.width = imgA.width;
        canvas.height = imgA.height;
        ctx.drawImage(imgA, 0, 0);
        points.forEach((p, i) => {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.fillText(['A','B','C','D'][i], p.x+8, p.y+8);
        });
        if (points.length === 4) {
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();
            ctx.stroke();
        }
    }

    function applyPerspective(pts) {
        if (!imgA || pts.length !== 4) {
            showToast('Selectați exact 4 puncte');
            return;
        }
        showLoading('Aplicare corecție...');
        try {
            const canvas = document.getElementById('perspectiveCanvas');
            const ctx = canvas.getContext('2d');
            const w = Math.max(distance(pts[0], pts[1]), distance(pts[2], pts[3]));
            const h = Math.max(distance(pts[1], pts[2]), distance(pts[3], pts[0]));
            const out = document.createElement('canvas');
            out.width = w;
            out.height = h;
            const outCtx = out.getContext('2d');

            // Simple homography using affine approximation (first 3 points)
            const src = [pts[0], pts[1], pts[2]];
            const dst = [
                {x: 0, y: 0},
                {x: w, y: 0},
                {x: w, y: h}
            ];
            const matrix = getAffineTransform(src, dst);
            outCtx.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
            outCtx.drawImage(imgA, 0, 0);
            outCtx.setTransform(1,0,0,1,0,0);

            canvas.width = out.width;
            canvas.height = out.height;
            canvas.getContext('2d').drawImage(out, 0, 0);
            addAuditEvent('perspective_applied', 'image');
        } catch (err) {
            showToast('Eroare: ' + err.message);
        } finally {
            hideLoading();
        }
    }

    function getAffineTransform(src, dst) {
        const a = src[0], b = src[1], c = src[2];
        const d = dst[0], e = dst[1], f = dst[2];
        const denom = a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y);
        const m11 = (d.x*(b.y - c.y) + e.x*(c.y - a.y) + f.x*(a.y - b.y)) / denom;
        const m12 = (d.y*(b.y - c.y) + e.y*(c.y - a.y) + f.y*(a.y - b.y)) / denom;
        const m21 = (d.x*(c.x - b.x) + e.x*(a.x - c.x) + f.x*(b.x - a.x)) / denom;
        const m22 = (d.y*(c.x - b.x) + e.y*(a.x - c.x) + f.y*(b.x - a.x)) / denom;
        const tx = d.x - (m11*a.x + m21*a.y);
        const ty = d.y - (m12*a.x + m22*a.y);
        return [m11, m12, m21, m22, tx, ty];
    }

    function distance(p1, p2) {
        return Math.sqrt((p1.x-p2.x)**2 + (p1.y-p2.y)**2);
    }

    function exportPerspective() {
        const canvas = document.getElementById('perspectiveCanvas');
        if (!canvas.width) return;
        canvasToBlob(canvas, 'image/png').then(blob => downloadBlob(blob, 'perspective-corrected.png'));
    }

    return { init, reset };
})();