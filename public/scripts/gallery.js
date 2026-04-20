(function () {
  'use strict';

  let photos = [];
  let currentIndex = 0;
  let thumbRects = new Map();
  let isOpen = false;

  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const frameMeta = document.getElementById('lightbox-frame');
  const lensMeta = document.getElementById('lightbox-lens');

  if (!lightbox || !img) return;

  function buildPhotoList() {
    photos = Array.from(document.querySelectorAll('.gallery-photo')).map((btn, i) => ({
      src: btn.dataset.src,
      alt: btn.dataset.alt || '',
      lens: btn.dataset.lens || '',
      caption: btn.dataset.caption || '',
      index: i,
      btn,
    }));
  }

  function open(index) {
    if (!photos[index]) return;
    currentIndex = index;
    const photo = photos[index];
    const isMobile = window.matchMedia('(max-width: 639px)').matches;

    img.src = photo.src;
    img.alt = photo.alt;
    img.style.opacity = '0';
    img.style.transform = isMobile ? 'scale(0.85)' : 'none';
    img.style.transition = 'none';

    lightbox.classList.remove('hidden');
    lightbox.style.display = 'flex';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    isOpen = true;

    updateMeta();
    updateButtons();

    if (isMobile) {
      function doFade() {
        img.getBoundingClientRect();
        img.style.transition = 'transform 200ms ease, opacity 200ms ease';
        img.style.transform = 'scale(1)';
        img.style.opacity = '1';
      }
      if (img.complete && img.naturalWidth > 0) requestAnimationFrame(doFade);
      else img.onload = () => requestAnimationFrame(doFade);
    } else {
      const thumbRect = photo.btn.getBoundingClientRect();
      thumbRects.set(index, thumbRect);
      function doFlip() {
        const imgRect = img.getBoundingClientRect();
        if (imgRect.width === 0) { requestAnimationFrame(doFlip); return; }
        const dx = thumbRect.left + thumbRect.width / 2 - (imgRect.left + imgRect.width / 2);
        const dy = thumbRect.top + thumbRect.height / 2 - (imgRect.top + imgRect.height / 2);
        const scaleX = thumbRect.width / imgRect.width;
        const scaleY = thumbRect.height / imgRect.height;
        img.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
        img.style.opacity = '0.6';
        img.getBoundingClientRect();
        img.style.transition = 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease';
        img.style.transform = 'none';
        img.style.opacity = '1';
      }
      if (img.complete && img.naturalWidth > 0) requestAnimationFrame(doFlip);
      else img.onload = () => requestAnimationFrame(doFlip);
    }
  }

  function close() {
    if (!isOpen) return;
    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    const photo = photos[currentIndex];

    if (isMobile) {
      img.style.transition = 'opacity 180ms ease';
      img.style.opacity = '0';
      img.addEventListener('transitionend', hideAfterClose, { once: true });
    } else {
      const thumbRect = thumbRects.get(currentIndex) || photo?.btn.getBoundingClientRect();
      if (thumbRect && img.naturalWidth > 0) {
        const imgRect = img.getBoundingClientRect();
        const dx = thumbRect.left + thumbRect.width / 2 - (imgRect.left + imgRect.width / 2);
        const dy = thumbRect.top + thumbRect.height / 2 - (imgRect.top + imgRect.height / 2);
        const scaleX = thumbRect.width / imgRect.width;
        const scaleY = thumbRect.height / imgRect.height;
        img.style.transition = 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease';
        img.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
        img.style.opacity = '0';
        img.addEventListener('transitionend', hideAfterClose, { once: true });
      } else {
        hideAfterClose();
      }
    }
  }

  function hideAfterClose() {
    lightbox.classList.add('hidden');
    lightbox.style.display = '';
    img.style.transform = 'none';
    img.style.opacity = '1';
    img.style.transition = 'none';
    isOpen = false;
  }

  function navigate(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    currentIndex = newIndex;
    const photo = photos[currentIndex];
    img.style.transition = 'opacity 150ms ease';
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = photo.src;
      img.alt = photo.alt;
      img.style.opacity = '1';
      img.style.transition = 'none';
    }, 150);
    updateMeta();
    updateButtons();
  }

  function updateMeta() {
    const photo = photos[currentIndex];
    if (!photo) return;
    if (frameMeta) frameMeta.textContent = String(currentIndex + 1).padStart(3, '0') + ' · ' + photos.length;
    if (lensMeta) lensMeta.textContent = photo.lens || '';
  }

  function updateButtons() {
    if (prevBtn) prevBtn.style.opacity = currentIndex > 0 ? '1' : '0.2';
    if (nextBtn) nextBtn.style.opacity = currentIndex < photos.length - 1 ? '1' : '0.2';
  }

  closeBtn?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) navigate(dx < 0 ? 1 : -1);
    else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });

  // Single delegated listener — handles both original and injected buttons
  function wirePhotos() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-photo');
      if (!btn) return;
      buildPhotoList();
      const idx = parseInt(btn.dataset.index || '0', 10);
      open(idx);
    });
  }

  const passwordForm = document.getElementById('password-form');
  const passwordInput = document.getElementById('password-input');
  const unlockBtn = document.getElementById('unlock-btn');
  const passwordError = document.getElementById('password-error');
  const albumConfig = document.getElementById('album-config');

  if (passwordForm && albumConfig) {
    const albumId = albumConfig.dataset.albumId || '';
    const previewCount = parseInt(albumConfig.dataset.previewCount || '0', 10);

    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = passwordInput?.value || '';
      if (!password) return;

      unlockBtn?.setAttribute('disabled', 'true');
      passwordError?.classList.add('hidden');

      try {
        const res = await fetch('/api/auth/album', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album: albumId, password }),
        });

        if (res.ok) {
          const photosRes = await fetch(`/api/albums/${albumId}/photos`);
          if (!photosRes.ok) {
            // JWT cookie not yet accepted — rare race; reload as fallback
            window.location.reload();
            return;
          }
          const { photos: lockedPhotos } = await photosRes.json();

          const grid = document.getElementById('photo-grid-preview');
          if (grid) {
            lockedPhotos.forEach((photo, i) => {
              const idx = previewCount + i;
              const btn = document.createElement('button');
              btn.className = 'gallery-photo block w-full p-0 border-0 bg-transparent mb-[5px] break-inside-avoid cursor-zoom-in';
              btn.dataset.src = photo.src;
              btn.dataset.alt = photo.alt;
              btn.dataset.index = String(idx);
              btn.dataset.lens = '';
              btn.dataset.caption = '';
              btn.setAttribute('aria-label', `View ${photo.alt}`);

              const photoImg = document.createElement('img');
              photoImg.src = photo.thumbSrc;
              photoImg.alt = photo.alt;
              photoImg.className = 'w-full h-auto block';
              photoImg.loading = 'lazy';

              const frameNum = document.createElement('span');
              frameNum.className = 'block mt-1 mb-3 ff-mono';
              frameNum.style.cssText = 'font-size: 9px; letter-spacing: 0.12em; color: var(--color-dim);';
              frameNum.textContent = String(idx + 1).padStart(3, '0');

              btn.appendChild(photoImg);
              btn.appendChild(frameNum);
              grid.appendChild(btn);
            });
          }

          const gate = document.getElementById('password-gate');
          if (gate) gate.style.display = 'none';
          buildPhotoList();
        } else {
          passwordError?.classList.remove('hidden');
          unlockBtn?.removeAttribute('disabled');
        }
      } catch {
        passwordError?.classList.remove('hidden');
        unlockBtn?.removeAttribute('disabled');
      }
    });
  }

  buildPhotoList();
  wirePhotos();
})();
