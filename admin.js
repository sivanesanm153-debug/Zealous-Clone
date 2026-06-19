/**
 * Vertex XR — Admin Dashboard JS
 * Manages login, lead fetching, status updates, modals, search/filter.
 */

// ─── Config ─────────────────────────────────────────────────────────────────
const API_BASE = window.location.origin;
const TOKEN_KEY = 'vxr_admin_token';

const SERVICE_LABELS = {
  modeling:  '3D Modeling',
  rendering: '3D Rendering',
  animation: '3D Animation',
  ar:        'AR/VR',
  other:     'Custom / Other'
};

// ─── State ───────────────────────────────────────────────────────────────────
let allLeads        = [];
let currentFilter   = 'all';
let searchQuery     = '';
let currentLeadId   = null;
let adminToken      = sessionStorage.getItem(TOKEN_KEY) || '';

// ─── DOM Refs ────────────────────────────────────────────────────────────────
const loginScreen  = document.getElementById('login-screen');
const dashboard    = document.getElementById('dashboard');
const loginForm    = document.getElementById('login-form');
const tokenInput   = document.getElementById('token-input');
const loginError   = document.getElementById('login-error');
const logoutBtn    = document.getElementById('logout-btn');

const statNums = {
  total:     document.getElementById('stat-num-total'),
  new:       document.getElementById('stat-num-new'),
  contacted: document.getElementById('stat-num-contacted'),
  closed:    document.getElementById('stat-num-closed'),
};

const refreshBtn    = document.getElementById('refresh-btn');
const exportBtn     = document.getElementById('export-btn');
const searchInput   = document.getElementById('search-input');
const filterTabs    = document.querySelectorAll('.filter-tab');
const loader        = document.getElementById('loader');
const emptyState    = document.getElementById('empty-state');
const tableWrapper  = document.getElementById('table-wrapper');
const leadsBody     = document.getElementById('leads-tbody');

const leadModal        = document.getElementById('lead-modal');
const modalClose       = document.getElementById('modal-close');
const modalAvatar      = document.getElementById('modal-avatar');
const modalName        = document.getElementById('modal-name');
const modalEmail       = document.getElementById('modal-email');
const modalStatusBadge = document.getElementById('modal-status-badge');
const modalCompany     = document.getElementById('modal-company');
const modalService     = document.getElementById('modal-service');
const modalDate        = document.getElementById('modal-date');
const modalMessage     = document.getElementById('modal-message');
const modalDeleteBtn   = document.getElementById('modal-delete-btn');
const statusBtnGroup   = document.getElementById('status-btn-group');

const confirmModal  = document.getElementById('confirm-modal');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmDelete = document.getElementById('confirm-delete');

// ─── Auth ────────────────────────────────────────────────────────────────────
function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display   = 'flex';
  fetchLeads();
}

function showLogin() {
  loginScreen.style.display = 'flex';
  dashboard.style.display   = 'none';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) return;

  loginError.style.display = 'none';

  // Verify token by making a test API call
  try {
    const res = await fetch(`${API_BASE}/api/admin/leads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      adminToken = token;
      sessionStorage.setItem(TOKEN_KEY, token);
      showDashboard();
    } else {
      loginError.style.display = 'flex';
      tokenInput.value = '';
      tokenInput.focus();
    }
  } catch {
    loginError.style.display = 'flex';
  }
});

logoutBtn.addEventListener('click', () => {
  adminToken = '';
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin();
});

// ─── API Helpers ─────────────────────────────────────────────────────────────
function apiRequest(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${API_BASE}${path}`, opts);
}

// ─── Fetch Leads ─────────────────────────────────────────────────────────────
async function fetchLeads() {
  showLoading();
  try {
    const res  = await apiRequest('GET', '/api/admin/leads');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to load leads.');

    allLeads = data.leads || [];
    updateStats(data.stats || {});
    renderLeads();
  } catch (err) {
    console.error(err);
    hideLoading();
    showEmpty();
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function updateStats(stats) {
  statNums.total.textContent     = stats.total     ?? 0;
  statNums.new.textContent       = stats.new_leads ?? 0;
  statNums.contacted.textContent = stats.contacted ?? 0;
  statNums.closed.textContent    = stats.closed    ?? 0;
}

// ─── Render ──────────────────────────────────────────────────────────────────
function renderLeads() {
  hideLoading();

  let filtered = allLeads.filter(lead => {
    const matchStatus = currentFilter === 'all' || lead.status === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      (lead.company || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    showEmpty();
    return;
  }

  tableWrapper.style.display = 'block';
  emptyState.style.display   = 'none';

  leadsBody.innerHTML = filtered.map(lead => {
    const initials = lead.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const date = formatDate(lead.createdAt);
    const serviceLabel = SERVICE_LABELS[lead.service] || lead.service;

    return `
      <tr data-id="${lead._id}" onclick="openLeadModal('${lead._id}')">
        <td style="color: var(--text-muted); font-size:0.8rem;">#${lead._id}</td>
        <td>
          <div class="lead-name-cell">
            <div class="lead-avatar">${initials}</div>
            <div class="lead-name-info">
              <span class="lead-name-text">${escapeHtml(lead.name)}</span>
              <span class="lead-email-text">${escapeHtml(lead.email)}</span>
            </div>
          </div>
        </td>
        <td style="color:var(--text-muted);">${lead.company ? escapeHtml(lead.company) : '—'}</td>
        <td><span class="service-tag">${escapeHtml(serviceLabel)}</span></td>
        <td><span class="status-badge ${lead.status}">${lead.status}</span></td>
        <td style="color:var(--text-muted); white-space:nowrap; font-size:0.82rem;">${date}</td>
        <td>
          <button class="action-btn" onclick="event.stopPropagation(); openLeadModal('${lead._id}')">
            <i class="fa-solid fa-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────
window.openLeadModal = function(id) {
  const lead = allLeads.find(l => l._id === id);
  if (!lead) return;

  currentLeadId = id;
  const initials = lead.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  modalAvatar.textContent       = initials;
  modalName.textContent         = lead.name;
  modalEmail.textContent        = lead.email;
  modalCompany.textContent      = lead.company || '—';
  modalService.textContent      = SERVICE_LABELS[lead.service] || lead.service;
  modalDate.textContent         = formatDate(lead.createdAt);
  modalMessage.textContent      = lead.message;
  modalStatusBadge.textContent  = lead.status;
  modalStatusBadge.className    = `status-badge ${lead.status}`;

  // Status change buttons
  statusBtnGroup.innerHTML = ['New', 'Contacted', 'Closed'].map(s => `
    <button class="status-btn ${s} ${lead.status === s ? 'active-status' : ''}"
      onclick="changeStatus('${id}', '${s}')">
      ${s}
    </button>
  `).join('');

  leadModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

function closeLeadModal() {
  leadModal.style.display = 'none';
  document.body.style.overflow = '';
  currentLeadId = null;
}

modalClose.addEventListener('click', closeLeadModal);
leadModal.addEventListener('click', (e) => { if (e.target === leadModal) closeLeadModal(); });

// ─── Status Update ───────────────────────────────────────────────────────────
window.changeStatus = async function(id, status) {
  try {
    const res  = await apiRequest('PATCH', `/api/admin/leads/${id}/status`, { status });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Update local state
    const lead = allLeads.find(l => l._id === id);
    if (lead) lead.status = status;

    // Refresh modal + table
    closeLeadModal();
    renderLeads();
    // Re-open modal so user sees the change
    openLeadModal(id);
  } catch (err) {
    alert('Failed to update status: ' + err.message);
  }
};

// ─── Delete Lead ──────────────────────────────────────────────────────────────
modalDeleteBtn.addEventListener('click', () => {
  leadModal.style.display = 'none';
  confirmModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
});

confirmCancel.addEventListener('click', () => {
  confirmModal.style.display = 'none';
  document.body.style.overflow = '';
  currentLeadId = null;
});

confirmDelete.addEventListener('click', async () => {
  if (!currentLeadId) return;
  try {
    const res = await apiRequest('DELETE', `/api/admin/leads/${currentLeadId}`);
    if (!res.ok) throw new Error('Delete failed.');

    allLeads = allLeads.filter(l => l._id !== currentLeadId);
    confirmModal.style.display = 'none';
    document.body.style.overflow = '';
    currentLeadId = null;

    // Re-fetch stats (since server recalculates)
    const statsRes  = await apiRequest('GET', '/api/admin/leads');
    const statsData = await statsRes.json();
    updateStats(statsData.stats || {});
    renderLeads();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
});

// ─── Filter + Search ──────────────────────────────────────────────────────────
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-status');
    renderLeads();
  });
});

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = searchInput.value.trim();
    renderLeads();
  }, 250);
});

// ─── Refresh + Export ─────────────────────────────────────────────────────────
refreshBtn.addEventListener('click', () => {
  refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin"></i> Loading...';
  fetchLeads().finally(() => {
    refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh';
  });
});

exportBtn.addEventListener('click', () => {
  window.open(`${API_BASE}/api/admin/leads/export?token=${encodeURIComponent(adminToken)}`, '_blank');

  // Override: send auth header via form trick (open link directly with token in URL)
  // Since fetch can't trigger a download, we'll navigate via <a> with the token in query
  // but server only checks Authorization header — so we use a temporary link with token approach.
  // Simpler: re-export via fetch blob
  apiRequest('GET', '/api/admin/leads/export')
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vertex-xr-leads-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    })
    .catch(() => alert('Export failed. Please try again.'));
});

// ─── Keyboard Esc ────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (confirmModal.style.display !== 'none') {
      confirmModal.style.display = 'none';
      document.body.style.overflow = '';
    } else if (leadModal.style.display !== 'none') {
      closeLeadModal();
    }
  }
});

// ─── Loading / Empty State Helpers ───────────────────────────────────────────
function showLoading() {
  loader.style.display       = 'block';
  emptyState.style.display   = 'none';
  tableWrapper.style.display = 'none';
}

function hideLoading() {
  loader.style.display = 'none';
}

function showEmpty() {
  emptyState.style.display   = 'block';
  tableWrapper.style.display = 'none';
}

// ─── Utility Helpers ─────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString.replace(' ', 'T') + (isoString.includes('Z') ? '' : 'Z'));
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

// ─── Boot ────────────────────────────────────────────────────────────────────
if (adminToken) {
  // Try restoring session from sessionStorage
  showDashboard();
} else {
  showLogin();
}
