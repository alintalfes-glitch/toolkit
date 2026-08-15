self.addEventListener('message', async (e) => {
    const { buffer, algorithms } = e.data;
    const results = {};
    for (const alg of algorithms) {
        const hashBuffer = await crypto.subtle.digest(alg, buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        results[alg] = hashHex;
    }
    self.postMessage({ results });
});