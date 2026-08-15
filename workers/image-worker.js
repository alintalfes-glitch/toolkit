self.addEventListener('message', async (e) => {
    const { type, data } = e.data;
    if (type === 'process') {
        // Example: apply grayscale to imageData
        const imageData = data;
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
            const gray = 0.299*r + 0.587*g + 0.114*b;
            pixels[i] = pixels[i+1] = pixels[i+2] = gray;
        }
        self.postMessage({ type: 'processed', imageData });
    }
});