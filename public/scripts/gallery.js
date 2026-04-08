// Gallery page script — loaded as an external file so CSP can use script-src 'self'
// Album-specific data is passed via data-* attributes on #album-config.

(function () {
  const cfg = document.getElementById('album-config');
  const isProtected = cfg.dataset.isProtected === 'true';
  const albumId     = cfg.dataset.albumId;
  const previewCount = parseInt(cfg.dataset.previewCount, 10);

  let allPhotos = [];
  let activeIndex = 0;

  const previewImg  = document.getElementById('preview-img');
  const strip       = document.getElementById('thumb-strip');
  const photoCount  = document.getElementById('photo-count');
  const previewPrev = document.getElementById('preview-prev');
  const previewNext = document.getElementById('preview-next');

  // Show loading state for the initial preview image if it hasn't loaded yet
  if (!previewImg.complete) {
    previewImg.classList.add('opacity-50');
    previewImg.addEventListener('load', () => previewImg.classList.remove('opacity-50'), { once: true });
  }

  // Collect initially rendered preview photos
  document.querySelectorAll('.thumb').forEach(btn => {
    allPhotos.push({ src: btn.dataset.src, alt: btn.dataset.alt, thumbSrc: btn.querySelector('img')?.src });
  });
  updatePhotoCount();
  updatePreviewArrows();

  function selectPhoto(index) {
    activeIndex = index;
    const photo = allPhotos[index];

    previewImg.classList.add('opacity-50');
    previewImg.onload = () => previewImg.classList.remove('opacity-50');
    previewImg.src = photo.src;
    previewImg.alt = photo.alt;

    schedulePreload(index);

    const activeBtn = strip.querySelector(`[data-index="${index}"]`);
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    document.querySelectorAll('.thumb').forEach(btn => {
      const active = Number(btn.dataset.index) === index;
      btn.classList.toggle('ring-1', active);
      btn.classList.toggle('ring-[var(--color-accent)]', active);
      btn.classList.toggle('opacity-100', active);
      btn.classList.toggle('opacity-40', !active);
    });
  }

  function updatePhotoCount() {
    if (!photoCount) return;
    photoCount.textContent = `${allPhotos.length} photo${allPhotos.length !== 1 ? 's' : ''}`;
  }

  function updatePreviewArrows() {
    if (!previewPrev || !previewNext) return;
    const hide = allPhotos.length <= 1;
    previewPrev.style.display = hide ? 'none' : '';
    previewNext.style.display = hide ? 'none' : '';
  }

  window.previewNavigate = function (dir) {
    selectPhoto((activeIndex + dir + allPhotos.length) % allPhotos.length);
  };

  function addThumb(photo, index) {
    const btn = document.createElement('button');
    btn.className = 'thumb flex-shrink-0 w-16 h-16 overflow-hidden transition-opacity duration-150 opacity-40 hover:opacity-80 snap-start';
    btn.dataset.src   = photo.src;
    btn.dataset.alt   = photo.alt;
    btn.dataset.index = String(index);
    btn.setAttribute('aria-label', `View ${photo.alt}`);
    const img = document.createElement('img');
    img.src = photo.thumbSrc ?? photo.src;
    img.alt = photo.alt;
    img.className = 'w-full h-full object-cover';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', () => selectPhoto(index));
    strip.appendChild(btn);
  }

  // Bind existing thumbs
  document.querySelectorAll('.thumb').forEach(btn => {
    btn.addEventListener('click', () => selectPhoto(Number(btn.dataset.index)));
  });

  // ── Proximity-based preloader ─────────────────────────────────────────────
  const preloaded = new Set();
  let preloadQueue = [];
  let preloadActive = 0;
  const PRELOAD_CONCURRENCY = 2;
  const PRELOAD_WINDOW = 3;

  function runPreloadQueue() {
    while (preloadActive < PRELOAD_CONCURRENCY && preloadQueue.length > 0) {
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
    for (let d = 1; d <= PRELOAD_WINDOW; d++) {
      for (const idx of [centerIdx + d, centerIdx - d]) {
        const photo = allPhotos[idx];
        if (photo && !preloaded.has(photo.src)) preloadQueue.push(photo.src);
      }
    }
    runPreloadQueue();
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const lightbox       = document.getElementById('lightbox');
  const lightboxImg    = document.getElementById('lightbox-img');
  const lightboxLoader = document.getElementById('lightbox-loader');
  const lightboxCounter = document.getElementById('lightbox-counter');

  function setLightboxImage(src, alt) {
    lightboxImg.classList.add('opacity-0');
    lightboxLoader.classList.remove('hidden');
    lightboxImg.onload = () => {
      lightboxImg.classList.remove('opacity-0');
      lightboxLoader.classList.add('hidden');
    };
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    lightboxCounter.textContent = `${activeIndex + 1} / ${allPhotos.length}`;
  }

  const lightboxFocusable = ['lightbox-close', 'lightbox-prev', 'lightbox-next']
    .map(id => document.getElementById(id));
  let lightboxOpener = null;

  window.openLightbox = function () {
    lightboxOpener = document.activeElement;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setLightboxImage(allPhotos[activeIndex].src, allPhotos[activeIndex].alt);
    document.getElementById('lightbox-close').focus();
  };

  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = '';
    if (lightboxOpener) { lightboxOpener.focus(); lightboxOpener = null; }
  }

  lightbox.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const first = lightboxFocusable[0];
    const last  = lightboxFocusable[lightboxFocusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  });

  function lightboxPrev() {
    activeIndex = (activeIndex - 1 + allPhotos.length) % allPhotos.length;
    setLightboxImage(allPhotos[activeIndex].src, allPhotos[activeIndex].alt);
    schedulePreload(activeIndex);
    selectPhoto(activeIndex);
  }

  function lightboxNext() {
    activeIndex = (activeIndex + 1) % allPhotos.length;
    setLightboxImage(allPhotos[activeIndex].src, allPhotos[activeIndex].alt);
    schedulePreload(activeIndex);
    selectPhoto(activeIndex);
  }

  document.getElementById('preview-btn').addEventListener('click', openLightbox);
  document.getElementById('preview-prev').addEventListener('click', () => window.previewNavigate(-1));
  document.getElementById('preview-next').addEventListener('click', () => window.previewNavigate(1));
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', lightboxPrev);
  document.getElementById('lightbox-next').addEventListener('click', lightboxNext);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  // ── Swipe ─────────────────────────────────────────────────────────────────
  let swipeStartX = null;
  const SWIPE_THRESHOLD = 50;
  lightbox.addEventListener('touchstart', (e) => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (swipeStartX === null) return;
    const delta = e.changedTouches[0].clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) lightboxNext(); else lightboxPrev();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      if (!lightbox.classList.contains('hidden')) lightboxPrev();
      else selectPhoto((activeIndex - 1 + allPhotos.length) % allPhotos.length);
    } else if (e.key === 'ArrowRight') {
      if (!lightbox.classList.contains('hidden')) lightboxNext();
      else selectPhoto((activeIndex + 1) % allPhotos.length);
    }
  });

  // ── Password gate ─────────────────────────────────────────────────────────
  if (isProtected) {
    const storageKey = `unlocked:${albumId}`;
    const gate = document.getElementById('password-gate');

    const alreadyUnlocked = sessionStorage.getItem(storageKey) === 'true';
    if (gate && !alreadyUnlocked) document.body.style.overflow = 'hidden';

    async function fetchAndUnlock() {
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
      const { photos: locked } = await res.json();
      const startIndex = allPhotos.length;
      locked.forEach((p, i) => {
        const photo = { src: p.src, thumbSrc: p.thumbSrc, alt: p.alt };
        allPhotos.push(photo);
        addThumb(photo, startIndex + i);
      });
      updatePhotoCount();
      updatePreviewArrows();
      schedulePreload(activeIndex);
      return true;
    }

    function showGateError(msg) {
      if (gate) {
        gate.style.opacity = '1';
        gate.style.display = '';
        document.body.style.overflow = 'hidden';
      }
      const btn = document.getElementById('unlock-btn');
      if (btn) { btn.disabled = false; btn.textContent = 'Unlock'; }
      const err = document.getElementById('password-error');
      if (err) { err.textContent = msg; err.classList.remove('hidden'); }
    }

    async function unlock(fromSessionStorage = false) {
      const result = await fetchAndUnlock();
      if (result !== true) {
        if (fromSessionStorage) sessionStorage.removeItem(storageKey);
        const msg = result === 'expired'
          ? 'Your session has expired. Please enter the password again.'
          : 'Something went wrong. Please try again.';
        showGateError(msg);
        return;
      }
      document.body.style.overflow = '';
      if (gate) {
        gate.style.opacity = '0';
        setTimeout(() => gate.remove(), 200);
      }
      document.getElementById('preview-btn')?.focus();
    }

    if (alreadyUnlocked) unlock(true);

    document.getElementById('password-form').addEventListener('submit', async (e) => {
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
        document.getElementById('password-input').value = '';
        document.getElementById('password-input').addEventListener(
          'input',
          () => err.classList.add('hidden'),
          { once: true }
        );
      }
    });
  }
})();
