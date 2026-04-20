(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let photos = [];
  let currentIndex = 0;
  let thumbRects = new Map();
  let isOpen = false;

  // ─── Elements ─────────────────────────────────────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const frameMeta = document.getElementById('lightbox-frame');
  const lensMeta = document.getElementById('lightbox-lens');

  if (!lightbox || !img) return;

  // ─── Build photo list from DOM ────────────────────────────────────────────
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

  // ─── FLIP open ────────────────────────────────────────────────────────────
  function open(index) {
    if (!photos[index]) return;
    currentIndex = index;
    const photo = photos[index];

    const thumbRect = photo.btn.getBoundingClientRect();
    thumbRects.set(index, thumbRect);

    img.src = photo.src;
    img.alt = photo.alt;
    img.style.opacity = '0';
    img.style.transform = 'none';
    img.style.transition = 'none';

    lightbox.classList.remove('hidden');
    lightbox.style.display = 'flex';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    isOpen = true;

    updateMeta();
    updateButtons();

    function doFlip() {
      const imgRect = img.getBoundingClientRect();
      if (imgRect.width === 0) {
        requestAnimationFrame(doFlip);
        return;
      }

      const dx = thumbRect.left + thumbRect.width / 2 - (imgRect.left + imgRect.width / 2);
      const dy = thumbRect.top + thumbRect.height / 2 - (imgRect.top + imgRect.height / 2);
      const scaleX = thumbRect.width / imgRect.width;
      const scaleY = thumbRect.height / imgRect.height;

      img.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
      img.style.opacity = '0.6';

      img.getBoundingClientRect(); // force reflow

      img.style.transition = 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease';
      img.style.transform = 'none';
      img.style.opacity = '1';
    }

    if (img.complete && img.naturalWidth > 0) {
      requestAnimationFrame(doFlip);
    } else {
      img.onload = () => requestAnimationFrame(doFlip);
    }
  }

  // ─── FLIP close ───────────────────────────────────────────────────────────
  function close() {
    if (!isOpen) return;
    const photo = photos[currentIndex];
    const thumbRect = thumbRects.get(currentIndex) || photo?.btn.getBoundingClientRect();

    if (thumbRect && img && img.naturalWidth > 0) {
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

  function hideAfterClose() {
    lightbox.classList.add('hidden');
    lightbox.style.display = '';
    img.style.transform = 'none';
    img.style.opacity = '1';
    img.style.transition = 'none';
    isOpen = false;
  }

  // ─── Navigate ─────────────────────────────────────────────────────────────
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

  // ─── Event listeners ──────────────────────────────────────────────────────
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

  // Touch/swipe for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      navigate(dx < 0 ? 1 : -1);
    } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      close();
    }
  }, { passive: true });

  // ─── Wire photo buttons ───────────────────────────────────────────────────
  function wirePhotos() {
    document.querySelectorAll('.gallery-photo').forEach((btn) => {
      btn.addEventListener('click', () => {
        buildPhotoList();
        const idx = parseInt(btn.dataset.index || '0', 10);
        open(idx);
      });
    });
  }

  // ─── Password gate ────────────────────────────────────────────────────────
  const passwordForm = document.getElementById('password-form');
  const passwordInput = document.getElementById('password-input');
  const unlockBtn = document.getElementById('unlock-btn');
  const passwordError = document.getElementById('password-error');
  const albumConfig = document.getElementById('album-config');

  if (passwordForm && albumConfig) {
    const albumId = albumConfig.dataset.albumId || '';

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
          body: JSON.stringify({ albumId, password }),
        });

        if (res.ok) {
          window.location.reload();
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

  // ─── Init ─────────────────────────────────────────────────────────────────
  buildPhotoList();
  wirePhotos();
})();
