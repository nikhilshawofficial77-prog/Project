(() => {
  const STORAGE_KEY = 'carepulse.feedback.v1';
  const categories = ['Nursing & Care', 'Reception & Check-in', 'Doctor Consultation', 'Wait Time', 'Facilities & Cleanliness', 'Billing & Insurance', 'Other'];
  const $ = (selector) => document.querySelector(selector);
  const form = $('#feedback-form');
  const dateInput = $('#visit-date');
  const anonymousInput = $('#anonymous');
  const patientField = $('#patient-field');
  const message = $('#form-message');
  const today = new Date();
  dateInput.value = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function loadEntries() {
    try {
      const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(entries) ? entries : [];
    } catch { return []; }
  }
  function saveEntries(entries) { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
  function textCell(value, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    return cell;
  }
  function renderDashboard() {
    const entries = loadEntries();
    const filter = $('#dashboard-filter').value;
    const visible = filter === 'all' ? entries : entries.filter(entry => entry.category === filter);
    const resolved = entries.filter(entry => entry.status === 'Resolved').length;
    const avg = entries.length ? entries.reduce((sum, entry) => sum + Number(entry.rating), 0) / entries.length : 0;
    $('#total-count').textContent = entries.length;
    $('#average-rating').textContent = `${avg.toFixed(1)} / 5`;
    $('#pending-count').textContent = entries.length - resolved;
    $('#resolved-count').textContent = resolved;
    const tbody = $('#feedback-rows');
    tbody.replaceChildren();
    $('#empty-state').classList.toggle('is-empty', visible.length === 0);
    $('#empty-state').textContent = visible.length ? '' : (entries.length ? 'No feedback matches this category.' : 'No feedback yet. Submitted feedback will appear here.');
    visible.slice().reverse().forEach(entry => {
      const row = document.createElement('tr');
      row.append(textCell(entry.visitDate), textCell(entry.anonymous ? 'Anonymous' : (entry.patientName || 'Not provided')), textCell(entry.category), textCell(`${entry.rating} / 5 ★`), textCell(entry.comments || '—', 'comment-cell'));
      const status = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = `status-pill${entry.status === 'Resolved' ? ' resolved' : ''}`;
      pill.textContent = entry.status;
      status.append(pill); row.append(status);
      const actionCell = document.createElement('td');
      const action = document.createElement('button');
      action.className = 'row-action'; action.type = 'button';
      action.textContent = entry.status === 'Resolved' ? 'Reopen' : 'Mark resolved';
      action.addEventListener('click', () => {
        const latest = loadEntries();
        const item = latest.find(candidate => candidate.id === entry.id);
        if (item) { item.status = item.status === 'Resolved' ? 'Pending' : 'Resolved'; saveEntries(latest); renderDashboard(); }
      });
      actionCell.append(action); row.append(actionCell); tbody.append(row);
    });
  }
  categories.forEach(category => {
    const option = document.createElement('option'); option.value = category; option.textContent = category; $('#dashboard-filter').append(option);
  });
  anonymousInput.addEventListener('change', () => patientField.classList.toggle('hidden', anonymousInput.checked));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const entry = {
      id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      visitDate: data.get('visitDate'),
      category: data.get('category'),
      rating: Number(data.get('rating')),
      comments: String(data.get('comments') || '').trim(),
      anonymous: anonymousInput.checked,
      patientName: anonymousInput.checked ? '' : String(data.get('patientName') || '').trim(),
      status: 'Pending',
      submittedAt: new Date().toISOString()
    };
    const entries = loadEntries(); entries.push(entry);
    try { saveEntries(entries); }
    catch { message.textContent = 'Could not save feedback. Check your browser storage settings and try again.'; return; }
    form.reset(); dateInput.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    anonymousInput.checked = true; patientField.classList.add('hidden');
    message.textContent = 'Thank you. Your feedback has been saved on this device.';
    renderDashboard();
  });
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    const dashboard = button.dataset.page === 'dashboard';
    $('#feedback-page').classList.toggle('hidden', dashboard);
    $('#dashboard-page').classList.toggle('hidden', !dashboard);
    document.querySelectorAll('[data-page]').forEach(link => link.classList.toggle('active', link === button));
    if (dashboard) renderDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  $('#dashboard-filter').addEventListener('change', renderDashboard);
  $('#contrast-toggle').addEventListener('click', event => {
    const enabled = document.body.classList.toggle('high-contrast');
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
  });
  $('#export-button').addEventListener('click', () => {
    const rows = loadEntries();
    const columns = ['visitDate', 'submittedAt', 'patientName', 'anonymous', 'category', 'rating', 'comments', 'status'];
    const csv = [columns.join(','), ...rows.map(row => columns.map(key => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'carepulse-feedback.csv'; link.click(); URL.revokeObjectURL(url);
  });
  renderDashboard();
})();
