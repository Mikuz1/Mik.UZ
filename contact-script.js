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

  function render() {
    if (!canvasActive) { canvasRafId = null; return; }
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
  // Initialize EmailJS (replace with your public key)
  emailjs.init('YOUR_PUBLIC_KEY');

  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');
  
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
      
      // Send email using EmailJS
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
    });
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
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      
      // Ensure it starts with +380
      if (!value.startsWith('380')) {
        if (value.startsWith('80')) {
          value = '3' + value;
        } else if (value.startsWith('0')) {
          value = '38' + value;
        } else {
          value = '380' + value;
        }
      }
      
      // Format as +380XXXXXXXXX
      if (value.length > 0) {
        e.target.value = '+' + value.slice(0, 12);
      }
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

// Бургер меню
const burger = document.getElementById('burger');
const nav = document.querySelector('.nav-links');

if (burger && nav) {
  burger.addEventListener('click', () => {
    nav.classList.toggle('active');
  });
  
  // Close menu when clicking on a link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
    });
  });
}