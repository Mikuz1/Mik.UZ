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

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
  // Initialize EmailJS if available
  if (window.emailjs) {
    emailjs.init('YOUR_PUBLIC_KEY');
  }

  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');
  const roleSelect = document.getElementById('role');
  const roleTrigger = document.getElementById('roleTrigger');
  const roleMenu = document.getElementById('roleMenu');
  const roleValue = roleTrigger ? roleTrigger.querySelector('.custom-select-value') : null;
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const formData = {
        role: document.getElementById('role').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        message: document.getElementById('message').value
      };
      
      // Simple validation
      if (!formData.name || !formData.email) {
        formMessage.textContent = 'Будь ласка, заповніть усі обов\'язкові поля.';
        formMessage.style.color = 'red';
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        formMessage.textContent = 'Будь ласка, введіть правильну електронну адресу.';
        formMessage.style.color = 'red';
        return;
      }
      
      // Send email using EmailJS if available
      if (window.emailjs) {
        emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', formData)
          .then(function(response) {
            console.log('SUCCESS!', response.status, response.text);
            formMessage.textContent = 'Успішно відправлено!';
            formMessage.style.color = 'yellow';
            contactForm.reset();
          }, function(error) {
            console.log('FAILED...', error);
            formMessage.textContent = 'Не вдалося відправити. Спробуйте ще раз.';
            formMessage.style.color = 'red';
          });
      } else {
        formMessage.textContent = 'Сервіс форми не підключено.';
        formMessage.style.color = 'red';
      }
    });
  }

  if (roleSelect && roleTrigger && roleMenu && roleValue) {
    const roleOptions = Array.from(roleMenu.querySelectorAll('.custom-select-option'));
    const roleWrapper = roleMenu.parentElement;

    const syncRoleUI = (selectedValue) => {
      const selectedOption = roleOptions.find(option => option.dataset.value === selectedValue) || roleOptions[0];
      roleValue.textContent = selectedOption.textContent;

      roleOptions.forEach(option => {
        const isSelected = option === selectedOption;
        option.classList.toggle('is-selected', isSelected);
        option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    };

    const openRoleMenu = () => {
      roleWrapper.classList.add('is-open');
      roleTrigger.setAttribute('aria-expanded', 'true');
    };

    const closeRoleMenu = () => {
      roleWrapper.classList.remove('is-open');
      roleTrigger.setAttribute('aria-expanded', 'false');
    };

    roleTrigger.addEventListener('click', function () {
      if (roleWrapper.classList.contains('is-open')) {
        closeRoleMenu();
      } else {
        openRoleMenu();
      }
    });

    roleOptions.forEach(option => {
      option.addEventListener('click', function () {
        roleSelect.value = option.dataset.value;
        syncRoleUI(roleSelect.value);
        closeRoleMenu();
      });
    });

    document.addEventListener('click', function (event) {
      if (!roleWrapper.contains(event.target)) {
        closeRoleMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeRoleMenu();
      }
    });

    contactForm.addEventListener('reset', function () {
      window.setTimeout(function () {
        syncRoleUI(roleSelect.value);
        closeRoleMenu();
      }, 0);
    });

    syncRoleUI(roleSelect.value);
  }
  
  // Form field animations on focus
  const formInputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
  
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
    });
  });
  
  // Phone number formatting (optional)
  const phoneInput = document.getElementById('phone');
  const phoneFlag = document.getElementById('phoneFlag');

  const dialCodeMap = [
    { code: '380', iso: 'ua', name: 'Ukraine' },
    { code: '1', iso: 'us', name: 'United States / Canada' },
    { code: '44', iso: 'gb', name: 'United Kingdom' },
    { code: '33', iso: 'fr', name: 'France' },
    { code: '49', iso: 'de', name: 'Germany' },
    { code: '39', iso: 'it', name: 'Italy' },
    { code: '34', iso: 'es', name: 'Spain' },
    { code: '48', iso: 'pl', name: 'Poland' },
    { code: '31', iso: 'nl', name: 'Netherlands' },
    { code: '32', iso: 'be', name: 'Belgium' },
    { code: '41', iso: 'ch', name: 'Switzerland' },
    { code: '43', iso: 'at', name: 'Austria' },
    { code: '45', iso: 'dk', name: 'Denmark' },
    { code: '46', iso: 'se', name: 'Sweden' },
    { code: '47', iso: 'no', name: 'Norway' },
    { code: '358', iso: 'fi', name: 'Finland' },
    { code: '420', iso: 'cz', name: 'Czech Republic' },
    { code: '421', iso: 'sk', name: 'Slovakia' },
    { code: '36', iso: 'hu', name: 'Hungary' },
    { code: '40', iso: 'ro', name: 'Romania' },
    { code: '373', iso: 'md', name: 'Moldova' },
    { code: '7', iso: 'kz', name: 'Kazakhstan / Russia region' },
    { code: '90', iso: 'tr', name: 'Turkey' },
    { code: '30', iso: 'gr', name: 'Greece' },
    { code: '351', iso: 'pt', name: 'Portugal' },
    { code: '353', iso: 'ie', name: 'Ireland' },
    { code: '61', iso: 'au', name: 'Australia' },
    { code: '64', iso: 'nz', name: 'New Zealand' },
    { code: '81', iso: 'jp', name: 'Japan' },
    { code: '82', iso: 'kr', name: 'South Korea' },
    { code: '86', iso: 'cn', name: 'China' },
    { code: '91', iso: 'in', name: 'India' },
    { code: '65', iso: 'sg', name: 'Singapore' },
    { code: '66', iso: 'th', name: 'Thailand' },
    { code: '84', iso: 'vn', name: 'Vietnam' },
    { code: '52', iso: 'mx', name: 'Mexico' },
    { code: '55', iso: 'br', name: 'Brazil' },
    { code: '54', iso: 'ar', name: 'Argentina' },
    { code: '56', iso: 'cl', name: 'Chile' },
    { code: '57', iso: 'co', name: 'Colombia' },
    { code: '20', iso: 'eg', name: 'Egypt' },
    { code: '27', iso: 'za', name: 'South Africa' },
    { code: '971', iso: 'ae', name: 'United Arab Emirates' },
    { code: '972', iso: 'il', name: 'Israel' },
    { code: '966', iso: 'sa', name: 'Saudi Arabia' }
  ].sort((a, b) => b.code.length - a.code.length);

  function getFlagImageSrc(isoCode) {
    return `https://flagcdn.com/w40/${isoCode}.png`;
  }

  function detectCountryByDialCode(phoneValue) {
    const digits = phoneValue.replace(/\D/g, '');
    if (!digits) {
      return { code: '380', iso: 'ua', name: 'Ukraine' };
    }

    for (const entry of dialCodeMap) {
      if (digits.startsWith(entry.code)) {
        return entry;
      }
    }

    return { code: '380', iso: 'ua', name: 'Ukraine' };
  }

  function updatePhoneFlag(value) {
    if (!phoneFlag) return;
    const country = detectCountryByDialCode(value);
    phoneFlag.src = getFlagImageSrc(country.iso);
    phoneFlag.alt = `${country.name} flag`;
    phoneFlag.title = country.name;
  }

  if (phoneInput) {
    updatePhoneFlag(phoneInput.value || phoneInput.placeholder || '+380');

    phoneInput.addEventListener('input', function(e) {
      const hasPlus = e.target.value.trim().startsWith('+') || e.target.value.trim().startsWith('00');
      let digits = e.target.value.replace(/\D/g, '');

      if (!digits) {
        e.target.value = '';
        updatePhoneFlag('');
        return;
      }

      if (e.target.value.trim().startsWith('00')) {
        digits = digits.slice(2);
      }

      e.target.value = (hasPlus ? '+' : '+') + digits.slice(0, 15);
      updatePhoneFlag(e.target.value);
    });
  }

  // Social media buttons functionality
  const socialButtons = document.querySelectorAll('.social-btn');
  const socialMediaButtons = document.querySelectorAll('.social-media-btn');
  
  // Map for social links from index.html
  const socialLinks = {
    'Instagram': 'https://www.instagram.com/mikuz.dj/',
    'Facebook': 'https://www.facebook.com/yuriy.mykhaylovych',
    'YouTube': 'https://www.youtube.com/@yuriimykhailovychdj/videos',
    'Spotify': 'https://open.spotify.com/artist/2YS0wxCssIFQbIT9cFxlLf',
    'SoundCloud': 'https://soundcloud.com/yuriymykhaylovych'
  };
  
  // Update contact page social buttons with proper links
  socialMediaButtons.forEach(btn => {
    const linkText = btn.textContent.trim();
    const socialName = linkText.charAt(0).toUpperCase() + linkText.slice(1);
    
    if (socialLinks[socialName]) {
      btn.href = socialLinks[socialName];
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
    }
  });
});

// Плавний скрол для навігації
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    
    if (href === '#' || href === '#more') {
      e.preventDefault();
      return;
    }
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      
      const navbarHeight = document.querySelector('.navbar').offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Бургер
const burgerBtn = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');

if (burgerBtn && navLinks) {
  const setNavVisible = (visible) => {
    if (window.innerWidth <= 1200) {
      navLinks.style.display = visible ? 'flex' : 'none';
      if (visible) {
        navLinks.style.flexDirection = 'column';
        navLinks.style.gap = '24px';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '70px';
        navLinks.style.right = '20px';
        navLinks.style.backgroundColor = '#111';
        navLinks.style.padding = '20px';
        navLinks.style.borderRadius = '8px';
        navLinks.style.zIndex = '110';
      } else {
        navLinks.style.removeProperty('flex-direction');
        navLinks.style.removeProperty('gap');
        navLinks.style.removeProperty('position');
        navLinks.style.removeProperty('top');
        navLinks.style.removeProperty('right');
        navLinks.style.removeProperty('background-color');
        navLinks.style.removeProperty('padding');
        navLinks.style.removeProperty('border-radius');
        navLinks.style.removeProperty('z-index');
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
