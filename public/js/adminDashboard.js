/**
 * QueueLess - Admin Dashboard Script
 */

let allCounters = [];
let allServices = [];
let adminPollInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('admin')) return;
  Auth.setupNavbar();

  // Load initial data
  await loadMonitoringData();
  await loadCountersDropdown();
  await loadServicesTab();
  await loadCountersTab();
  await loadHistoryTab();

  // Setup tab switches
  setupTabs();

  // Poll monitoring data every 4 seconds
  adminPollInterval = setInterval(async () => {
    await loadMonitoringData(true);
  }, 4000);
});

// Tab switching logic
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-target');
      document.querySelectorAll('.tab-content').forEach((content) => {
        content.style.display = content.id === targetId ? 'block' : 'none';
      });
    });
  });
}

// 1. Load Monitoring Stats and Active Queue
async function loadMonitoringData(isPolling = false) {
  try {
    const res = await Auth.fetchWithAuth('/api/tokens/admin/monitoring');
    const data = await res.json();

    if (!data.success) return;

    // Update Stats counters
    document.getElementById('statWaiting').textContent = data.stats.totalWaiting;
    document.getElementById('statServing').textContent = data.stats.currentlyServing;
    document.getElementById('statCompleted').textContent = data.stats.completedToday;
    document.getElementById('statSkipped').textContent = data.stats.skippedToday;
    document.getElementById('statCancelled').textContent = data.stats.cancelledToday;

    // Update Active Queue Table
    const tableBody = document.getElementById('activeQueueTableBody');
    if (!tableBody) return;

    if (!data.activeQueue || data.activeQueue.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">🎉</div>
            <div class="empty-state-title">No Active Queue</div>
            <p>All queues are cleared right now. New tokens will appear here instantly.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = data.activeQueue
      .map((tok) => {
        const isServing = tok.status === 'CALLED';
        const dateStr = new Date(tok.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        return `
          <tr style="${isServing ? 'background: #FFF7F2;' : ''}">
            <td class="token-cell" style="color: ${isServing ? 'var(--primary)' : 'var(--dark)'};">
              ${tok.tokenNumber}
            </td>
            <td><strong>${tok.service ? tok.service.serviceName : '—'}</strong></td>
            <td>${tok.user ? tok.user.name : 'Guest'}</td>
            <td>${tok.counter ? tok.counter.counterName : '—'}</td>
            <td style="color: var(--text-muted);">${dateStr}</td>
            <td>
              <span class="badge ${isServing ? 'badge-called' : 'badge-waiting'}">
                ${tok.status}
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                ${
                  isServing
                    ? `
                  <button onclick="handleCompleteToken('${tok._id}')" class="btn btn-sm btn-success" title="Mark Completed">
                    ✓ Complete
                  </button>
                  <button onclick="handleSkipToken('${tok._id}')" class="btn btn-sm btn-secondary" title="Skip Token">
                    Skip
                  </button>
                `
                    : `
                  <button onclick="handleSkipToken('${tok._id}')" class="btn btn-sm btn-secondary" title="Skip">
                    Skip
                  </button>
                  <button onclick="handleCancelToken('${tok._id}')" class="btn btn-sm btn-danger" title="Cancel">
                    Cancel
                  </button>
                `
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    if (!isPolling) console.error('Error loading monitoring data:', err);
  }
}

// 2. Load Counters for Quick Call Bar
async function loadCountersDropdown() {
  try {
    const res = await Auth.fetchWithAuth('/api/counters');
    const data = await res.json();
    if (!data.success) return;

    allCounters = data.data;
    const select = document.getElementById('quickCallCounterSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Active Counter --</option>' +
      allCounters
        .filter((c) => c.status !== 'INACTIVE')
        .map(
          (c) =>
            `<option value="${c._id}">${c.counterName} (${c.service ? c.service.serviceName : 'No Service'}) - ${c.status}</option>`
        )
        .join('');

    // Preselect first counter if available
    if (select.options.length > 1) {
      select.selectedIndex = 1;
    }
  } catch (err) {
    console.error('Error loading counters dropdown:', err);
  }
}

// 3. Quick "CALL NEXT" Action
async function handleCallNext() {
  const counterSelect = document.getElementById('quickCallCounterSelect');
  const counterId = counterSelect ? counterSelect.value : null;

  if (!counterId) {
    Auth.showToast('Please select a counter to call next token', 'warning');
    return;
  }

  const btn = document.getElementById('callNextBtn');
  btn.disabled = true;

  try {
    const res = await Auth.fetchWithAuth('/api/tokens/call-next', {
      method: 'POST',
      body: JSON.stringify({ counterId }),
    });

    const data = await res.json();

    if (data.success) {
      if (data.data) {
        Auth.playChime();
        Auth.showToast(data.message, 'success');
      } else {
        Auth.showToast('No more waiting tokens for this service!', 'info');
      }
      await loadMonitoringData();
      await loadCountersDropdown();
      await loadCountersTab();
    } else {
      Auth.showToast(data.message || 'Error calling next token', 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// Complete token
async function handleCompleteToken(tokenId) {
  try {
    const res = await Auth.fetchWithAuth(`/api/tokens/${tokenId}/complete`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      Auth.showToast(data.message, 'success');
      await loadMonitoringData();
      await loadCountersDropdown();
      await loadCountersTab();
      await loadHistoryTab();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

// Skip token
async function handleSkipToken(tokenId) {
  if (!confirm('Are you sure you want to skip this token?')) return;
  try {
    const res = await Auth.fetchWithAuth(`/api/tokens/${tokenId}/skip`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      Auth.showToast(data.message, 'info');
      await loadMonitoringData();
      await loadCountersDropdown();
      await loadCountersTab();
      await loadHistoryTab();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

// Cancel token (Admin)
async function handleCancelToken(tokenId) {
  if (!confirm('Are you sure you want to cancel this token?')) return;
  try {
    const res = await Auth.fetchWithAuth(`/api/tokens/${tokenId}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      Auth.showToast(data.message, 'info');
      await loadMonitoringData();
      await loadCountersDropdown();
      await loadCountersTab();
      await loadHistoryTab();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

// ==========================================================================
// Services Tab CRUD
// ==========================================================================
async function loadServicesTab() {
  try {
    const res = await Auth.fetchWithAuth('/api/services?all=true');
    const data = await res.json();
    if (!data.success) return;

    allServices = data.data;
    const tbody = document.getElementById('servicesTableBody');
    if (!tbody) return;

    tbody.innerHTML = allServices
      .map(
        (svc) => `
        <tr>
          <td><span class="badge badge-waiting" style="font-size:0.9rem;">${svc.code}</span></td>
          <td><strong>${svc.serviceName}</strong></td>
          <td style="color: var(--text-muted);">${svc.description || '—'}</td>
          <td>${svc.avgServiceTimeMinutes} min</td>
          <td>
            <span class="badge ${svc.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">
              ${svc.status}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button onclick="openEditServiceModal('${svc._id}')" class="btn btn-sm btn-secondary">Edit</button>
              <button onclick="handleDeleteService('${svc._id}')" class="btn btn-sm btn-danger">Delete</button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    console.error('Error loading services tab:', err);
  }
}

function openAddServiceModal() {
  document.getElementById('serviceModalTitle').textContent = 'Add New Service';
  document.getElementById('serviceFormId').value = '';
  document.getElementById('serviceNameInput').value = '';
  document.getElementById('serviceCodeInput').value = '';
  document.getElementById('serviceDescInput').value = '';
  document.getElementById('serviceTimeInput').value = '5';
  document.getElementById('serviceStatusInput').value = 'ACTIVE';

  document.getElementById('serviceModal').classList.add('active');
}

function openEditServiceModal(id) {
  const svc = allServices.find((s) => s._id === id);
  if (!svc) return;

  document.getElementById('serviceModalTitle').textContent = 'Edit Service';
  document.getElementById('serviceFormId').value = svc._id;
  document.getElementById('serviceNameInput').value = svc.serviceName;
  document.getElementById('serviceCodeInput').value = svc.code;
  document.getElementById('serviceDescInput').value = svc.description || '';
  document.getElementById('serviceTimeInput').value = svc.avgServiceTimeMinutes;
  document.getElementById('serviceStatusInput').value = svc.status;

  document.getElementById('serviceModal').classList.add('active');
}

async function handleSaveService(e) {
  e.preventDefault();
  const id = document.getElementById('serviceFormId').value;
  const body = {
    serviceName: document.getElementById('serviceNameInput').value.trim(),
    code: document.getElementById('serviceCodeInput').value.trim(),
    description: document.getElementById('serviceDescInput').value.trim(),
    avgServiceTimeMinutes: Number(document.getElementById('serviceTimeInput').value),
    status: document.getElementById('serviceStatusInput').value,
  };

  try {
    const url = id ? `/api/services/${id}` : '/api/services';
    const method = id ? 'PUT' : 'POST';

    const res = await Auth.fetchWithAuth(url, {
      method,
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      Auth.showToast(data.message, 'success');
      closeModal('serviceModal');
      await loadServicesTab();
      await loadMonitoringData();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

async function handleDeleteService(id) {
  if (!confirm('Are you sure you want to delete this service?')) return;
  try {
    const res = await Auth.fetchWithAuth(`/api/services/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      Auth.showToast(data.message, 'success');
      await loadServicesTab();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

// ==========================================================================
// Counters Tab CRUD
// ==========================================================================
async function loadCountersTab() {
  try {
    const res = await Auth.fetchWithAuth('/api/counters');
    const data = await res.json();
    if (!data.success) return;

    allCounters = data.data;
    const tbody = document.getElementById('countersTableBody');
    if (!tbody) return;

    tbody.innerHTML = allCounters
      .map(
        (cnt) => `
        <tr>
          <td><strong>${cnt.counterName}</strong></td>
          <td>${cnt.service ? cnt.service.serviceName : '<span class="text-muted">Unassigned</span>'}</td>
          <td>
            ${
              cnt.currentServingToken
                ? `<span class="badge badge-called">${cnt.currentServingToken.tokenNumber}</span>`
                : '<span style="color: var(--text-muted);">None</span>'
            }
          </td>
          <td>
            <span class="badge ${cnt.status === 'BUSY' ? 'badge-busy' : cnt.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}">
              ${cnt.status}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button onclick="openEditCounterModal('${cnt._id}')" class="btn btn-sm btn-secondary">Edit</button>
              <button onclick="handleDeleteCounter('${cnt._id}')" class="btn btn-sm btn-danger">Delete</button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    console.error('Error loading counters tab:', err);
  }
}

function openAddCounterModal() {
  document.getElementById('counterModalTitle').textContent = 'Add New Counter';
  document.getElementById('counterFormId').value = '';
  document.getElementById('counterNameInput').value = '';
  document.getElementById('counterStatusInput').value = 'ACTIVE';

  populateCounterServiceDropdown();
  document.getElementById('counterModal').classList.add('active');
}

function openEditCounterModal(id) {
  const cnt = allCounters.find((c) => c._id === id);
  if (!cnt) return;

  document.getElementById('counterModalTitle').textContent = 'Edit Counter';
  document.getElementById('counterFormId').value = cnt._id;
  document.getElementById('counterNameInput').value = cnt.counterName;
  document.getElementById('counterStatusInput').value = cnt.status;

  populateCounterServiceDropdown(cnt.service ? cnt.service._id : null);
  document.getElementById('counterModal').classList.add('active');
}

function populateCounterServiceDropdown(selectedId = null) {
  const select = document.getElementById('counterServiceSelect');
  select.innerHTML = '<option value="">-- Choose Assigned Service --</option>' +
    allServices
      .map(
        (s) =>
          `<option value="${s._id}" ${selectedId === s._id ? 'selected' : ''}>${s.serviceName} (${s.code})</option>`
      )
      .join('');
}

async function handleSaveCounter(e) {
  e.preventDefault();
  const id = document.getElementById('counterFormId').value;
  const body = {
    counterName: document.getElementById('counterNameInput').value.trim(),
    service: document.getElementById('counterServiceSelect').value,
    status: document.getElementById('counterStatusInput').value,
  };

  if (!body.service) {
    Auth.showToast('Please assign a service to this counter', 'warning');
    return;
  }

  try {
    const url = id ? `/api/counters/${id}` : '/api/counters';
    const method = id ? 'PUT' : 'POST';

    const res = await Auth.fetchWithAuth(url, {
      method,
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      Auth.showToast(data.message, 'success');
      closeModal('counterModal');
      await loadCountersTab();
      await loadCountersDropdown();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

async function handleDeleteCounter(id) {
  if (!confirm('Are you sure you want to delete this counter?')) return;
  try {
    const res = await Auth.fetchWithAuth(`/api/counters/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      Auth.showToast(data.message, 'success');
      await loadCountersTab();
      await loadCountersDropdown();
    } else {
      Auth.showToast(data.message, 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}

// ==========================================================================
// History Tab
// ==========================================================================
async function loadHistoryTab() {
  try {
    const res = await Auth.fetchWithAuth('/api/tokens/history');
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.getElementById('adminHistoryTableBody');
    if (!tbody) return;

    if (!data.data || data.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">No Queue History</div>
            <p>Historical token logs will appear here.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.data
      .map((tok) => {
        const dateStr = new Date(tok.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        let badgeClass = 'badge-completed';
        if (tok.status === 'SKIPPED') badgeClass = 'badge-skipped';
        if (tok.status === 'CANCELLED') badgeClass = 'badge-cancelled';
        if (tok.status === 'CALLED') badgeClass = 'badge-called';
        if (tok.status === 'WAITING') badgeClass = 'badge-waiting';

        return `
          <tr>
            <td class="token-cell">${tok.tokenNumber}</td>
            <td><strong>${tok.service ? tok.service.serviceName : '—'}</strong></td>
            <td>${tok.user ? tok.user.name : '—'}</td>
            <td>${tok.counter ? tok.counter.counterName : '—'}</td>
            <td style="color: var(--text-muted);">${dateStr}</td>
            <td><span class="badge ${badgeClass}">${tok.status}</span></td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Error loading history tab:', err);
  }
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}
