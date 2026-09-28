/**
 * QueueLess - Authentication & Common Client Utilities
 */

const Auth = {
  getToken() {
    return localStorage.getItem('queueless_token');
  },

  getUser() {
    const userStr = localStorage.getItem('queueless_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setSession(token, user) {
    localStorage.setItem('queueless_token', token);
    localStorage.setItem('queueless_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('queueless_token');
    localStorage.removeItem('queueless_user');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  requireAuth(requiredRole = null) {
    if (!this.isLoggedIn()) {
      window.location.href = '/login';
      return false;
    }
    if (requiredRole === 'admin' && !this.isAdmin()) {
      window.location.href = '/user-dashboard';
      return false;
    }
    return true;
  },

  logout() {
    this.clearSession();
    window.location.href = '/login';
  },

  // Authenticated fetch wrapper
  async fetchWithAuth(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      this.clearSession();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  },

  // Setup common navigation header
  setupNavbar() {
    const user = this.getUser();
    const navUserContainer = document.getElementById('navUserContainer');
    if (!navUserContainer) return;

    if (user) {
      navUserContainer.innerHTML = `
        <div class="user-badge">
          <span>👤 ${user.name}</span>
          <span class="role-tag">${user.role}</span>
        </div>
        ${
          user.role === 'admin'
            ? `<a href="/admin-dashboard" class="btn btn-sm btn-outline">Admin Panel</a>`
            : `<a href="/user-dashboard" class="btn btn-sm btn-outline">My Queue</a>`
        }
        <button id="logoutBtn" class="btn btn-sm btn-secondary">Logout</button>
      `;

      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        Auth.logout();
      });
    } else {
      navUserContainer.innerHTML = `
        <a href="/login" class="btn btn-sm btn-outline">Login</a>
        <a href="/register" class="btn btn-sm btn-primary">
          <span>Register</span>
          <span class="pill-arrow">→</span>
        </a>
      `;
    }
  },

  // UI Toast notification helper
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Synthesized chime audio for calling tokens
  playChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15); // D6

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.85);
      osc2.stop(ctx.currentTime + 0.85);
    } catch (e) {
      console.log('Audio not supported or restricted by browser autoplay policy');
    }
  },

  // Native Browser / Desktop Notification
  sendBrowserNotification(title, options = {}) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/images/favicon.png',
        badge: '/images/favicon.png',
        ...options,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, options);
        }
      });
    }
  },
};

