// Gallery page script — CSP-safe (no inline handlers), loaded via <script src defer>.
// Reads photo data from .gallery-photo buttons in #photo-grid.
// Opens lightbox on click; handles keyboard, swipe, and password gate.

(function () {
  const cfg = document.getElementById('album-config');
  if (!cfg) return; // not an album page

  const isProtected = cfg.dataset.isProtected === 'true';
  const albumId = cfg.dataset.albumId;

  // ── Photo list ────────────────────────────────────────────────────────────
  // Built from .gallery-photo buttons already in the DOM.
  // After unlock, locked photos are appended and this list is extended.
  let allPhotos = [];

  function collectPhotos() {
    allPhotos = [];
    document.querySelectorAll('#photo-grid .gallery-photo').forEach((btn, i) => {
      allPhotos.push({
        src: btn.dataset.src,
        alt: btn.dataset.alt,
      });
      btn.dataset.index = String(i);
    });
  }

  collectPhotos();

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const lightbox        = document.getElementById('lightbox');
  const lightboxImg     = document.getElementById('lightbox-img');
  const lightboxLoader  = document.getElementById('lightbox-loader');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxClose   = document.getElementById('lightbox-close');
  const lightboxPrevBtn = document.getElementById('lightbox-prev');
  const lightboxNextBtn = document.getElementById('lightbox-next');

  let activeIndex = 0;
  let lightboxOpener = null;

  function setLightboxImage(index) {
    activeIndex = index;
    const photo = allPhotos[index];
    lightboxImg.classList.add('opacity-0');
    lightboxLoader.classList.remove('hidden');
    lightboxImg.onload = () => {
      lightboxImg.classList.remove('opacity-0');
      lightboxLoader.classList.add('hidden');
    };
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt;
    lightboxCounter.textContent = `${index + 1} / ${allPhotos.length}`;
    schedulePreload(index);
  }

  function openLightbox(index) {
    lightboxOpener = document.activeElement;
    activeIndex = index;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setLightboxImage(index);
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = '';
    if (lightboxOpener) { lightboxOpener.focus(); lightboxOpener = null; }
  }

  function prev() { setLightboxImage((activeIndex - 1 + allPhotos.length) % allPhotos.length); }
  function next() { setLightboxImage((activeIndex + 1) % allPhotos.length); }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrevBtn.addEventListener('click', prev);
  lightboxNextBtn.addEventListener('click', next);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  // Focus trap within lightbox
  const focusable = [lightboxClose, lightboxPrevBtn, lightboxNextBtn];
  lightbox.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  });

  // Swipe
  let swipeStartX = null;
  lightbox.addEventListener('touchstart', (e) => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (swipeStartX === null) return;
    const delta = e.changedTouches[0].clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) next(); else prev();
  }, { passive: true });

  // ── Click-to-open on masonry grid ─────────────────────────────────────────
  function bindGridPhoto(btn) {
    btn.addEventListener('click', () => openLightbox(Number(btn.dataset.index)));
  }

  document.querySelectorAll('#photo-grid .gallery-photo').forEach(bindGridPhoto);

  // ── Proximity preloader ───────────────────────────────────────────────────
  const preloaded = new Set();
  let preloadQueue = [];
  let preloadActive = 0;
  const CONCURRENCY = 2;
  const WINDOW = 3;

  function runPreloadQueue() {
    while (preloadActive < CONCURRENCY && preloadQueue.length > 0) {
      const src = preloadQueue.shift();
      if (preloaded.has(src)) continue;
      preloaded.add(src);
      preloadActive++;
      const img = new Image();
      img.onload = img.onerror = () => { preloadActive--; runPreloadQueue(); };
      img.src = src;
    }
  }

  function schedulePreload(centerIdx) {
    preloadQueue = [];
    for (let d = 1; d <= WINDOW; d++) {
      for (const idx of [centerIdx + d, centerIdx - d]) {
        const photo = allPhotos[idx];
        if (photo && !preloaded.has(photo.src)) preloadQueue.push(photo.src);
      }
    }
    runPreloadQueue();
  }

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!isProtected) return;

  const storageKey = `unlocked:${albumId}`;
  const lockedSection = document.getElementById('locked-section');
  const gate = document.getElementById('password-gate');

  const alreadyUnlocked = sessionStorage.getItem(storageKey) === 'true';

  async function fetchLockedPhotos() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(`/api/albums/${albumId}/photos`, { signal: controller.signal });
    } catch {
      return 'network';
    } finally {
      clearTimeout(timeout);
    }
    if (res.status === 401 || res.status === 403) return 'expired';
    if (!res.ok) return 'error';
    return res.json();
  }

  function appendLockedPhotos(photos) {
    const grid = document.getElementById('photo-grid');
    const startIndex = allPhotos.length;
    photos.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = 'gallery-photo block w-full p-0 border-0 bg-transparent mb-[5px] break-inside-avoid cursor-zoom-in';
      btn.dataset.src = p.src;
      btn.dataset.alt = p.alt;
      btn.dataset.index = String(startIndex + i);
      btn.setAttribute('aria-label', `View ${p.alt}`);
      const img = document.createElement('img');
      img.src = p.thumbSrc;
      img.alt = p.alt;
      img.className = 'w-full h-auto block';
      img.loading = 'lazy';
      btn.appendChild(img);
      bindGridPhoto(btn);
      grid.appendChild(btn);
    });
    // Rebuild allPhotos from DOM so indices stay correct
    collectPhotos();
  }

  function showGateError(msg) {
    if (gate) {
      gate.style.display = 'flex';
      if (lockedSection) lockedSection.style.display = 'block';
    }
    const btn = document.getElementById('unlock-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Unlock'; }
    const err = document.getElementById('password-error');
    if (err) { err.textContent = msg; err.classList.remove('hidden'); }
  }

  async function unlock(fromSessionStorage = false) {
    const result = await fetchLockedPhotos();
    if (typeof result !== 'object' || !result.photos) {
      if (fromSessionStorage) sessionStorage.removeItem(storageKey);
      const msg = result === 'expired'
        ? 'Your session has expired. Please enter the password again.'
        : 'Something went wrong. Please try again.';
      showGateError(msg);
      return;
    }
    // Remove locked section (blurred placeholders + gate)
    if (lockedSection) {
      lockedSection.style.opacity = '0';
      lockedSection.style.transition = 'opacity 200ms';
      setTimeout(() => lockedSection.remove(), 200);
    }
    appendLockedPhotos(result.photos);
  }

  if (alreadyUnlocked) {
    unlock(true);
  }

  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('unlock-btn');
    btn.disabled = true;
    btn.textContent = 'Unlocking…';

    const input = document.getElementById('password-input').value;
    const res = await fetch('/api/auth/album', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album: albumId, password: input }),
    });

    if (res.ok) {
      sessionStorage.setItem(storageKey, 'true');
      unlock();
    } else {
      btn.disabled = false;
      btn.textContent = 'Unlock';
      const err = document.getElementById('password-error');
      err.classList.remove('hidden');
      const input = document.getElementById('password-input');
      input.value = '';
      input.addEventListener('input', () => err.classList.add('hidden'), { once: true });
    }
  });
})();
