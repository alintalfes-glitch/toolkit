// This worker would be used if we need to run OCR in a separate thread.
// Currently Tesseract.js handles its own workers. This is a placeholder.
self.addEventListener('message', (e) => {
    self.postMessage({ status: 'ready' });
});