// ========== CONTACT CANVAS TITLE ==========
(function () {
  const canvas = document.getElementById('contactCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1200, H = 200;
  canvas.width = W; canvas.height = H;
  canvas.style.maxWidth = '100%';

  const FS = 150;
  const FONT = `900 ${FS}px "Arial Black", Arial, sans-serif`;
  const TEXT = 'CONTACT';
  const PREFERRED_GAP = 44;
  const CANVAS_MARGIN = 24;
  let INFO = null;

  function buildInfo() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc = off.getContext('2d');
    oc.font = FONT; oc.textAlign = 'left'; oc.textBaseline = 'middle';
    oc.fillStyle = '#fff';

    const letters = TEXT.split('');
    const letterWidths = letters.map(letter => oc.measureText(letter).width);
    const letterWidthTotal = letterWidths.reduce((sum, w) => sum + w, 0);
    const maxGap = Math.max(0, (W - CANVAS_MARGIN * 2 - letterWidthTotal) / (letters.length - 1));
    const gap = Math.min(PREFERRED_GAP, maxGap);
    const fullWidth = letterWidthTotal + gap * (letters.length - 1);
    const sx = Math.max(CANVAS_MARGIN, W / 2 - fullWidth / 2);

    let x = sx;
    letters.forEach((letter, index) => {
      oc.fillText(letter, x, H / 2);
      x += letterWidths[index] + gap;
    });

    INFO = { sx, tw: fullWidth, gap };

    const d = oc.getImageData(0, 0, W, H).data;
    const has = (x, y) => x > 0 && x < W-1 && y > 0 && y < H-1 && d[(y*W+x)*4+3] > 60;

    const pts = []; const pmap = {};
    for (let y = 1; y < H-1; y++) {
      for (let x = 1; x < W-1; x++) {
        if (has(x,y) && (!has(x-1,y)||!has(x+1,y)||!has(x,y-1)||!has(x,y+1))) {
          pmap[y*W+x] = pts.length;
          pts.push({x, y});
        }
      }
    }

    const used = new Uint8Array(pts.length);
    const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    const chains = [];

    for (let s = 0; s < pts.length; s++) {
      if (used[s]) continue;
      const cl = [s]; used[s] = 1; let qi = 0;
      while (qi < cl.length) {
        const p = pts[cl[qi++]];
        for (const [dx,dy] of N8) {
          const ni = pmap[(p.y+dy)*W+(p.x+dx)];
          if (ni !== undefined && !used[ni]) { used[ni]=1; cl.push(ni); }
        }
      }
      if (cl.length < 60) continue;

      const cluster = cl.map(i => pts[i]);
      cluster.sort((a,b) => a.x-b.x || a.y-b.y);
      const pm = {}; cluster.forEach((p,i) => { pm[p.y*W+p.x]=i; });
      const vis = new Uint8Array(cluster.length);
      const chain = [cluster[0]]; vis[0]=1;

      while (chain.length < cluster.length) {
        const last = chain[chain.length-1]; let found=false;
        for (const [dx,dy] of N8) {
          const ni = pm[(last.y+dy)*W+(last.x+dx)];
          if (ni !== undefined && !vis[ni]) { vis[ni]=1; chain.push(cluster[ni]); found=true; break; }
        }
        if (!found) break;
      }

      const clean = [chain[0]];
      for (let i = 1; i < chain.length; i++) {
        const prev = clean[clean.length-1];
        const curr = chain[i];
        if (Math.hypot(curr.x-prev.x, curr.y-prev.y) <= 1.5) clean.push(curr);
      }
      chains.push(clean);
    }
    return chains;
  }

  function drawText() {
    if (!INFO) return;
    ctx.font = FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const letters = TEXT.split('');
    let x = INFO.sx;

    ctx.shadowOffsetY = 3; ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(30, 30, 31, 0.95)';
    letters.forEach((letter, index) => {
      ctx.fillText(letter, x, H / 2);
      x += ctx.measureText(letter).width + INFO.gap;
    });

    ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'; ctx.lineWidth = 1;
    x = INFO.sx;
    letters.forEach((letter, index) => {
      ctx.strokeText(letter, x, H / 2);
      x += ctx.measureText(letter).width + INFO.gap;
    });
  }

  const PALETTES = [
    [255,255,255],[210,230,255],[255,245,225],
    [195,225,255],[255,255,240],[225,255,250]
  ];
  let snakes = [];

  function initSnakes(chains) {
    snakes = [];
    chains.forEach((chain, ci) => {
      for (let i = 0; i < 3; i++) {
        const pal = PALETTES[(ci*3+i) % PALETTES.length];
        snakes.push({
          chain,
          pos: Math.random() * chain.length,
          speed: (1.0 + Math.random()*1.1) * (Math.random()>0.5?1:-1),
          len: 85 + Math.floor(Math.random()*45),
          r: pal[0], g: pal[1], b: pal[2],
          phase: Math.random()*Math.PI*2,
          pulseSpeed: 0.006 + Math.random()*0.009,
        });
      }
    });
  }

  let t = 0;
  let canvasActive = true;
  let canvasRafId = null;
  let lastFrameTime = 0;

  function drawSnake(s) {
    const L = s.chain.length;
    if (L < 2) return;
    s.pos = (s.pos + s.speed + L) % L;
    const pulse = 0.5 + 0.5*Math.sin(t*s.pulseSpeed + s.phase);
    const baseAlpha = 0.6 + pulse*0.4;
    const headIdx = Math.floor(s.pos);
    for (let i = 0; i < s.len - 1; i++) {
      const ia = (headIdx - i   + L) % L;
      const ib = (headIdx - i-1 + L) % L;
      const pa = s.chain[ia];
      const pb = s.chain[ib];
      if (!pa || !pb) continue;
      if (Math.hypot(pa.x-pb.x, pa.y-pb.y) > 1.5) continue;
      const fade = Math.pow(1 - i/s.len, 2.0);
      const a = baseAlpha * fade;
      if (a < 0.008) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${a})`;
      ctx.lineWidth = i < 3 ? 1.8 : 1.5;
      ctx.lineCap = 'round';
      ctx.shadowBlur = i < 4 ? 8 : 0;
      ctx.shadowColor = `rgba(${s.r},${s.g},${s.b},${pulse*0.5})`;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function render(now) {
    if (!canvasActive) { canvasRafId = null; return; }
    if (!now) now = performance.now();
    if (now - lastFrameTime < 33) {
      canvasRafId = requestAnimationFrame(render);
      return;
    }
    lastFrameTime = now;

    ctx.clearRect(0, 0, W, H);
    drawText();
    snakes.forEach(s => drawSnake(s));
    t++;
    canvasRafId = requestAnimationFrame(render);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!canvasActive) {
          canvasActive = true;
          canvasRafId = requestAnimationFrame(render);
        }
      } else {
        canvasActive = false;
        if (canvasRafId) { cancelAnimationFrame(canvasRafId); canvasRafId = null; }
      }
    });
  }, { rootMargin: '100px 0px 100px 0px' });

  observer.observe(canvas);

  const chains = buildInfo();
  initSnakes(chains);
  canvasRafId = requestAnimationFrame(render);

})();
// ========== END CONTACT CANVAS TITLE ==========


// ========== CONTACT FORM — FORMSPREE ==========
document.addEventListener('DOMContentLoaded', function () {

  // ---------- FORM SUBMIT via Formspree fetch ----------
  const FORMSPREE_URL = 'https://formspree.io/f/mgernokl';

  const contactForm   = document.getElementById('contactForm');
  const formMessage   = document.getElementById('formMessage');
  const submitBtn     = contactForm ? contactForm.querySelector('.form-submit-btn') : null;

  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const name    = (document.getElementById('name')    || {}).value || '';
      const email   = (document.getElementById('email')   || {}).value || '';
      const phone   = (document.getElementById('phone')   || {}).value || '';
      const role    = (document.getElementById('role')    || {}).value || '';
      const message = (document.getElementById('message') || {}).value || '';

      // --- Validation ---
      if (!name.trim() || !email.trim()) {
        showMessage('Будь ласка, заповніть усі обов\'язкові поля.', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showMessage('Будь ласка, введіть правильну електронну адресу.', 'error');
        return;
      }

      if (!message.trim()) {
        showMessage('Будь ласка, введіть ваше повідомлення.', 'error');
        return;
      }

      // --- UI: loading state ---
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      showMessage('', '');

      // --- Send via Formspree ---
      try {
        const response = await fetch(FORMSPREE_URL, {
          method:  'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, name, email, phone, message })
        });

        const data = await response.json();

        if (response.ok) {
          showMessage('✓ Повідомлення успішно відправлено!', 'success');
          contactForm.reset();
          syncRoleUI('');   // скидаємо кастомний дропдаун
        } else {
          const errText = data.errors
            ? data.errors.map(err => err.message).join(', ')
            : 'Не вдалося відправити. Спробуйте ще раз.';
          showMessage(errText, 'error');
        }
      } catch (err) {
        showMessage('Помилка мережі. Перевірте підключення та спробуйте знову.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send';
        }
      }
    });
  }

  // ---------- Animated success toast ----------
  function createToast() {
    const existing = document.getElementById('formSuccessToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'formSuccessToast';
    toast.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" class="toast-checkmark">
        <circle cx="11" cy="11" r="10" stroke="#4ade80" stroke-width="2"/>
        <polyline points="6,11 9.5,14.5 16,8" stroke="#4ade80" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Message sent successfully!</span>
    `;

    Object.assign(toast.style, {
      display:        'inline-flex',
      alignItems:     'center',
      gap:            '10px',
      marginTop:      '18px',
      padding:        '12px 22px',
      borderRadius:   '10px',
      background:     'rgba(74, 222, 128, 0.10)',
      border:         '1px solid rgba(74, 222, 128, 0.35)',
      color:          '#4ade80',
      fontFamily:     'Inter, sans-serif',
      fontSize:       '15px',
      fontWeight:     '500',
      letterSpacing:  '0.02em',
      opacity:        '0',
      transform:      'translateY(10px)',
      transition:     'opacity 0.4s ease, transform 0.4s ease',
      pointerEvents:  'none',
    });

    if (formMessage) {
      formMessage.textContent = '';
      formMessage.after(toast);
    } else {
      contactForm.after(toast);
    }

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateY(0)';
      });
    });

    // Animate out after 4s
    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(() => toast.remove(), 450);
    }, 4000);
  }

  function showMessage(text, type) {
    if (type === 'success') {
      createToast();
      return;
    }
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.style.color = type === 'error' ? '#ff5555' : '';
    if (type === 'error') {
      formMessage.style.opacity   = '1';
      formMessage.style.transform = 'none';
    }
  }


  // ---------- Custom Role Select ----------
  const roleSelect  = document.getElementById('role');
  const roleTrigger = document.getElementById('roleTrigger');
  const roleMenu    = document.getElementById('roleMenu');
  const roleValue   = roleTrigger ? roleTrigger.querySelector('.custom-select-value') : null;

  function syncRoleUI(selectedValue) {
    if (!roleMenu || !roleValue) return;
    const roleOptions = Array.from(roleMenu.querySelectorAll('.custom-select-option'));
    const selected = roleOptions.find(o => o.dataset.value === selectedValue) || roleOptions[0];
    roleValue.textContent = selected ? selected.textContent : '';
    roleOptions.forEach(o => {
      const isSel = o === selected;
      o.classList.toggle('is-selected', isSel);
      o.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });
  }

  if (roleSelect && roleTrigger && roleMenu && roleValue) {
    const roleOptions = Array.from(roleMenu.querySelectorAll('.custom-select-option'));
    const roleWrapper = roleMenu.parentElement;

    const openMenu  = () => { roleWrapper.classList.add('is-open');    roleTrigger.setAttribute('aria-expanded', 'true');  };
    const closeMenu = () => { roleWrapper.classList.remove('is-open'); roleTrigger.setAttribute('aria-expanded', 'false'); };

    roleTrigger.addEventListener('click', () =>
      roleWrapper.classList.contains('is-open') ? closeMenu() : openMenu()
    );

    roleOptions.forEach(option => {
      option.addEventListener('click', () => {
        roleSelect.value = option.dataset.value;
        syncRoleUI(roleSelect.value);
        closeMenu();
      });
    });

    document.addEventListener('click', e => { if (!roleWrapper.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    contactForm && contactForm.addEventListener('reset', () => {
      setTimeout(() => { syncRoleUI(roleSelect.value); closeMenu(); }, 0);
    });

    syncRoleUI(roleSelect.value);
  }


  // ---------- Focus animations ----------
  document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
    input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
    input.addEventListener('blur',  () => input.parentElement.classList.remove('focused'));
  });


  // ---------- Phone flag detection ----------
  const phoneInput = document.getElementById('phone');
  const phoneFlag  = document.getElementById('phoneFlag');

  const dialCodeMap = [
    { code: '380', iso: 'ua', name: 'Ukraine' },
    { code: '358', iso: 'fi', name: 'Finland' },
    { code: '420', iso: 'cz', name: 'Czech Republic' },
    { code: '421', iso: 'sk', name: 'Slovakia' },
    { code: '373', iso: 'md', name: 'Moldova' },
    { code: '351', iso: 'pt', name: 'Portugal' },
    { code: '353', iso: 'ie', name: 'Ireland' },
    { code: '971', iso: 'ae', name: 'United Arab Emirates' },
    { code: '972', iso: 'il', name: 'Israel' },
    { code: '966', iso: 'sa', name: 'Saudi Arabia' },
    { code: '1',  iso: 'us', name: 'United States / Canada' },
    { code: '7',  iso: 'kz', name: 'Kazakhstan' },
    { code: '20', iso: 'eg', name: 'Egypt' },
    { code: '27', iso: 'za', name: 'South Africa' },
    { code: '30', iso: 'gr', name: 'Greece' },
    { code: '31', iso: 'nl', name: 'Netherlands' },
    { code: '32', iso: 'be', name: 'Belgium' },
    { code: '33', iso: 'fr', name: 'France' },
    { code: '34', iso: 'es', name: 'Spain' },
    { code: '36', iso: 'hu', name: 'Hungary' },
    { code: '39', iso: 'it', name: 'Italy' },
    { code: '40', iso: 'ro', name: 'Romania' },
    { code: '41', iso: 'ch', name: 'Switzerland' },
    { code: '43', iso: 'at', name: 'Austria' },
    { code: '44', iso: 'gb', name: 'United Kingdom' },
    { code: '45', iso: 'dk', name: 'Denmark' },
    { code: '46', iso: 'se', name: 'Sweden' },
    { code: '47', iso: 'no', name: 'Norway' },
    { code: '48', iso: 'pl', name: 'Poland' },
    { code: '49', iso: 'de', name: 'Germany' },
    { code: '52', iso: 'mx', name: 'Mexico' },
    { code: '54', iso: 'ar', name: 'Argentina' },
    { code: '55', iso: 'br', name: 'Brazil' },
    { code: '56', iso: 'cl', name: 'Chile' },
    { code: '57', iso: 'co', name: 'Colombia' },
    { code: '61', iso: 'au', name: 'Australia' },
    { code: '64', iso: 'nz', name: 'New Zealand' },
    { code: '65', iso: 'sg', name: 'Singapore' },
    { code: '66', iso: 'th', name: 'Thailand' },
    { code: '81', iso: 'jp', name: 'Japan' },
    { code: '82', iso: 'kr', name: 'South Korea' },
    { code: '84', iso: 'vn', name: 'Vietnam' },
    { code: '86', iso: 'cn', name: 'China' },
    { code: '90', iso: 'tr', name: 'Turkey' },
    { code: '91', iso: 'in', name: 'India' },
  ].sort((a, b) => b.code.length - a.code.length);

  function detectCountry(val) {
    const digits = val.replace(/\D/g, '');
    if (!digits) return { code: '380', iso: 'ua', name: 'Ukraine' };
    return dialCodeMap.find(e => digits.startsWith(e.code)) || { code: '380', iso: 'ua', name: 'Ukraine' };
  }

  function updatePhoneFlag(val) {
    if (!phoneFlag) return;
    const c = detectCountry(val);
    phoneFlag.src   = `https://flagcdn.com/w40/${c.iso}.png`;
    phoneFlag.alt   = `${c.name} flag`;
    phoneFlag.title = c.name;
  }

  if (phoneInput) {
    updatePhoneFlag(phoneInput.value || '+380');

    phoneInput.addEventListener('input', function (e) {
      const startsPlus = e.target.value.trim().startsWith('+') || e.target.value.trim().startsWith('00');
      let digits = e.target.value.replace(/\D/g, '');
      if (e.target.value.trim().startsWith('00')) digits = digits.slice(2);
      if (!digits) { e.target.value = ''; updatePhoneFlag(''); return; }
      e.target.value = '+' + digits.slice(0, 15);
      updatePhoneFlag(e.target.value);
    });
  }


  // ---------- Social media links ----------
  const socialLinks = {
    'Instagram':  'https://www.instagram.com/mikuz.dj/',
    'Facebook':   'https://www.facebook.com/yuriy.mykhaylovych',
    'YouTube':    'https://www.youtube.com/@yuriimykhailovychdj/videos',
    'Spotify':    'https://open.spotify.com/artist/2YS0wxCssIFQbIT9cFxlLf',
    'SoundCloud': 'https://soundcloud.com/yuriymykhaylovych'
  };

  document.querySelectorAll('.social-media-btn').forEach(btn => {
    const name = btn.textContent.trim();
    const key  = name.charAt(0).toUpperCase() + name.slice(1);
    if (socialLinks[key]) {
      btn.href   = socialLinks[key];
      btn.target = '_blank';
      btn.rel    = 'noopener noreferrer';
    }
  });

}); // end DOMContentLoaded
// ========== END CONTACT FORM ==========


// ========== SMOOTH SCROLL ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#' || href === '#more') { e.preventDefault(); return; }
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const navbarHeight = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - navbarHeight, behavior: 'smooth' });
    }
  });
});


// ========== BURGER MENU ==========
const burgerBtn = document.getElementById('burger');
const navLinks  = document.querySelector('.nav-links');

if (burgerBtn && navLinks) {
  const setNavVisible = (visible) => {
    if (window.innerWidth <= 1200) {
      navLinks.style.display = visible ? 'flex' : 'none';
      if (visible) {
        Object.assign(navLinks.style, {
          flexDirection:   'column',
          gap:             '24px',
          position:        'absolute',
          top:             '70px',
          right:           '20px',
          backgroundColor: '#111',
          padding:         '20px',
          borderRadius:    '8px',
          zIndex:          '110'
        });
      } else {
        ['flexDirection','gap','position','top','right','backgroundColor','padding','borderRadius','zIndex']
          .forEach(p => navLinks.style.removeProperty(p));
      }
    } else {
      navLinks.style.display = '';
    }
  };

  burgerBtn.addEventListener('click', () => {
    const active = navLinks.classList.toggle('active');
    setNavVisible(active);
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      setNavVisible(false);
    });
  });

  window.addEventListener('resize', () => setNavVisible(navLinks.classList.contains('active')));
}
// ========== END BURGER MENU ==========
