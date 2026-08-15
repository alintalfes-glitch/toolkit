const HistogramModule = (function() {
    let sourceImage = null;

    function init() {
        // Histogram is rendered when analysis tab opens and image loaded
        document.querySelectorAll('#histogram input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (sourceImage) render();
            });
        });
    }

    function setImage(img) {
        sourceImage = img;
        render();
    }

    function render() {
        if (!sourceImage) return;
        const canvas = document.getElementById('histogramCanvas');
        const ctx = canvas.getContext('2d');
        // Draw image to offscreen for pixel data
        const off = document.createElement('canvas');
        off.width = sourceImage.width;
        off.height = sourceImage.height;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(sourceImage, 0, 0);
        const imageData = offCtx.getImageData(0, 0, off.width, off.height);
        const data = imageData.data;
        const histR = new Array(256).fill(0);
        const histG = new Array(256).fill(0);
        const histB = new Array(256).fill(0);
        const histLum = new Array(256).fill(0);
        let minVal = 255, maxVal = 0, sumLum = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const lum = Math.round(0.299*r + 0.587*g + 0.114*b);
            histR[r]++; histG[g]++; histB[b]++; histLum[lum]++;
            sumLum += lum;
            count++;
            if (lum < minVal) minVal = lum;
            if (lum > maxVal) maxVal = lum;
        }

        const meanLum = sumLum / count;
        // Median approx from histogram
        let cum = 0, medianLum = 0;
        for (let i = 0; i < 256; i++) {
            cum += histLum[i];
            if (cum >= count/2) {
                medianLum = i;
                break;
            }
        }
        // Clipping shadows/highlights (e.g., percentage at 0 and 255)
        const shadows = histLum[0] / count * 100;
        const highlights = histLum[255] / count * 100;

        // Draw histogram
        canvas.width = 600;
        canvas.height = 300;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        const maxCount = Math.max(...histR, ...histG, ...histB, ...histLum) || 1;

        function drawChannel(hist, color, enabled) {
            if (!enabled) return;
            ctx.strokeStyle = color;
            ctx.beginPath();
            for (let i = 0; i < 256; i++) {
                const x = (i/255) * canvas.width;
                const y = canvas.height - (hist[i]/maxCount) * canvas.height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        drawChannel(histR, 'red', document.getElementById('chR').checked);
        drawChannel(histG, 'green', document.getElementById('chG').checked);
        drawChannel(histB, 'blue', document.getElementById('chB').checked);
        drawChannel(histLum, 'gray', document.getElementById('chLum').checked);

        document.getElementById('histogramStats').innerHTML = `
            <p>Min: ${minVal} | Max: ${maxVal}</p>
            <p>Mean: ${meanLum.toFixed(2)} | Median: ${medianLum}</p>
            <p>Clipping shadows: ${shadows.toFixed(2)}% | Clipping highlights: ${highlights.toFixed(2)}%</p>
        `;
    }

    return { init, setImage };
})();