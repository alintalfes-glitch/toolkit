const TimelineModule = (function() {
    let events = [];

    function init() {
        document.getElementById('timelineContainer').innerHTML = `
            <div class="timeline-controls">
                <input type="text" id="eventTime" placeholder="00:00:00.000">
                <input type="text" id="eventDesc" placeholder="Descriere">
                <select id="eventCategory">
                    <option value="persoană">persoană</option>
                    <option value="vehicul">vehicul</option>
                    <option value="obiect">obiect</option>
                    <option value="eveniment">eveniment</option>
                    <option value="audio">audio</option>
                    <option value="observație">observație</option>
                </select>
                <button class="btn" id="addEventBtn">Adaugă</button>
            </div>
            <div id="eventsList"></div>
            <button class="btn" id="exportCSV">Export CSV</button>
            <button class="btn" id="exportJSON">Export JSON</button>
        `;
        document.getElementById('addEventBtn').addEventListener('click', addEvent);
        document.getElementById('exportCSV').addEventListener('click', exportCSV);
        document.getElementById('exportJSON').addEventListener('click', exportJSON);
        renderEvents();
    }

    function addEvent() {
        const time = document.getElementById('eventTime').value.trim();
        const desc = document.getElementById('eventDesc').value.trim();
        const category = document.getElementById('eventCategory').value;
        if (!time || !desc) {
            showToast('Completați timpul și descrierea');
            return;
        }
        events.push({ id: Date.now(), time, desc, category });
        renderEvents();
        document.getElementById('eventTime').value = '';
        document.getElementById('eventDesc').value = '';
        addAuditEvent('timeline_event_added', time + ' ' + desc);
    }

    function renderEvents() {
        const list = document.getElementById('eventsList');
        if (!list) return;
        list.innerHTML = events.length ? '<ul>' + events.map(e => 
            `<li>${escapeHtml(e.time)} - <span class="badge">${escapeHtml(e.category)}</span> ${escapeHtml(e.desc)} 
            <button class="btn-sm" data-del="${e.id}">Șterge</button></li>`
        ).join('') + '</ul>' : '<p>Niciun eveniment.</p>';
        list.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', () => {
                events = events.filter(e => e.id != btn.dataset.del);
                renderEvents();
            });
        });
    }

    function exportCSV() {
        const csv = 'Time,Category,Description\n' + events.map(e => `${e.time},${e.category},"${e.desc.replace(/"/g,'""')}"`).join('\n');
        downloadBlob(new Blob([csv], {type: 'text/csv'}), 'timeline-events.csv');
    }

    function exportJSON() {
        downloadBlob(new Blob([JSON.stringify(events, null, 2)], {type: 'application/json'}), 'timeline-events.json');
    }

    return { init };
})();