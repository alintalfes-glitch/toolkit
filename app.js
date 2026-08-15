// Global app state
const AppState = {
    currentFile: null,
    currentImage: null,
    currentVideo: null,
    currentWorkspace: null,
    theme: 'light',
    auditLog: [],
    reportData: {}
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initFileHandling();
    initToast();
    initModal();
    initLoadingOverlay();
    initAuditLog();
    initWorkspaceList();

    // Initialize modules
    if (window.ImageAnalysis) ImageAnalysis.init();
    if (window.HashModule) HashModule.init();
    if (window.ExifModule) ExifModule.init();
    if (window.HistogramModule) HistogramModule.init();
    if (window.ELAModule) ELAModule.init();
    if (window.ComparisonModule) ComparisonModule.init();
    if (window.MeasurementModule) MeasurementModule.init();
    if (window.VideoModule) VideoModule.init();
    if (window.TimelineModule) TimelineModule.init();
    if (window.OCRModule) OCRModule.init();
    if (window.ReportModule) ReportModule.init();

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => console.log('SW registered'))
            .catch(err => console.warn('SW registration failed', err));
    }
});

// Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('themeToggle2').addEventListener('click', toggleTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    AppState.theme = theme;
}

function toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Navigation
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .bottom-link');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
            if (window.innerWidth <= 767) {
                sidebar.classList.remove('open');
            }
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Tab switching
    document.querySelectorAll('.tabs').forEach(tabContainer => {
        tabContainer.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab');
            if (!tabBtn) return;
            const tabName = tabBtn.dataset.tab;
            const parent = tabContainer.parentElement;
            const allTabs = parent.querySelectorAll('.tab');
            const allContents = parent.querySelectorAll('.tab-content');
            allTabs.forEach(t => t.classList.remove('active'));
            allContents.forEach(c => c.classList.remove('active'));
            tabBtn.classList.add('active');
            const content = parent.querySelector(`#${tabName}`);
            if (content) content.classList.add('active');
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link, .bottom-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`.nav-link[data-page="${page}"], .bottom-link[data-page="${page}"]`)
        .forEach(l => l.classList.add('active'));
}

// File handling
function initFileHandling() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraInput = document.getElementById('cameraInput');
    const startBtn = document.getElementById('startAnalysisBtn');
    const fileInfo = document.getElementById('fileInfo');

    dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    cameraBtn.addEventListener('click', () => {
        cameraInput.click();
    });

    cameraInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    startBtn.addEventListener('click', () => {
        if (AppState.currentFile) {
            navigateTo('photo');
            if (AppState.currentFile.type.startsWith('image/')) {
                ImageAnalysis.loadFile(AppState.currentFile);
            } else if (AppState.currentFile.type.startsWith('video/')) {
                navigateTo('video');
                VideoModule.loadFile(AppState.currentFile);
            }
            addAuditEvent('analysis_started', AppState.currentFile.name);
        }
    });
}

function handleFile(file) {
    // Validate size (max 500 MB for video, 50 MB for image)
    const maxSize = file.type.startsWith('video/') ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast(`Fișier prea mare. Maxim ${Math.round(maxSize/1024/1024)} MB.`);
        return;
    }

    AppState.currentFile = file;
    const info = document.getElementById('fileInfo');
    info.innerHTML = `
        <p><strong>Nume:</strong> ${escapeHtml(file.name)}</p>
        <p><strong>Tip:</strong> ${file.type || 'Nedisponibil'}</p>
        <p><strong>Dimensiune:</strong> ${formatBytes(file.size)}</p>
    `;
    document.getElementById('startAnalysisBtn').disabled = false;
    addAuditEvent('file_added', file.name);
}

// Utility functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showModal(content) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = content;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) closeModal();
});

// Loading overlay
function showLoading(text = 'Procesare...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Audit log
function initAuditLog() {
    const saved = localStorage.getItem('auditLog');
    AppState.auditLog = saved ? JSON.parse(saved) : [];
    renderAuditLog();
}

function addAuditEvent(action, fileName, hash = null) {
    const event = {
        timestamp: new Date().toISOString(),
        action,
        fileName: fileName || 'N/A',
        hash: hash || null
    };
    AppState.auditLog.push(event);
    if (AppState.auditLog.length > 1000) AppState.auditLog.shift();
    localStorage.setItem('auditLog', JSON.stringify(AppState.auditLog));
    renderAuditLog();
}

function renderAuditLog() {
    const container = document.getElementById('auditLogContainer');
    if (!container) return;
    if (AppState.auditLog.length === 0) {
        container.innerHTML = '<p>Niciun eveniment înregistrat.</p>';
        return;
    }
    container.innerHTML = '<ul>' + AppState.auditLog.slice().reverse().map(e => 
        `<li><small>${e.timestamp}</small> - ${escapeHtml(e.action)} - ${escapeHtml(e.fileName)} ${e.hash ? '- ' + e.hash.substring(0,16)+'...' : ''}</li>`
    ).join('') + '</ul>';
}

document.getElementById('auditClear').addEventListener('click', () => {
    AppState.auditLog = [];
    localStorage.removeItem('auditLog');
    renderAuditLog();
    showToast('Jurnal local șters');
});

// Workspace
function initWorkspaceList() {
    const list = document.getElementById('workspaceList');
    const names = Object.keys(localStorage).filter(k => k.startsWith('workspace_'));
    list.innerHTML = names.length ? names.map(n => `<div>${escapeHtml(n.replace('workspace_',''))}</div>`).join('') : '<p>Niciun caz salvat.</p>';
    document.getElementById('workspaceCreate').addEventListener('click', createWorkspace);
}

function createWorkspace() {
    const name = document.getElementById('workspaceName').value.trim() || `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random()*999)).padStart(3,'0')}`;
    const key = `workspace_${name}`;
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({
            created: new Date().toISOString(),
            files: [],
            events: []
        }));
        AppState.currentWorkspace = name;
        showToast(`Caz creat: ${name}`);
        initWorkspaceList();
    } else {
        showToast('Cazul există deja');
    }
}

// Export workspace (simplified)
document.getElementById('workspaceExport').addEventListener('click', async () => {
    try {
        const zip = new JSZip();
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('workspace_')) {
                zip.file(`${key}.json`, localStorage.getItem(key));
            }
        });
        zip.file('audit-log.json', JSON.stringify(AppState.auditLog, null, 2));
        const blob = await zip.generateAsync({type: 'blob'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workspace-export.zip';
        a.click();
        URL.revokeObjectURL(url);
        addAuditEvent('workspace_exported', 'N/A');
    } catch (err) {
        showToast('Eroare la export: ' + err.message);
    }
});

// Export helpers
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas export failed'));
        }, type, quality);
    });
}