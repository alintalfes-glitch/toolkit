const MeasurementModule = (function() {
    let canvas, ctx;
    let mode = 'calibrate'; // calibrate, distance, angle, etc.
    let points = [];
    let calibrationScale = null; // pixels per unit
    let unit = 'cm';

    function init() {
        canvas = document.getElementById('measurementCanvas');
        ctx = canvas.getContext('2d');
        document.getElementById('calibrateBtn').addEventListener('click', () => { mode = 'calibrate'; points = []; showToast('Trasați linia de calibrare'); });
        document.getElementById('measureDistance').addEventListener('click', () => { mode = 'distance'; points = []; });
        document.getElementById('measureAngle').addEventListener('click', () => { mode = 'angle'; points = []; });
        document.getElementById('measureDiameter').addEventListener('click', () => { mode = 'diameter'; points = []; });
        document.getElementById('measurePerimeter').addEventListener('click', () => { mode = 'perimeter'; points = []; });
        document.getElementById('measureArea').addEventListener('click', () => { mode = 'area'; points = []; });
        document.getElementById('measureReset').addEventListener('click', reset);
        canvas.addEventListener('click', onClick);
    }

    function loadImage(img) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        points = [];
    }

    function onClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        points.push({x, y});
        drawPoints();
        if (mode === 'calibrate' && points.length === 2) {
            calibrate();
        } else if (mode === 'distance' && points.length === 2) {
            measureDistance();
        } else if (mode === 'angle' && points.length === 3) {
            measureAngle();
        } else if (mode === 'diameter' && points.length === 2) {
            measureDiameter();
        } else if (mode === 'perimeter' && points.length >= 3) {
            // keep adding until double click
            canvas.addEventListener('dblclick', () => measurePerimeter());
        } else if (mode === 'area' && points.length >= 3) {
            canvas.addEventListener('dblclick', () => measureArea());
        }
    }

    function drawPoints() {
        ctx.clearRect(0,0,canvas.width, canvas.height);
        if (AppState.currentImage) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0,0);
            img.src = URL.createObjectURL(AppState.currentImage);
        }
        points.forEach((p, i) => {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
            ctx.fill();
        });
        if (points.length > 1) {
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            if (points.length === 2) ctx.stroke();
            else if (points.length > 2) { ctx.closePath(); ctx.stroke(); }
        }
    }

    function calibrate() {
        const length = parseFloat(document.getElementById('realLength').value);
        if (!length || length <= 0) {
            showToast('Introduceți lungimea reală');
            return;
        }
        unit = document.getElementById('unitSelect').value;
        const pixelDist = distance(points[0], points[1]);
        calibrationScale = pixelDist / length;
        document.getElementById('measurementResult').innerHTML = `Calibrare: ${calibrationScale.toFixed(2)} pixeli/${unit}`;
        addAuditEvent('measurement_calibrated', 'image');
        points = [];
    }

    function measureDistance() {
        if (!calibrationScale) { showToast('Calibrați mai întâi'); return; }
        const pixelDist = distance(points[0], points[1]);
        const realDist = pixelDist / calibrationScale;
        document.getElementById('measurementResult').innerHTML = `Distanță: ${realDist.toFixed(2)} ${unit}`;
        points = [];
    }

    function measureAngle() {
        const a = points[0], b = points[1], c = points[2];
        const ab = distance(a,b), bc = distance(b,c), ac = distance(a,c);
        const cosB = (ab*ab + bc*bc - ac*ac) / (2*ab*bc);
        const angle = Math.acos(cosB) * 180 / Math.PI;
        document.getElementById('measurementResult').innerHTML = `Unghi: ${angle.toFixed(2)}°`;
        points = [];
    }

    function measureDiameter() {
        if (!calibrationScale) { showToast('Calibrați mai întâi'); return; }
        const pixelDist = distance(points[0], points[1]);
        const realDist = pixelDist / calibrationScale;
        document.getElementById('measurementResult').innerHTML = `Diametru: ${realDist.toFixed(2)} ${unit}`;
        points = [];
    }

    function measurePerimeter() {
        if (!calibrationScale) { showToast('Calibrați mai întâi'); return; }
        let total = 0;
        for (let i=0; i<points.length; i++) {
            const next = (i+1) % points.length;
            total += distance(points[i], points[next]);
        }
        const real = total / calibrationScale;
        document.getElementById('measurementResult').innerHTML = `Perimetru: ${real.toFixed(2)} ${unit}`;
        points = [];
    }

    function measureArea() {
        if (!calibrationScale) { showToast('Calibrați mai întâi'); return; }
        let area = 0;
        for (let i=0; i<points.length; i++) {
            const j = (i+1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;
        const realArea = area / (calibrationScale * calibrationScale);
        document.getElementById('measurementResult').innerHTML = `Suprafață: ${realArea.toFixed(2)} ${unit}²`;
        points = [];
    }

    function distance(p1, p2) {
        return Math.sqrt((p1.x-p2.x)**2 + (p1.y-p2.y)**2);
    }

    function reset() {
        points = [];
        calibrationScale = null;
        canvas.width = 0;
        canvas.height = 0;
        document.getElementById('measurementResult').innerHTML = '';
    }

    return { init, loadImage, reset };
})();