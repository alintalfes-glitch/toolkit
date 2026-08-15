const ELAModule = (function() {
    function init() {
        document.getElementById('elaRun').addEventListener('click', runELA);
    }

    async function runELA() {
        const img = ImageAnalysis.getOriginalImage();
        if (!img) {
            showToast('Încărcați o imagine JPEG');
            return;
        }
        showLoading('Calcul ELA...');
        try {
            const quality = parseInt(document.getElementById('elaQuality').value);
            const amplification = parseFloat(document.getElementById('elaAmplification').value);
            const canvas = document.getElementById('elaCanvas');
            const ctx = canvas.getContext('2d');

            // Re-encode original to JPEG at given quality
            const off = document.createElement('canvas');
            off.width = img.width;
            off.height = img.height;
            off.getContext('2d').drawImage(img, 0, 0);
            const jpegBlob = await canvasToBlob(off, 'image/jpeg', quality/100);
            const jpegUrl = URL.createObjectURL(jpegBlob);
            const reImg = new Image();
            await new Promise(resolve => {
                reImg.onload = resolve;
                reImg.src = jpegUrl;
            });

            // Calculate difference
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.drawImage(reImg, 0, 0);
            const reData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(jpegUrl);

            const diffData = ctx.createImageData(canvas.width, canvas.height);
            for (let i = 0; i < origData.data.length; i += 4) {
                const diff = Math.abs(origData.data[i] - reData.data[i]) +
                             Math.abs(origData.data[i+1] - reData.data[i+1]) +
                             Math.abs(origData.data[i+2] - reData.data[i+2]);
                const val = Math.min(255, diff * amplification);
                diffData.data[i] = val;
                diffData.data[i+1] = val;
                diffData.data[i+2] = val;
                diffData.data[i+3] = 255;
            }
            ctx.putImageData(diffData, 0, 0);
            addAuditEvent('ela_performed', AppState.currentFile ? AppState.currentFile.name : 'image');
        } catch (err) {
            showToast('ELA a eșuat: ' + err.message);
        } finally {
            hideLoading();
        }
    }

    return { init, runELA };
})();