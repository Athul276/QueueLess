/**
 * QueueLess - User Dashboard Script
 */

let selectedServiceId = null;
let currentActiveTokenId = null;
let pollInterval = null;
let lastKnownStatus = null;
const alertedApproachingTokens = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  Auth.setupNavbar();

  // Request browser notification permission so desktop alerts work seamlessly
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  const user = Auth.getUser();
  const userNameElem = document.getElementById('welcomeUserName');
  if (userNameElem && user) {
    userNameElem.textContent = user.name;
  }

  await loadServices();
  await loadUserTokens();

  // Real-time polling every 3 seconds for live position updates
  pollInterval = setInterval(async () => {
    await loadUserTokens(true);
  }, 3000);
});

// Load available services
async function loadServices() {
  try {
    const res = await fetch('/api/services');
    const data = await res.json();

    const servicesContainer = document.getElementById('servicesList');
    if (!servicesContainer) return;

    if (!data.success || data.data.length === 0) {
      servicesContainer.innerHTML = '<p class="text-muted">No active services available right now.</p>';
      return;
    }

    servicesContainer.innerHTML = data.data
      .map(
        (svc) => `
        <div class="service-card ${selectedServiceId === svc._id ? 'selected' : ''}" 
             onclick="selectService('${svc._id}', '${svc.serviceName}', '${svc.code}')" id="svc-${svc._id}">
          <div class="service-card-top">
            <div class="service-code-badge">${svc.code}</div>
            <span class="badge badge-waiting">${svc.waitingCount} in line</span>
          </div>
          <h3 class="service-card-title">${svc.serviceName}</h3>
          <p class="service-card-desc">${svc.description || 'Standard service desk'}</p>
          <div class="service-card-footer">
            <span>⏱️ Avg: <strong>${svc.avgServiceTimeMinutes} min</strong></span>
            <span>Serving: <strong>${svc.currentServingToken}</strong></span>
          </div>
        </div>
      `
      )
      .join('');
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

// Select a service
function selectService(id, name, code) {
  selectedServiceId = id;
  document.querySelectorAll('.service-card').forEach((el) => el.classList.remove('selected'));
  const card = document.getElementById(`svc-${id}`);
  if (card) card.classList.add('selected');

  const btn = document.getElementById('generateTokenBtn');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<span>Generate Token for ${name}</span> <span class="pill-arrow">→</span>`;
  }
}

// Generate new token
async function handleGenerateToken() {
  if (!selectedServiceId) {
    Auth.showToast('Please select a service first', 'warning');
    return;
  }

  const btn = document.getElementById('generateTokenBtn');
  btn.disabled = true;
  btn.textContent = 'Generating Token...';

  try {
    const res = await Auth.fetchWithAuth('/api/tokens/generate', {
      method: 'POST',
      body: JSON.stringify({ serviceId: selectedServiceId }),
    });

    const data = await res.json();

    if (data.success) {
      Auth.showToast(`Token ${data.data.token.tokenNumber} generated!`, 'success');
      Auth.playChime();
      await loadServices();
      await loadUserTokens();
    } else {
      Auth.showToast(data.message || 'Could not generate token', 'error');
    }
  } catch (err) {
    Auth.showToast(err.message || 'Error communicating with server', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Get Token</span> <span class="pill-arrow">→</span>`;
  }
}

// Load user's active tokens and queue history
async function loadUserTokens(isPolling = false) {
  try {
    const res = await Auth.fetchWithAuth('/api/tokens/my-tokens');
    const data = await res.json();

    if (!data.success) return;

    const activeTokens = data.active || [];
    const historyTokens = data.history || [];

    const activeContainer = document.getElementById('activeTokenSection');
    const historyTableBody = document.getElementById('historyTableBody');

    // 1. Render Active Token (if any)
    if (activeTokens.length > 0) {
      const active = activeTokens[0]; // Primary active token
      currentActiveTokenId = active._id;

      // 1. Notification: Approaching Turn (2 tokens or 1 token ahead)
      if (active.status === 'WAITING' && active.position <= 2 && active.position > 0) {
        const alertKey = `${active._id}_pos_${active.position}`;
        if (!alertedApproachingTokens.has(alertKey)) {
          alertedApproachingTokens.add(alertKey);
          Auth.playChime();

          if (active.position === 2) {
            Auth.showToast(`⚠️ Heads Up! Only 2 tokens ahead of you (${active.tokenNumber}). Please start heading towards the counter.`, 'warning');
            Auth.sendBrowserNotification('QueueLess: Almost Your Turn!', {
              body: `Only 2 tokens ahead of you for ${active.service.serviceName} (Token ${active.tokenNumber}). Please proceed to the waiting area.`,
            });
          } else if (active.position === 1) {
            Auth.showToast(`🚨 Get Ready! You are NEXT in line (${active.tokenNumber})!`, 'warning');
            Auth.sendBrowserNotification('QueueLess: You Are Next!', {
              body: `You are next in line for ${active.service.serviceName} (Token ${active.tokenNumber}). Please stand by at the counter desk!`,
            });
          }
        }
      }

      // 2. Notification: Called Turn
      if (lastKnownStatus === 'WAITING' && active.status === 'CALLED') {
        Auth.playChime();
        const desk = active.counter ? active.counter.counterName : 'Counter Desk';
        Auth.showToast(`🔔 Attention! Your token ${active.tokenNumber} is now being called to ${desk}!`, 'warning');
        Auth.sendBrowserNotification('QueueLess: Your Turn Now!', {
          body: `Token ${active.tokenNumber} is now being called to ${desk}! Please proceed immediately.`,
        });
      }
      lastKnownStatus = active.status;

      let statusBadge = '';
      let approachingNotice = '';

      if (active.status === 'CALLED') {
        statusBadge = `<span class="badge badge-called">🔔 YOUR TURN - PROCEED TO ${active.counter ? active.counter.counterName : 'COUNTER'}</span>`;
      } else {
        statusBadge = `<span class="badge badge-waiting">⏳ IN QUEUE</span>`;

        if (active.position === 2) {
          approachingNotice = `
            <div style="background: #FFF0EB; border: 1px solid #FFBEA3; color: #D03D14; border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-top: 1rem; font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; text-align: left;">
              <span>⚡</span>
              <div>
                <div>Heads Up! Almost Your Turn</div>
                <div style="font-weight: 500; font-size: 0.8rem; color: #8F2C0B;">Only 2 tokens ahead of you. Please start moving towards the service desk.</div>
              </div>
            </div>
          `;
        } else if (active.position === 1) {
          approachingNotice = `
            <div style="background: #FFE8E0; border: 1.5px solid #FF5722; color: #C93913; border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-top: 1rem; font-size: 0.88rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; text-align: left; animation: pulse-ring 2s infinite;">
              <span>🚨</span>
              <div>
                <div>You Are NEXT In Line!</div>
                <div style="font-weight: 500; font-size: 0.8rem; color: #8F2C0B;">Only 1 token ahead. Please be ready at the counter desk.</div>
              </div>
            </div>
          `;
        }
      }

      // Format estimated wait time
      const waitDisplay =
        active.status === 'CALLED'
          ? 'NOW'
          : active.estimatedWaitMinutes > 0
          ? `~${active.estimatedWaitMinutes} min`
          : 'Ready soon';

      activeContainer.innerHTML = `
        <div class="ticket-card">
          <div class="ticket-tag">QueueLess Digital Pass</div>
          <div class="ticket-service-name">${active.service.serviceName}</div>
          <div class="ticket-number">${active.tokenNumber}</div>
          <div>${statusBadge}</div>
          ${approachingNotice}

          <div class="ticket-divider">
            <div class="ticket-notch-left"></div>
            <div class="ticket-divider-line"></div>
            <div class="ticket-notch-right"></div>
          </div>

          <div class="ticket-stats-grid">
            <div class="ticket-stat-box">
              <div class="ticket-stat-label">Position In Line</div>
              <div class="ticket-stat-value">${active.status === 'CALLED' ? '0' : String(active.position).padStart(2, '0')}</div>
            </div>
            <div class="ticket-stat-box">
              <div class="ticket-stat-label">Estimated Wait</div>
              <div class="ticket-stat-value">${waitDisplay}</div>
            </div>
          </div>

          <div style="background: #FAF8F5; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; text-align: left;">
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 0.35rem;">
              <span style="color: var(--text-muted); font-weight: 600;">Currently Serving:</span>
              <strong style="color: var(--primary);">${active.currentServing}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem;">
              <span style="color: var(--text-muted); font-weight: 600;">Waiting ahead:</span>
              <strong>${active.waitingAhead} people</strong>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button onclick="cancelActiveToken('${active._id}')" class="btn btn-sm btn-danger">Cancel Token</button>
            <a href="/display" target="_blank" class="btn btn-sm btn-outline">Open Live Screen ↗</a>
          </div>
        </div>
      `;

      // Also render Live Queue Tracker breakdown
      renderQueueTracker(active);
    } else {
      currentActiveTokenId = null;
      lastKnownStatus = null;
      activeContainer.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎫</div>
          <h3 style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 800; margin-bottom: 0.5rem;">No Active Token</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">
            Select a service from the left and click "Get Token" to reserve your spot in line.
          </p>
          <a href="#servicesSection" class="btn btn-primary">
            <span>Select Service</span>
            <span class="pill-arrow">↓</span>
          </a>
        </div>
      `;

      const trackerContainer = document.getElementById('liveQueueTracker');
      if (trackerContainer) {
        trackerContainer.innerHTML = '<p class="text-muted" style="text-align:center; padding: 1.5rem 0;">No active queue to track.</p>';
      }
    }

    // 2. Render History Table
    if (historyTableBody) {
      if (historyTokens.length === 0) {
        historyTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="empty-state">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-title">No Queue History Yet</div>
              <p>Your completed or cancelled tokens will appear here.</p>
            </td>
          </tr>
        `;
      } else {
        historyTableBody.innerHTML = historyTokens
          .map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            let badgeClass = 'badge-completed';
            if (item.status === 'SKIPPED') badgeClass = 'badge-skipped';
            if (item.status === 'CANCELLED') badgeClass = 'badge-cancelled';

            return `
              <tr>
                <td class="token-cell">${item.tokenNumber}</td>
                <td><strong>${item.service ? item.service.serviceName : 'N/A'}</strong></td>
                <td>${item.counter ? item.counter.counterName : '—'}</td>
                <td style="color: var(--text-muted);">${dateStr}</td>
                <td><span class="badge ${badgeClass}">${item.status}</span></td>
              </tr>
            `;
          })
          .join('');
      }
    }
  } catch (err) {
    if (!isPolling) console.error('Error loading tokens:', err);
  }
}

// Render dynamic visual queue ladder (e.g. A021 SERVING, A022 WAITING, ... A025 YOU)
async function renderQueueTracker(userActiveToken) {
  const trackerContainer = document.getElementById('liveQueueTracker');
  if (!trackerContainer || !userActiveToken) return;

  try {
    const res = await fetch(`/api/tokens/admin/monitoring?serviceId=${userActiveToken.service._id}`);
    const data = await res.json();

    if (!data.success || !data.activeQueue) return;

    const list = data.activeQueue.slice(0, 7); // Show top 7 tokens

    if (list.length === 0) {
      trackerContainer.innerHTML = '<p class="text-muted">Queue is currently clear.</p>';
      return;
    }

    trackerContainer.innerHTML = `
      <div class="queue-tracker-list">
        ${list
          .map((tok) => {
            const isMe = tok._id === userActiveToken._id;
            const isServing = tok.status === 'CALLED';

            let tag = isServing ? 'NOW SERVING' : 'WAITING';
            if (isMe) tag = isServing ? 'NOW SERVING (YOU)' : 'YOU';

            let itemClass = 'queue-item';
            if (isServing) itemClass += ' is-serving';
            if (isMe && !isServing) itemClass += ' is-you';

            return `
              <div class="${itemClass}">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span class="queue-item-token">${tok.tokenNumber}</span>
                  <span class="queue-item-meta">${tok.service ? tok.service.serviceName : ''}</span>
                </div>
                <div>
                  <span class="badge ${isServing ? 'badge-called' : isMe ? 'badge-waiting' : 'badge-skipped'}">
                    ${tag}
                  </span>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } catch (e) {
    console.error('Error rendering queue tracker:', e);
  }
}

// Cancel user's token
async function cancelActiveToken(tokenId) {
  if (!confirm('Are you sure you want to cancel your queue token?')) return;

  try {
    const res = await Auth.fetchWithAuth(`/api/tokens/${tokenId}/cancel`, {
      method: 'POST',
    });
    const data = await res.json();

    if (data.success) {
      Auth.showToast('Token cancelled successfully', 'info');
      await loadServices();
      await loadUserTokens();
    } else {
      Auth.showToast(data.message || 'Error cancelling token', 'error');
    }
  } catch (err) {
    Auth.showToast(err.message, 'error');
  }
}
