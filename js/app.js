/**
 * TMY Audio System — Global Logic, Session & Audio Engine
 * Supports 100% offline (file:///) and web server (http://) execution.
 */

// ============================================================================
// 1. DATA STORES & SESSION MANAGEMENT (7-Day Expiry)
// ============================================================================

const DEFAULT_USERS = [
  { id: 'thomas', name: 'Thomas', role: 'ADMIN', status: 'ACTIVE', key: 'ADMIN2026' },
  { id: 'beatmaker', name: 'BeatMaker', role: 'PRODUCER', status: 'ACTIVE', key: 'PROD2026' },
  { id: 'ltmrx', name: 'LTMRX', role: 'VIP', status: 'ACTIVE', key: 'VIP2026' },
  { id: 'marius', name: 'Marius', role: 'ARTIST', status: 'ACTIVE', key: 'MARIUS' },
  { id: 'artist1', name: 'SoundArchitect', role: 'ARTIST (FULL ACCESS)', status: 'ACTIVE', key: 'USER2026' }
];

const DEFAULT_PUBLIC_TRACKS = [
  { id: 'p1', title: 'LOOPKIT_1', bpm: 140, key: 'C MIN', date: '2026-08-20', src: window._uploadedFilename ? 'beats/' + window._uploadedFilename : 'beats/LOOPKIT1.wav', stems: '', flp: '', credits: 'TMY EXCLUSIVE', isLanding: true },
  { id: 'p2', title: 'BAHN_CHILL', bpm: 130, key: 'F# MIN', date: '2026-08-21', src: 'beats/bahn chill.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: true },
  { id: 'p3', title: 'BAHN_RUHIGE', bpm: 120, key: 'A MIN', date: '2026-08-21', src: 'beats/bahn ruhige.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: false },
  { id: 'p4', title: 'BEATSWITCH', bpm: 145, key: 'D MIN', date: '2026-08-21', src: 'beats/beatswitch.wav', stems: '', flp: '', credits: 'TMY AUDIO', isLanding: false },
  { id: 'p5', title: 'MAX_NACKE_V2', bpm: 125, key: 'E MIN', date: '2026-08-21', src: 'beats/max nacke_2.wav', stems: '', flp: '', credits: 'MAX NACKE x TMY', isLanding: false },
  { id: 'p6', title: 'PULP', bpm: 138, key: 'G MIN', date: '2026-08-21', src: 'beats/pulp.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: false },
  { id: 'p7', title: 'THOMAS_MCDONBALDS', bpm: 142, key: 'B MIN', date: '2026-08-21', src: 'beats/thomas beat mcdonbalds.wav', stems: '', flp: '', credits: 'PROD. TMY', isLanding: false }
];

const DEFAULT_PRIVATE_TRACKS = [];

// Helper: Local Storage wrappers

  const storedUsers = localStorage.getItem('tmy_users');
  if (storedUsers) {
    let parsedUsers = JSON.parse(storedUsers);
    let updated = false;
    parsedUsers.forEach(u => {
      if (u.role === 'RESTRICTED') {
        u.role = 'ARTIST';
        updated = true;
      }
      if (u.role === 'USER') {
        u.role = 'ARTIST (FULL ACCESS)';
        updated = true;
      }
    });
    if (updated) localStorage.setItem('tmy_users', JSON.stringify(parsedUsers));
  }

function getStoredUsers() {
  const data = localStorage.getItem('tmy_users');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
  }
  return DEFAULT_USERS;
}

function saveStoredUsers(users) {
  localStorage.setItem('tmy_users', JSON.stringify(users));
}

function getStoredTracks(isPublic = true) {
  const key = isPublic ? 'tmy_public_tracks' : 'tmy_private_tracks';
  const data = localStorage.getItem(key);
  let result = null;
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        let updated = false;
        parsed.forEach(t => {
          if (t && t.src && !t.src.startsWith('beats/')) {
            t.src = 'beats/' + t.src;
            updated = true;
          }
          if (t && t.isPublic !== isPublic) {
            t.isPublic = isPublic;
            updated = true;
          }
        });
        if (updated) localStorage.setItem(key, JSON.stringify(parsed));
        result = parsed;
      }
    } catch (e) {}
  }
  if (!result) {
    const defaults = isPublic ? JSON.parse(JSON.stringify(DEFAULT_PUBLIC_TRACKS)) : JSON.parse(JSON.stringify(DEFAULT_PRIVATE_TRACKS));
    defaults.forEach(t => { if (t) t.isPublic = isPublic; });
    localStorage.setItem(key, JSON.stringify(defaults));
    result = defaults;
  }
  return result;
}

function saveStoredTracks(isPublic, tracks) {
  const key = isPublic ? 'tmy_public_tracks' : 'tmy_private_tracks';
  localStorage.setItem(key, JSON.stringify(tracks));
}

// 7-Day Session Management
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DB_VERSION = "2";
if (localStorage.getItem('tmy_db_ver') !== DB_VERSION) {
  localStorage.removeItem('tmy_public_tracks');
  localStorage.removeItem('tmy_private_tracks');
  localStorage.setItem('tmy_db_ver', DB_VERSION);
}

function getViewportHeight() {
  return window.innerHeight;
}

window.generateShareLink = function(trackId, isPublic) {
  try {
    const tracks = getStoredTracks(isPublic);
    const track = tracks.find(t => t && t.id === trackId);
    if (!track) {
      alert("ERROR: Track not found for sharing.");
      return;
    }
    
    const payload = {
      title: track.title,
      bpm: track.bpm,
      key: track.key,
      trackType: track.trackType,
      src: track.src
    };
    
    const jsonStr = JSON.stringify(payload);
    const base64Data = btoa(encodeURIComponent(jsonStr));
    
    let baseUrl = window.location.href.split('?')[0];
    baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    const shareUrl = baseUrl + '/share.html?data=' + base64Data;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("SHARE LINK COPIED TO CLIPBOARD!\n\n" + shareUrl);
      }).catch(() => {
        prompt("Copy this link to share the track:", shareUrl);
      });
    } else {
      prompt("Copy this link to share the track:", shareUrl);
    }
  } catch(e) {
    alert("Error generating share link: " + e.message);
  }
};

function getVaultSession() {
  const raw = localStorage.getItem('tmy_vault_session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (Date.now() - session.timestamp > SEVEN_DAYS_MS) {
      clearVaultSession();
      return null;
    }
    const users = getStoredUsers();
    const user = users.find(u => u.id === session.user.id);
    if (!user || user.status === 'REVOKED') {
      clearVaultSession();
      return null;
    }
    return user;
  } catch (e) {
    clearVaultSession();
    return null;
  }
}

function setVaultSession(user) {
  localStorage.setItem('tmy_vault_session', JSON.stringify({
    user: user,
    timestamp: Date.now()
  }));
}

function clearVaultSession() {
  localStorage.removeItem('tmy_vault_session');
}

function verifyKeyAndLogin(keyInput) {
  const trimmed = (keyInput || '').trim().toUpperCase();
  const users = getStoredUsers();
  const user = users.find(u => u.key.toUpperCase() === trimmed && u.status === 'ACTIVE');
  if (user) {
    setVaultSession(user);
    return user;
  }
  return null;
}

// ============================================================================
// 2. BULLETPROOF AUDIO & WAVEFORM ENGINE (100% Local & Web Compatible)
// ============================================================================

const TmyAudioStore = {
  memoryBlobs: new Map(),
  
  saveAudio(trackId, fileBlob) {
    if (!fileBlob) return;
    try {
      const url = URL.createObjectURL(fileBlob);
      this.memoryBlobs.set(trackId, url);
    } catch(e) {}

    // Non-blocking IndexedDB background persistence
    try {
      if (typeof indexedDB !== 'undefined') {
        const req = indexedDB.open('tmy_audio_store_v1', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('audio_blobs')) {
            db.createObjectStore('audio_blobs');
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('audio_blobs', 'readwrite');
          tx.objectStore('audio_blobs').put(fileBlob, trackId);
        };
      }
    } catch(e) {}
  },

  async getAudioSrc(trackId, defaultSrc) {
    if (this.memoryBlobs.has(trackId)) {
      return this.memoryBlobs.get(trackId);
    }
    try {
      if (typeof indexedDB !== 'undefined') {
        const blob = await new Promise((resolve) => {
          const timer = setTimeout(() => resolve(null), 120);
          try {
            const req = indexedDB.open('tmy_audio_store_v1', 1);
            req.onsuccess = (e) => {
              const db = e.target.result;
              if (!db || !db.objectStoreNames.contains('audio_blobs')) {
                clearTimeout(timer);
                return resolve(null);
              }
              const tx = db.transaction('audio_blobs', 'readonly');
              const getReq = tx.objectStore('audio_blobs').get(trackId);
              getReq.onsuccess = () => {
                clearTimeout(timer);
                resolve(getReq.result || null);
              };
              getReq.onerror = () => {
                clearTimeout(timer);
                resolve(null);
              };
            };
            req.onerror = () => {
              clearTimeout(timer);
              resolve(null);
            };
          } catch(e) {
            clearTimeout(timer);
            resolve(null);
          }
        });
        if (blob) {
          const url = URL.createObjectURL(blob);
          this.memoryBlobs.set(trackId, url);
          return url;
        }
      }
    } catch(e) {}
    return defaultSrc;
  }
};

class TmyAudioEngine {
  constructor() {
    this.audio = new Audio();
    this.currentTrackId = null;
    this.isPlaying = false;
    this.canvasWatchers = new Map();
    this.onTrackChangeCallback = null;

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyState();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyState();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notifyState();
      if (this.onEndedCallback) this.onEndedCallback();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      this.isPlaying = false;
      this.notifyState();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.renderAllCanvases();
    });
  }

  async playTrack(trackId, src) {
    if (this.currentTrackId === trackId) {
      if (this.audio.paused) {
        this.audio.play().catch(e => console.warn('Audio play request interrupted:', e));
      } else {
        this.audio.pause();
      }
      return;
    }

    this.currentTrackId = trackId;
    
    const resolvedSrc = await TmyAudioStore.getAudioSrc(trackId, src);
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch(e) {}
    this.audio.src = resolvedSrc;
    this.audio.load();
    this.audio.currentTime = 0;
    this.audio.play().catch(e => console.warn('Autoplay error or local audio load:', e));
    this.notifyState();
    if (this.onTrackChangeCallback) this.onTrackChangeCallback(trackId);
  }

  pause() {
    this.audio.pause();
  }

  seek(percent) {
    if (this.audio.duration) {
      this.audio.currentTime = this.audio.duration * Math.max(0, Math.min(1, percent));
    }
  }

  registerCanvas(trackId, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const barCount = 60;
    const heights = [];
    let seed = 0;
    for (let i = 0; i < trackId.length; i++) seed += trackId.charCodeAt(i);
    for (let i = 0; i < barCount; i++) {
      const val = Math.abs(Math.sin(seed * (i + 1) * 0.15) * 0.7) + 0.25;
      heights.push(val);
    }

    const draw = () => {
      const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      const isCurrent = (this.currentTrackId === trackId);
      const progress = isCurrent && this.audio.duration ? (this.audio.currentTime / this.audio.duration) : 0;
      
      const barWidth = (w / barCount) * 0.6;
      const gap = (w / barCount) * 0.4;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const barH = heights[i] * h * 0.85;
        const y = (h - barH) / 2;

        const isPlayed = (i / barCount) <= progress;
        ctx.fillStyle = isPlayed ? '#1D1D1F' : '#D2D2D7';
        
        const r = Math.min(barWidth / 2, 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, r);
        ctx.fill();
      }
    };

    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      if (this.currentTrackId === trackId) {
        this.seek(pct);
      } else {
        const src = canvas.getAttribute('data-src');
        if (src) {
          this.playTrack(trackId, src);
          this.audio.addEventListener('canplay', () => {
            this.seek(pct);
          }, { once: true });
        }
      }
    };

    this.canvasWatchers.set(trackId, { canvas, draw });
    draw();
  }

  renderAllCanvases() {
    this.canvasWatchers.forEach(watcher => {
      if (document.body.contains(watcher.canvas)) {
        watcher.draw();
      }
    });
  }

  notifyState() {
    this.renderAllCanvases();
    document.querySelectorAll('[data-track-play-btn]').forEach(btn => {
      const btnTrackId = btn.getAttribute('data-track-play-btn');
      const isThisTrackPlaying = (this.currentTrackId === btnTrackId && this.isPlaying);
      const playIcon = btn.querySelector('.play-icon');
      const pauseIcon = btn.querySelector('.pause-icon');
      if (playIcon && pauseIcon) {
        if (isThisTrackPlaying) {
          playIcon.classList.add('hidden');
          pauseIcon.classList.remove('hidden');
        } else {
          playIcon.classList.remove('hidden');
          pauseIcon.classList.add('hidden');
        }
      }
    });
  }
}

window.tmyEngine = new TmyAudioEngine();

// ============================================================================
// 3. LANDING PAGE SETUP (`index.html`)
// ============================================================================

function setupLandingPlayer() {
  const playerContainer = document.getElementById('single-waveform');
  if (!playerContainer) return;

  const publicTracks = getStoredTracks(true).filter(t => t.isLanding === true && t.trackType !== 'DRAFT');
  let currentIndex = 0;

  const titleEl = document.getElementById('player-title');
  const specsEl = document.getElementById('player-specs');
  const btnPlay = document.getElementById('btn-play');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const copyBtn = document.getElementById('copy-btn');
  const skeleton = document.getElementById('waveform-skeleton');

  playerContainer.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'waveform-canvas';
  playerContainer.appendChild(canvas);

  function loadCurrentTrack() {
    const track = publicTracks[currentIndex];
    if (!track) return;
    if (titleEl) titleEl.innerText = track.title;
    if (specsEl) specsEl.innerText = `${track.bpm} BPM // ${track.key}`;
    if (skeleton) skeleton.style.display = 'none';

    btnPlay.setAttribute('data-track-play-btn', track.id);
    canvas.setAttribute('data-src', track.src);
    window.tmyEngine.registerCanvas(track.id, canvas);
    window.tmyEngine.notifyState();
  }

  btnPlay.addEventListener('click', () => {
    const track = publicTracks[currentIndex];
    window.tmyEngine.playTrack(track.id, track.src);
  });

  btnNext.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % publicTracks.length;
    loadCurrentTrack();
    const track = publicTracks[currentIndex];
    window.tmyEngine.playTrack(track.id, track.src);
  });

  btnPrev.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + publicTracks.length) % publicTracks.length;
    loadCurrentTrack();
    const track = publicTracks[currentIndex];
    window.tmyEngine.playTrack(track.id, track.src);
  });

  window.tmyEngine.onEndedCallback = () => {
    currentIndex = (currentIndex + 1) % publicTracks.length;
    loadCurrentTrack();
    const track = publicTracks[currentIndex];
    window.tmyEngine.playTrack(track.id, track.src);
  };

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const track = publicTracks[currentIndex];
      const textToCopy = `${track.title} - ${track.bpm} BPM // ${track.key}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = '[ COPIED ]';
        copyBtn.classList.add('text-online', 'border-online');
        copyBtn.classList.remove('text-primary', 'border-subtle');
        setTimeout(() => {
          copyBtn.innerText = originalText;
          copyBtn.classList.remove('text-online', 'border-online');
          copyBtn.classList.add('text-primary', 'border-subtle');
        }, 2000);
      });
    });
  }

  loadCurrentTrack();
}

// ============================================================================
// 4. VAULT PAGE SETUP (`vault.html`)
// ============================================================================

function setupVaultPage() {
  const unauthView = document.getElementById('unauthorized-state');
  const authView = document.getElementById('authorized-state');
  if (!unauthView || !authView) return;

  const urlParams = new URLSearchParams(window.location.search);
  const keyParam = urlParams.get('key');

  let currentUser = null;
  if (keyParam) {
    currentUser = verifyKeyAndLogin(keyParam);
    if (currentUser) {
      window.history.replaceState(null, '', 'vault.html');
    }
  } else {
    currentUser = getVaultSession();
  }

  if (currentUser) {
    if (currentUser.role === 'ADMIN' || currentUser.role === 'PRODUCER') {
      window.location.href = 'admin.html';
      return;
    }
    renderAuthorizedVault(currentUser);
  } else {
    renderUnauthorizedVault();
  }

  const vaultForm = document.getElementById('vault-auth-form');
  if (vaultForm) {
    vaultForm.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('vault-key-input');
      const val = input ? input.value : '';
      const user = verifyKeyAndLogin(val);
      if (user) {
        if (user.role === 'ADMIN' || user.role === 'PRODUCER') {
          window.location.href = 'admin.html';
          return;
        }
        renderAuthorizedVault(user);
      } else {
        alert('ACCESS DENIED: Invalid or revoked authorization key.');
      }
    };
  }
}

function renderUnauthorizedVault() {
  const unauthView = document.getElementById('unauthorized-state');
  const authView = document.getElementById('authorized-state');
  const main = document.getElementById('main-content');
  const statusBar = document.getElementById('status-bar');

  if (unauthView) unauthView.classList.remove('hidden');
  if (authView) {
    authView.classList.add('hidden');
    authView.classList.remove('flex');
  }
  if (main) main.classList.add('justify-center');


}

function renderAuthorizedVault(user) {
  const unauthView = document.getElementById('unauthorized-state');
  const authView = document.getElementById('authorized-state');
  const main = document.getElementById('main-content');
  const statusBar = document.getElementById('status-bar');

  if (unauthView) unauthView.classList.add('hidden');
  if (authView) {
    authView.classList.remove('hidden');
    authView.classList.add('flex');
  }
  if (main) main.classList.remove('justify-center');

  const nav = document.querySelector('header nav');
  if (nav) {
    nav.innerHTML = `
      <div class="flex items-center gap-4 text-xs">
        <span class="text-primary font-bold hidden sm:inline" id="vault-user-tag">${user.name.toUpperCase()} [${user.role}]</span>
        <button id="vault-logout-btn" class="text-muted hover:text-primary transition-colors touch-target">[ LOGOUT ]</button>
      </div>
    `;
    const logoutBtn = document.getElementById('vault-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        clearVaultSession();
        window.location.reload();
      };
    }
  }

  const tabsContainer = document.getElementById('vault-tabs-container');
  const publicTabBtn = document.getElementById('tab-btn-public');
  const privateTabBtn = document.getElementById('tab-btn-private');
  const tracklistHeaderTitle = document.getElementById('tracklist-header-title');

  let activeTab = 'public';

  if (user.role === 'ARTIST') {
    if (tabsContainer) tabsContainer.classList.add('hidden');
    if (tracklistHeaderTitle) tracklistHeaderTitle.innerText = `PRIVATE VAULT // ASSIGNED TO: ${user.name.toUpperCase()}`;
    activeTab = 'private';
  } else {
    if (tabsContainer) tabsContainer.classList.remove('hidden');
    if (tracklistHeaderTitle) tracklistHeaderTitle.innerText = `PUBLIC VAULT // ALL STEMS`;

    if (publicTabBtn && privateTabBtn) {
      publicTabBtn.onclick = () => {
        activeTab = 'public';
        publicTabBtn.className = 'text-xs font-bold text-primary border-b-2 border-primary pb-1 uppercase tracking-widest transition-colors touch-target';
        privateTabBtn.className = 'text-xs font-bold text-muted hover:text-primary pb-1 uppercase tracking-widest transition-colors touch-target';
        if (tracklistHeaderTitle) tracklistHeaderTitle.innerText = `PUBLIC VAULT // ALL STEMS`;
        renderVaultTracklist(activeTab, user);
      };

      privateTabBtn.onclick = () => {
        activeTab = 'private';
        privateTabBtn.className = 'text-xs font-bold text-primary border-b-2 border-primary pb-1 uppercase tracking-widest transition-colors touch-target';
        publicTabBtn.className = 'text-xs font-bold text-muted hover:text-primary pb-1 uppercase tracking-widest transition-colors touch-target';
        if (tracklistHeaderTitle) tracklistHeaderTitle.innerText = `PRIVATE VAULT // ASSIGNED TO: ${user.name.toUpperCase()}`;
        renderVaultTracklist(activeTab, user);
      };
    }
  }

  const adminNav = document.getElementById('vault-admin-link');
  if (adminNav) {
    if (user.role === 'ADMIN' || user.role === 'PRODUCER') {
      adminNav.classList.remove('hidden');
    } else {
      adminNav.classList.add('hidden');
    }
  }

  renderVaultTracklist(activeTab, user);
}

function renderVaultTracklist(tab, user) {
  const container = document.getElementById('vault-tracklist-container');
  if (!container) return;

  container.innerHTML = '';

  let tracks = [];
  if (tab === 'public') {
    tracks = (getStoredTracks(true) || []).filter(t => !t.isDraft && t.trackType !== 'DRAFT');
  } else {
    // Collect all tracks across private and public stores so assigned tracks are never missed
    const allTracks = [...(getStoredTracks(false) || []), ...(getStoredTracks(true) || [])];
    const uniqueMap = new Map();
    allTracks.forEach(t => { if (t && t.id) uniqueMap.set(t.id, t); });
    const uniqueTracks = Array.from(uniqueMap.values());

    const userIdLower = (user.id || '').toLowerCase();
    const userNameLower = (user.name || '').toLowerCase();

    tracks = uniqueTracks.filter(t => {
      if (!t) return false;
      if (user.role === 'ADMIN') return true;
      if (t.isDraft && user.role !== 'ADMIN' && user.role !== 'PRODUCER') return false;
      
      const assigned = Array.isArray(t.assignedTo) 
        ? t.assignedTo 
        : (typeof t.assignedTo === 'string' && t.assignedTo ? [t.assignedTo] : []);

      return assigned.some(a => {
        const aLower = String(a).toLowerCase();
        return aLower === userIdLower || aLower === userNameLower;
      });
    });
  }

  if (user.role !== 'ADMIN' && user.role !== 'PRODUCER') {
    tracks = tracks.filter(t => !t.isDraft && t.trackType !== 'DRAFT');
  }

  if (tracks.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center border border-dashed border-subtle text-muted text-xs uppercase tracking-widest">
        NO EXCLUSIVE TRACKS CURRENTLY ASSIGNED TO YOUR SECTOR.
      </div>
    `;
    return;
  }

  tracks.forEach(track => {
    const row = document.createElement('div');
    row.className = 'border-b border-subtle py-4 flex flex-col transition-colors';

    row.innerHTML = `
      <div class="flex items-center justify-between gap-4 cursor-pointer select-none group" data-accordion-trigger="${track.id}">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <button class="w-9 h-9 rounded-full border border-subtle flex items-center justify-center text-primary hover:bg-black/5 transition-all flex-shrink-0 touch-target" data-track-play-btn="${track.id}">
            <svg class="w-4 h-4 play-icon ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg class="w-4 h-4 pause-icon hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
          
          <div class="flex flex-col truncate">
            <span class="font-bold text-sm text-primary tracking-wide group-hover:underline truncate">${track.title}</span>
            <span class="text-xs text-muted">${track.bpm} BPM // ${track.key} <span class="border border-subtle px-1 rounded ml-1 text-[9px] uppercase">${track.trackType || 'BEAT'}</span></span>
          </div>
        </div>

        <div class="hidden md:block text-xs text-muted font-mono">
          ${track.date}
        </div>

        <div class="flex items-center gap-3">
          <button class="text-xs border border-subtle px-2.5 py-1.5 hover:bg-black/5 transition-colors uppercase font-medium hidden sm:flex items-center gap-1.5 touch-target" data-download-action="MP3" data-track-title="${track.title}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>PREVIEW</span>
          </button>

          <span class="text-xs text-muted group-hover:text-primary transition-transform duration-200 transform accordion-arrow" id="arrow-${track.id}">
            [ + ]
          </span>
        </div>
      </div>

      <div class="accordion-content" id="accordion-${track.id}">
        <div class="w-full h-12 relative mb-4 bg-surface/50 rounded overflow-hidden">
          <canvas class="waveform-canvas" id="canvas-${track.id}" data-src="${track.src}"></canvas>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button class="p-3 bg-surface hover:bg-black/5 border border-subtle rounded text-left flex flex-col justify-between gap-2 transition-all relative group/btn" data-download-action="STEMS" data-track-title="${track.title}">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-primary">[ STEMS (WAV-ZIP) ]</span>
              <span class="btn-spinner hidden">
                <svg class="w-3.5 h-3.5 animate-spin-fast text-primary" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              </span>
            </div>
            <span class="text-[10px] text-muted">24-Bit Dry & Wet Stems</span>
          </button>

          <button class="p-3 bg-surface hover:bg-black/5 border border-subtle rounded text-left flex flex-col justify-between gap-2 transition-all relative group/btn" data-download-action="FLP" data-track-title="${track.title}">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-primary">[ PROJECT (.FLP) ]</span>
              <span class="btn-spinner hidden">
                <svg class="w-3.5 h-3.5 animate-spin-fast text-primary" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              </span>
            </div>
            <span class="text-[10px] text-muted">FL Studio Project File</span>
          </button>

          <div class="p-3 bg-surface/50 border border-subtle rounded text-left flex flex-col justify-between gap-1 relative">
            <span class="text-[11px] font-bold uppercase tracking-wider text-muted">[ CREDITS ]</span>
            <span class="text-[10px] text-primary truncate font-medium">${track.credits || 'PROD. TMY'}</span>
            ${user && (user.role === 'ADMIN' || user.role === 'PRODUCER') ? `
            <button class="absolute top-2 right-2 text-[9px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors bg-card z-10" onclick="window.generateShareLink('${track.id}', ${track.isPublic})">
              [ SHARE ]
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    container.appendChild(row);

    const canvas = row.querySelector(`#canvas-${track.id}`);
    if (canvas) window.tmyEngine.registerCanvas(track.id, canvas);

    const playBtn = row.querySelector(`[data-track-play-btn="${track.id}"]`);
    if (playBtn) {
      playBtn.onclick = (e) => {
        e.stopPropagation();
        window.tmyEngine.playTrack(track.id, track.src);
      };
    }

    const trigger = row.querySelector(`[data-accordion-trigger="${track.id}"]`);
    const accordion = row.querySelector(`#accordion-${track.id}`);
    const arrow = row.querySelector(`#arrow-${track.id}`);
    if (trigger && accordion) {
      trigger.onclick = () => {
        const isOpen = accordion.classList.contains('open');
        document.querySelectorAll('.accordion-content.open').forEach(el => {
          if (el !== accordion) {
            el.classList.remove('open');
            const id = el.id.replace('accordion-', '');
            const otherArrow = document.getElementById(`arrow-${id}`);
            if (otherArrow) otherArrow.innerText = '[ + ]';
          }
        });

        if (isOpen) {
          accordion.classList.remove('open');
          if (arrow) arrow.innerText = '[ + ]';
        } else {
          accordion.classList.add('open');
          if (arrow) arrow.innerText = '[ − ]';
          setTimeout(() => window.tmyEngine.renderAllCanvases(), 50);
        }
      };
    }

    row.querySelectorAll('[data-download-action]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-download-action');
        const title = btn.getAttribute('data-track-title');
        const spinner = btn.querySelector('.btn-spinner');
        
        if (spinner) spinner.classList.remove('hidden');
        btn.classList.add('opacity-70');

        console.log(`[n8n Webhook] Triggered: ${action} for ${title} by ${user.name}`);
        
        setTimeout(() => {
          if (spinner) spinner.classList.add('hidden');
          btn.classList.remove('opacity-70');
          alert(`DOWNLOAD STARTED: ${title} (${action})`);
        }, 1200);
      };
    });
  });
}

// ============================================================================
// 5. ADMIN PANEL & ASSET MANAGEMENT (`admin.html`)
// ============================================================================

function populateUserDropdowns() {
  const users = getStoredUsers().filter(u => u.status === 'ACTIVE');
  
  // 1. Upload Form User Select
  const uploadUserSelect = document.getElementById('asset-assigned-user');
  if (uploadUserSelect) {
    uploadUserSelect.innerHTML = `
      <option value="">-- SELECT ASSIGNED USER --</option>
      ${users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('')}
    `;
  }
}

function renderAdminVaultManager() {
  const container = document.getElementById('admin-vault-tracklist') || document.getElementById('admin-vault-list');
  if (!container) return;

  try {
    const filter = document.getElementById('admin-vault-filter');
    const filterVal = filter ? filter.value.toUpperCase() : 'ALL';

    let displayTracks = [];
    if (filterVal === 'ALL') {
      displayTracks = [...(getStoredTracks(true) || []), ...(getStoredTracks(false) || [])];
    } else if (filterVal === 'PUBLIC') {
      displayTracks = getStoredTracks(true) || [];
    } else {
      displayTracks = getStoredTracks(false) || [];
    }

    container.innerHTML = '';

    const users = getStoredUsers() || [];

    displayTracks.forEach(track => {
      if (!track) return;
      
      const row = document.createElement('div');
      row.className = 'border-b border-subtle py-4 flex flex-col transition-colors';

      const currentAssigned = Array.isArray(track.assignedTo) && track.assignedTo.length > 0 ? track.assignedTo[0] : '';
      
      const trackIdStr = track.id ? String(track.id).substring(0,4).toUpperCase() : '0000';
      const displayTitle = track.title ? track.title : 'UNTITLED_TRACK_' + trackIdStr;

      let vaultValue = 'PRIVATE';
      if (track.isDraft) vaultValue = 'DRAFT';
      else if (track.isPublic) vaultValue = 'PUBLIC';

      const trackId = track.id || '';
      const trackBpm = track.bpm || '---';
      const trackKey = track.key || '---';
      const trackType = track.trackType || 'BEAT';
      const trackIsPublic = track.isPublic ? 'true' : 'false';

      row.innerHTML = `
        <div class="flex items-center justify-between gap-4 cursor-pointer select-none group px-4" data-admin-accordion-trigger="${trackId}">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <button class="w-9 h-9 rounded-full border border-subtle flex items-center justify-center text-primary hover:bg-black/5 transition-all flex-shrink-0 touch-target" data-track-play-btn="${trackId}">
              <svg class="w-4 h-4 play-icon ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              <svg class="w-4 h-4 pause-icon hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <div class="flex flex-col truncate">
              <span class="font-bold text-sm text-primary tracking-wide group-hover:underline truncate">${displayTitle}</span>
              <span class="text-xs text-muted">${trackBpm} BPM // ${trackKey} <span class="border border-subtle px-1 rounded ml-1 text-[9px] uppercase">${trackType}</span></span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-muted group-hover:text-primary transition-transform duration-200 transform accordion-arrow" id="admin-arrow-${trackId}">
              [ + ]
            </span>
          </div>
        </div>

        <div class="hidden flex-col gap-4 pt-4 px-4" id="admin-accordion-${trackId}">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-surface/50 border border-subtle rounded">
            
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-muted uppercase">TYPE:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-actual-track-type" data-track-id="${trackId}">
                  <option value="BEAT" ${trackType === 'BEAT' ? 'selected' : ''}>BEAT</option>
                  <option value="LOOP" ${trackType === 'LOOP' ? 'selected' : ''}>LOOP</option>
                  <option value="IDEA" ${trackType === 'IDEA' ? 'selected' : ''}>IDEA</option>
                </select>
              </div>
              
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-muted uppercase">VAULT:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-track-visibility" data-track-id="${trackId}">
                  <option value="PUBLIC" ${vaultValue === 'PUBLIC' ? 'selected' : ''}>PUBLIC</option>
                  <option value="PRIVATE" ${vaultValue === 'PRIVATE' ? 'selected' : ''}>PRIVATE</option>
                  <option value="DRAFT" ${vaultValue === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 ${vaultValue !== 'PUBLIC' ? 'opacity-40 pointer-events-none' : ''}">
                <span class="text-[10px] font-bold text-muted uppercase">LANDING:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-track-landing" data-track-id="${trackId}">
                  <option value="true" ${track.isLanding ? 'selected' : ''}>ON</option>
                  <option value="false" ${!track.isLanding ? 'selected' : ''}>OFF</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 ${vaultValue === 'PUBLIC' ? 'opacity-40 pointer-events-none' : ''} assigned-user-box" id="user-box-${trackId}">
                <span class="text-[10px] font-bold text-muted uppercase">ASSIGN:</span>
                <select class="bg-transparent border-none text-xs focus:outline-none focus:ring-0 font-mono rounded cursor-pointer select-track-user" data-track-id="${trackId}">
                  <option value="">-- NONE --</option>
                  ${users.filter(u => u && u.status === 'ACTIVE').map(u => `
                    <option value="${u.id}" ${currentAssigned === u.id ? 'selected' : ''}>${u.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button class="text-[10px] font-bold px-3 py-1.5 border border-subtle text-muted hover:text-primary rounded transition-colors whitespace-nowrap" onclick="window.generateShareLink('${trackId}', ${trackIsPublic})">
                [ SHARE ]
              </button>
              <button class="text-[10px] font-bold px-3 py-1.5 border border-subtle text-muted hover:text-primary rounded transition-colors whitespace-nowrap" onclick="window.openEditTrackModal('${trackId}', ${trackIsPublic})">
                [ EDIT ]
              </button>
              <button class="text-[10px] font-bold px-3 py-1.5 border border-accent-red/40 text-accent-red hover:bg-accent-red/10 rounded transition-colors btn-delete-track whitespace-nowrap" data-track-id="${trackId}" data-is-public="${trackIsPublic}">
                [ DELETE ]
              </button>
            </div>

          </div>
        </div>
      `;

      container.appendChild(row);

      const triggerBtn = row.querySelector(`[data-admin-accordion-trigger="${trackId}"]`);
      if (triggerBtn) {
        triggerBtn.onclick = (e) => {
          if (e.target.closest('button') || e.target.closest('select')) return;
          const content = row.querySelector(`#admin-accordion-${trackId}`);
          const arrow = row.querySelector(`#admin-arrow-${trackId}`);
          if (content && arrow) {
            content.classList.toggle('hidden');
            content.classList.toggle('flex');
            if (content.classList.contains('hidden')) {
              arrow.innerText = '[ + ]';
              arrow.style.transform = 'rotate(0deg)';
            } else {
              arrow.innerText = '[ - ]';
              arrow.style.transform = 'rotate(180deg)';
            }
          }
        };
      }

      const playBtn = row.querySelector(`[data-track-play-btn="${trackId}"]`);
      if (playBtn) {
        playBtn.onclick = () => window.tmyEngine && window.tmyEngine.playTrack(trackId, track.src);
      }

      const typeSelect = row.querySelector('.select-actual-track-type');
      const visSelect = row.querySelector('.select-track-visibility');
      const landSelect = row.querySelector('.select-track-landing');
      const userSelect = row.querySelector('.select-track-user');
      const delBtn = row.querySelector('.btn-delete-track');

      if (typeSelect) {
        typeSelect.onchange = (e) => {
          const val = e.target.value;
          const tracksArr = getStoredTracks(track.isPublic) || [];
          const t = tracksArr.find(x => x && x.id === trackId);
          if (t) {
            t.trackType = val;
            saveStoredTracks(track.isPublic, tracksArr);
            renderAdminVaultManager();
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }

      if (visSelect) {
        visSelect.onchange = (e) => {
          const val = e.target.value;
          const sourceArr = getStoredTracks(track.isPublic) || [];
          const idx = sourceArr.findIndex(x => x && x.id === trackId);
          if (idx > -1) {
            const t = sourceArr.splice(idx, 1)[0];
            
            if (val === 'DRAFT') {
              t.isPublic = false;
              t.isDraft = true;
            } else if (val === 'PUBLIC') {
              t.isPublic = true;
              t.isDraft = false;
            } else {
              t.isPublic = false;
              t.isDraft = false;
            }
            
            const targetArr = getStoredTracks(t.isPublic) || [];
            targetArr.push(t);
            
            saveStoredTracks(track.isPublic, sourceArr);
            saveStoredTracks(t.isPublic, targetArr);
            renderAdminVaultManager();
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }

      if (landSelect) {
        landSelect.onchange = (e) => {
          const val = e.target.value === 'true';
          const tracksArr = getStoredTracks(track.isPublic) || [];
          const t = tracksArr.find(x => x && x.id === trackId);
          if (t) {
            t.isLanding = val;
            saveStoredTracks(track.isPublic, tracksArr);
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }

      if (userSelect) {
        userSelect.onchange = (e) => {
          const val = e.target.value;
          ['tmy_public_tracks', 'tmy_private_tracks'].forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
              try {
                let parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                  let found = false;
                  parsed.forEach(x => {
                    if (x && x.id === trackId) {
                      x.assignedTo = val ? [val] : [];
                      found = true;
                    }
                  });
                  if (found) localStorage.setItem(key, JSON.stringify(parsed));
                }
              } catch(err) {}
            }
          });
        };
      }

      if (delBtn) {
        delBtn.onclick = (e) => {
          if (confirm('Delete track from Vault? This cannot be undone.')) {
            const isPub = e.target.getAttribute('data-is-public') === 'true';
            const tId = e.target.getAttribute('data-track-id');
            const tracksArr = getStoredTracks(isPub) || [];
            const newArr = tracksArr.filter(x => x && x.id !== tId);
            saveStoredTracks(isPub, newArr);
            renderAdminVaultManager();
            if (typeof setupLandingPlayer === 'function') setupLandingPlayer();
          }
        };
      }
    });

    if (displayTracks.length === 0) {
      container.innerHTML = '<div class="p-4 text-xs text-muted text-center font-mono">NO TRACKS FOUND</div>';
    }

  } catch (err) {
    container.innerHTML = '<div class="p-4 text-xs text-accent-red font-mono">ERROR RENDERING VAULT: ' + err.message + '</div>';
    console.error('Render Admin Vault Error:', err);
  }
}

function setupAdminPage() {
  const adminWrapper = document.getElementById('admin-dashboard');
  if (!adminWrapper) return;

  const session = getVaultSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'PRODUCER')) {
    alert('UNAUTHORIZED: Access reserved for Administrator or Producer roles.');
    window.location.href = 'vault.html';
    return;
  }

  const adminUserTag = document.getElementById('admin-user-tag');
  if (adminUserTag) {
    adminUserTag.innerText = `${session.name.toUpperCase()} [${session.role}]`;
  }

  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  if (adminLogoutBtn) {
    adminLogoutBtn.onclick = () => {
      clearVaultSession();
      window.location.href = 'vault.html';
    };
  }

  const menuVault = document.getElementById('menu-vault');
  const menuUpload = document.getElementById('menu-upload');
  const menuUsers = document.getElementById('menu-users');
  const menuAnalytics = document.getElementById('menu-analytics');

  const viewVault = document.getElementById('view-vault');
  const viewUpload = document.getElementById('view-upload');
  const viewUsers = document.getElementById('view-users');
  const viewAnalytics = document.getElementById('view-analytics');

  if (session.role === 'PRODUCER') {
    if (menuUsers) menuUsers.classList.add('hidden');
    if (menuAnalytics) menuAnalytics.classList.add('hidden');
  }

  function switchTab(target) {
    [viewVault, viewUpload, viewUsers, viewAnalytics].forEach(v => v && v.classList.add('hidden'));
    [menuVault, menuUpload, menuUsers, menuAnalytics].forEach(m => {
      if (m) {
        m.classList.remove('bg-primary', 'text-white');
        m.classList.add('text-muted');
      }
    });

    if (target === 'vault' && viewVault && menuVault) {
      viewVault.classList.remove('hidden');
      menuVault.classList.add('bg-primary', 'text-white');
      menuVault.classList.remove('text-muted');
      renderAdminVaultManager();
    } else if (target === 'upload' && viewUpload && menuUpload) {
      viewUpload.classList.remove('hidden');
      menuUpload.classList.add('bg-primary', 'text-white');
      menuUpload.classList.remove('text-muted');
      populateUserDropdowns();
    } else if (target === 'users' && viewUsers && menuUsers) {
      viewUsers.classList.remove('hidden');
      menuUsers.classList.add('bg-primary', 'text-white');
      menuUsers.classList.remove('text-muted');
      renderUserManagementTable();
    } else if (target === 'analytics' && viewAnalytics && menuAnalytics) {
      viewAnalytics.classList.remove('hidden');
      menuAnalytics.classList.add('bg-primary', 'text-white');
      menuAnalytics.classList.remove('text-muted');
    }
  }

  if (menuVault) menuVault.onclick = () => switchTab('vault');
  if (menuUpload) menuUpload.onclick = () => switchTab('upload');
  if (menuUsers) menuUsers.onclick = () => switchTab('users');
  if (menuAnalytics) menuAnalytics.onclick = () => switchTab('analytics');

  const filterSelect = document.getElementById('admin-vault-filter');
  if (filterSelect) filterSelect.onchange = () => renderAdminVaultManager();

  // Set default view to Vault Manager
  switchTab('vault');
  populateUserDropdowns();
  setupAssetUploader();

  const createUserForm = document.getElementById('create-user-form');
  if (createUserForm) {
    createUserForm.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('new-user-name').value.trim();
      const role = document.getElementById('new-user-role').value;
      const key = document.getElementById('new-user-key').value.trim().toUpperCase();

      if (!name || !key) return;

      const users = getStoredUsers();
      if (users.find(u => u.key.toUpperCase() === key)) {
        alert('ERROR: A user with this access key already exists.');
        return;
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      users.push({ id, name, role, status: 'ACTIVE', key });
      saveStoredUsers(users);

      createUserForm.reset();
      renderUserManagementTable();
      populateUserDropdowns();
      alert(`User [${name}] created successfully with Key: ${key}`);
    };
  }
}

function setupAssetUploader() {
  const dropzone = document.getElementById('drag-drop-zone');
  const fileInput = document.getElementById('file-upload-input');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressContainer = document.getElementById('upload-progress-container');
  const uploadForm = document.getElementById('asset-metadata-form');

  if (!dropzone || !uploadForm) return;

  let currentUploadedFileBlob = null;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      currentUploadedFileBlob = files[0];
      handleFilesSelected(files[0].name);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        currentUploadedFileBlob = e.target.files[0];
        handleFilesSelected(e.target.files[0].name);
      }
    });
  }

  function handleFilesSelected(filename) {
    window._uploadedFilename = filename;
    const dropText = document.getElementById('dropzone-filename');
    if (dropText) dropText.innerText = `SELECTED: ${filename.toUpperCase()}`;
  }

  uploadForm.onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('asset-title').value.trim();
    const bpm = parseInt(document.getElementById('asset-bpm').value) || 140;
    const trackType = document.getElementById('asset-type') ? document.getElementById('asset-type').value : 'BEAT';
    const key = document.getElementById('asset-key').value.trim().toUpperCase() || 'C MIN';
    const destination = document.getElementById('asset-destination').value;
    const isDraft = (destination === 'DRAFT');
    const isPublic = (destination === 'PUBLIC');
    const assignedUserSelect = document.getElementById('asset-assigned-user');
    const assignedUser = assignedUserSelect ? assignedUserSelect.value : '';

    if (!title) return;

    if (progressContainer && progressBar) {
      progressContainer.classList.remove('hidden');
      progressBar.style.width = '0%';
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        progressBar.style.width = `${progress}%`;
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';

            const isDraft = (destination === 'DRAFT');
            const isPublic = (destination === 'PUBLIC');
            const tracks = getStoredTracks(isPublic);

            let selectedFilename = window._uploadedFilename;
            if (!selectedFilename && fileInput && fileInput.files && fileInput.files[0]) {
              selectedFilename = fileInput.files[0].name;
            }
            if (!selectedFilename) {
              selectedFilename = 'LOOPKIT1.wav';
            }

            const cleanFilename = selectedFilename.replace(/^beats\//, '');
            const finalSrc = 'beats/' + cleanFilename;
            const newTrackId = 'track_' + Date.now();

            // Save actual audio file in memory & browser storage
            if (currentUploadedFileBlob) {
              TmyAudioStore.saveAudio(newTrackId, currentUploadedFileBlob);
            }

            const newTrack = {
              id: newTrackId,
              title: title.toUpperCase(),
              bpm: bpm,
              key: key,
              date: new Date().toISOString().split('T')[0],
              src: finalSrc,
              stems: `${title.toUpperCase()}_STEMS.zip`,
              flp: `${title.toUpperCase()}.flp`,
              credits: 'TMY AUDIO VAULT',
              trackType: trackType,
              isDraft: isDraft,
              isPublic: isPublic,
              isLanding: false,
              assignedTo: isPublic ? [] : (assignedUser ? [assignedUser, 'thomas'] : ['thomas'])
            };
            tracks.unshift(newTrack);
            saveStoredTracks(isPublic, tracks);

            window._uploadedFilename = null;
            currentUploadedFileBlob = null;
            if (fileInput) fileInput.value = '';

            uploadForm.reset();
            const dropText = document.getElementById('dropzone-filename');
            if (dropText) dropText.innerText = `DRAG & DROP AUDIO (WAV/MP3), ZIP, FLP OR MP4 HERE`;
            alert(`ASSET UPLOADED SUCCESSFULLY: ${title}`);
            renderAdminVaultManager();
          }, 300);
        }
      }, 150);
    }
  };
}

function renderUserManagementTable() {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;

  const users = getStoredUsers();
  tbody.innerHTML = '';

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-subtle text-xs';

    const isActive = user.status === 'ACTIVE';

    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-primary">${user.name}</td>
      <td class="py-3 px-4 font-mono">${user.key}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-black text-white' : user.role === 'ARTIST' ? 'bg-accent-red/10 text-accent-red' : 'bg-surface border border-subtle'}">
          ${user.role}
        </span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center gap-1.5 ${isActive ? 'text-online' : 'text-accent-red'} font-bold">
          <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-online' : 'bg-accent-red'}"></span>
          ${user.status}
        </span>
      </td>
      <td class="py-3 px-4 text-right">
        <button class="text-[10px] font-bold px-2 py-1 border border-subtle text-muted hover:text-primary rounded transition-colors mr-2" onclick="window.openEditUserModal('${user.id}')">
          [ EDIT ]
        </button>
        <button class="text-[10px] font-bold px-2 py-1 border border-accent-red/40 text-accent-red hover:bg-accent-red/10 rounded transition-colors mr-2 btn-delete-user" data-user-id="${user.id}">
          [ DELETE ]
        </button>
        <button class="text-[10px] font-bold px-2 py-1 border rounded transition-colors ${isActive ? 'border-accent-red text-accent-red hover:bg-accent-red/10' : 'border-online text-online hover:bg-online/10'}" data-revoke-key="${user.key}">
          ${isActive ? '[ REVOKE ACCESS ]' : '[ RESTORE ACCESS ]'}
        </button>
      </td>
    `;

    tbody.appendChild(tr);

    const btn = tr.querySelector(`[data-revoke-key="${user.key}"]`);
    if (btn) {
      btn.onclick = () => {
        user.status = (user.status === 'ACTIVE') ? 'REVOKED' : 'ACTIVE';
        saveStoredUsers(users);
        renderUserManagementTable();
        populateUserDropdowns();
      };
    }

    const delBtn = tr.querySelector('.btn-delete-user');
    if (delBtn) {
      delBtn.onclick = () => {
        if (confirm('DELETE USER: Are you sure?')) {
          const index = users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            users.splice(index, 1);
            saveStoredUsers(users);
            renderUserManagementTable();
            populateUserDropdowns();
          }
        }
      };
    }
  });
}

// ============================================================================
// 6. INITIALIZATION DISPATCHER
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  setupLandingPlayer();
  setupVaultPage();
  setupAdminPage();
});

window.openEditTrackModal = function(id, isPublic) {
  try {
    const tracks = getStoredTracks(isPublic);
    const track = tracks.find(t => t && t.id === id);
    if(!track) {
      alert('ERROR: Track not found for editing. ID: ' + id);
      return;
    }
    document.getElementById('edit-track-modal').classList.remove('hidden');
    document.getElementById('edit-track-modal').classList.add('flex');
    document.getElementById('edit-track-id').value = track.id;
    document.getElementById('edit-track-ispublic').value = isPublic ? 'true' : 'false';
    document.getElementById('edit-track-title').value = track.title || '';
    document.getElementById('edit-track-bpm').value = track.bpm || 140;
    const typeEl = document.getElementById('edit-track-type'); 
    if (typeEl) typeEl.value = track.trackType || 'BEAT';
    document.getElementById('edit-track-key').value = track.key || '';
    
    const creditsEl = document.getElementById('edit-track-credits');
    if (creditsEl) creditsEl.value = track.credits || '';
    
    const fileEl = document.getElementById('edit-track-file');
    if (fileEl) fileEl.value = ''; // reset file input
  } catch (err) {
    alert('ERROR opening modal: ' + err.message);
  }
};

document.getElementById('close-edit-track')?.addEventListener('click', () => {
  document.getElementById('edit-track-modal').classList.add('hidden');
  document.getElementById('edit-track-modal').classList.remove('flex');
});

document.getElementById('edit-track-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-track-id').value;
  const isPublic = document.getElementById('edit-track-ispublic').value === 'true';
  const tracks = getStoredTracks(isPublic);
  const index = tracks.findIndex(t => t.id === id);
  
  if (index !== -1) {
    tracks[index].title = document.getElementById('edit-track-title').value.trim().toUpperCase();
    tracks[index].bpm = parseInt(document.getElementById('edit-track-bpm').value) || 140;
    tracks[index].trackType = document.getElementById('edit-track-type') ? document.getElementById('edit-track-type').value : 'BEAT';
    tracks[index].key = document.getElementById('edit-track-key').value.trim().toUpperCase();
    tracks[index].credits = document.getElementById('edit-track-credits').value.trim().toUpperCase();
    
    const fileInput = document.getElementById('edit-track-file');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      tracks[index].src = 'beats/' + fileInput.files[0].name;
      TmyAudioStore.saveAudio(id, fileInput.files[0]);
    }
    
    saveStoredTracks(isPublic, tracks);
    document.getElementById('edit-track-modal').classList.add('hidden');
    document.getElementById('edit-track-modal').classList.remove('flex');
    renderAdminVaultManager();
  }
});

// Edit User Logic
window.openEditUserModal = function(id) {
  const users = getStoredUsers();
  const user = users.find(u => u.id === id);
  if(!user) return;
  document.getElementById('edit-user-modal').classList.remove('hidden');
  document.getElementById('edit-user-modal').classList.add('flex');
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-user-name').value = user.name;
  document.getElementById('edit-user-role').value = user.role;
  document.getElementById('edit-user-key').value = user.key;
};

document.getElementById('close-edit-user')?.addEventListener('click', () => {
  document.getElementById('edit-user-modal').classList.add('hidden');
  document.getElementById('edit-user-modal').classList.remove('flex');
});

document.getElementById('edit-user-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-user-id').value;
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === id);
  
  if (index !== -1) {
    users[index].name = document.getElementById('edit-user-name').value.trim();
    users[index].role = document.getElementById('edit-user-role').value;
    users[index].key = document.getElementById('edit-user-key').value.trim().toUpperCase();
    
    saveStoredUsers(users);
    document.getElementById('edit-user-modal').classList.add('hidden');
    document.getElementById('edit-user-modal').classList.remove('flex');
    renderUserManagementTable();
  }
});
