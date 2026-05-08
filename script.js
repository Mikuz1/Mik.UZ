// Scroll Animation
document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('bigLogo')) return;
  const bigLogo = document.getElementById('bigLogo');
  const aboutReveal = document.getElementById('aboutReveal');
  const scrollSection = document.querySelector('.scroll-reveal-section');
  const youtubeSection = document.querySelector('.youtube-section');

  let lastKnownScrollPosition = -1;

  function updateScrollAnimation(scrollPos) {
    const sectionRect = scrollSection.getBoundingClientRect();
    const sectionTop = sectionRect.top;
    const sectionHeight = scrollSection.offsetHeight;
    const windowHeight = window.innerHeight;

    const scrollStart = windowHeight;
    const scrollEnd = -sectionHeight + windowHeight;
    const scrollDistance = scrollStart - scrollEnd;
    const currentScroll = scrollStart - sectionTop;

    let progress = currentScroll / scrollDistance;
    progress = Math.max(0, Math.min(1, progress));

    if (progress <= 0.4) {
      const phase1Progress = progress / 0.4;
      bigLogo.classList.add('visible');
      bigLogo.style.opacity = phase1Progress;
      bigLogo.style.transform = `translate(-50%, -50%) scale(${0.2 + phase1Progress * 2.8})`;
      aboutReveal.classList.remove('visible');
      aboutReveal.style.opacity = 0;
      aboutReveal.style.transform = 'translate(-50%, -50%) scale(1)';
    } else if (progress <= 0.5) {
      bigLogo.style.opacity = 1;
      bigLogo.style.transform = 'translate(-50%, -50%) scale(3)';
      aboutReveal.style.opacity = 0;
      aboutReveal.style.transform = 'translate(-50%, -50%) scale(1)';
    } else if (progress <= 0.7) {
      const phase3Progress = (progress - 0.5) / 0.2;
      bigLogo.style.opacity = 1 - phase3Progress;
      bigLogo.style.transform = `translate(-50%, -50%) scale(${3 - phase3Progress})`;
      aboutReveal.classList.add('visible');
      aboutReveal.style.opacity = phase3Progress;
      aboutReveal.style.transform = 'translate(-50%, -50%) scale(1)';
    } else {
      bigLogo.classList.remove('visible');
      bigLogo.style.opacity = 0;
      aboutReveal.classList.add('visible');
      aboutReveal.style.opacity = 1;
      aboutReveal.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    if (progress === 0) {
      bigLogo.classList.remove('visible');
      aboutReveal.classList.remove('visible');
      bigLogo.style.opacity = 0;
      aboutReveal.style.opacity = 0;
    }

    const youtubeRect = youtubeSection.getBoundingClientRect();
    const youtubeTop = youtubeRect.top;
    const fadeZone = window.innerHeight * 1.5;

    if (youtubeTop < fadeZone && youtubeTop > 0 && progress > 0.7) {
      const fadeProgress = youtubeTop / fadeZone;
      aboutReveal.style.opacity = Math.pow(fadeProgress, 1.5);
      aboutReveal.style.transform = `translate(-50%, -50%) scale(${0.3 + Math.pow(fadeProgress, 1.2) * 0.7})`;
    } else if (youtubeTop <= 0 && progress > 0.7) {
      aboutReveal.style.opacity = 0;
      aboutReveal.style.transform = 'translate(-50%, -50%) scale(0.3)';
    }

    const aboutOpacity = parseFloat(aboutReveal.style.opacity || '0');
    aboutReveal.style.pointerEvents = aboutOpacity > 0.05 ? 'auto' : 'none';
  }

  function rafLoop() {
    const currentScroll = window.scrollY;
    if (currentScroll !== lastKnownScrollPosition) {
      lastKnownScrollPosition = currentScroll;
      updateScrollAnimation(currentScroll);
    }
    requestAnimationFrame(rafLoop);
  }
  requestAnimationFrame(rafLoop);

  window.addEventListener('resize', () => updateScrollAnimation(window.scrollY), { passive: true });

  // ФІКС: Hero spin — зупиняємо коли поза viewport
  const heroGraphicImg = document.querySelector('.hero-graphic img');
  if (heroGraphicImg) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        heroGraphicImg.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    });
    heroObserver.observe(heroGraphicImg);
  }

  // ФІКС: Service рядки — зупиняємо коли поза viewport
  const serviceHero = document.querySelector('.service-hero');
  if (serviceHero) {
    const movingTexts = serviceHero.querySelectorAll('.moving-text');
    const serviceObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        movingTexts.forEach(el => {
          el.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        });
      });
    }, {
      // Починаємо запускати трохи раніше ніж секція входить в екран
      rootMargin: '100px 0px 100px 0px'
    });
    serviceObserver.observe(serviceHero);
  }

});

// Плавний скрол
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#' || href === '#more') { e.preventDefault(); return; }
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const navH = document.querySelector('.navbar').offsetHeight;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.pageYOffset - navH,
        behavior: 'smooth'
      });
    }
  });
});

// ========== MIK.UZ CANVAS TITLE ==========
(function () {
  const canvas = document.getElementById('mikuzCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 900, H = 200;
  canvas.width = W; canvas.height = H;
  canvas.style.maxWidth = '100%';

  const FS = 150;
  const FONT = `900 ${FS}px "Arial Black", Arial, sans-serif`;
  let INFO = null;

  function buildInfo() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc = off.getContext('2d');
    oc.font = FONT; oc.textAlign = 'left'; oc.textBaseline = 'middle';
    oc.fillStyle = '#fff';

    const mik  = oc.measureText('MIK');
    const mikD = oc.measureText('MIK.');
    const full = oc.measureText('MIK.UZ');
    const sx = W / 2 - full.width / 2;

    oc.fillText('MIK', sx, H / 2);
    oc.fillText('UZ',  sx + mikD.width, H / 2);

    const dotCX = sx + mik.width + (mikD.width - mik.width) / 2;
    const dotCY = H / 2 + FS * 0.18;
    const dotR  = (mikD.width - mik.width) * 0.28;
    oc.beginPath(); oc.arc(dotCX, dotCY, dotR, 0, Math.PI * 2); oc.fill();

    INFO = { sx, mikDW: mikD.width, dotCX, dotCY, dotR };

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
    const { sx, mikDW, dotCX, dotCY, dotR } = INFO;
    ctx.font = FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.shadowOffsetY = 3; ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(30, 30, 31, 0.95)';
    ctx.fillText('MIK', sx, H/2);
    ctx.fillText('UZ',  sx + mikDW, H/2);
    ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'; ctx.lineWidth = 1;
    ctx.strokeText('MIK', sx, H/2);
    ctx.strokeText('UZ',  sx + mikDW, H/2);
    ctx.beginPath(); ctx.arc(dotCX, dotCY, dotR, 0, Math.PI*2);
    ctx.shadowOffsetY = 2; ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.fillStyle = 'rgba(8, 8, 8, 0.95)'; ctx.fill();
    ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();
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
// ========== END MIK.UZ CANVAS TITLE ==========

// ============================================================
//  MARQUEE — плавна бігова стрічка з ефектом поїзда
// 
(function () {

  const CONFIG = {
    baseSpeed: 1.4,
  };

  const line1 = document.querySelector('.first-line .moving-text');
  const line2 = document.querySelector('.second-line .moving-text');
  if (!line1 || !line2) return;

  line1.style.animation = 'none';
  line2.style.animation = 'none';

  function wrap(value, min, max) {
    const range = max - min;
    return ((((value - min) % range) + range) % range) + min;
  }

  function buildCopies(el, original) {
    el.textContent = '';

    // Build enough repeated segments so the loop stays seamless on wide screens.
    const minCopies = 6;
    const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0, 1920);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < minCopies; i++) {
      const span = document.createElement('span');
      span.className = 'marquee-segment';
      span.textContent = original + '\u00A0\u00A0•\u00A0\u00A0';
      fragment.appendChild(span);
    }

    el.appendChild(fragment);

    const firstSegment = el.firstElementChild;
    const segmentWidth = firstSegment ? firstSegment.getBoundingClientRect().width : 0;

    if (!segmentWidth) {
      return minCopies;
    }

    const requiredCopies = Math.max(minCopies, Math.ceil((viewportWidth * 2.5) / segmentWidth));

    if (requiredCopies > minCopies) {
      const extraFragment = document.createDocumentFragment();
      for (let i = minCopies; i < requiredCopies; i++) {
        const span = document.createElement('span');
        span.className = 'marquee-segment';
        span.textContent = original + '\u00A0\u00A0•\u00A0\u00A0';
        extraFragment.appendChild(span);
      }
      el.appendChild(extraFragment);
    }

    return requiredCopies;
  }

  function setupTrack(el, direction) {
    const original = el.textContent.trim();
    buildCopies(el, original);

    const firstSegment = el.firstElementChild;
    const singleWidth = firstSegment
      ? firstSegment.getBoundingClientRect().width
      : el.scrollWidth;

    return {
      el,
      original,
      direction,
      singleWidth,
      offset: 0,
    };
  }

  const track1 = setupTrack(line1, 1);
  const track2 = setupTrack(line2, -1);

  function refreshTrack(track) {
    const progress = track.singleWidth
      ? (track.offset % track.singleWidth) / track.singleWidth
      : 0;

    buildCopies(track.el, track.original);

    const firstSegment = track.el.firstElementChild;
    const nextWidth = firstSegment
      ? firstSegment.getBoundingClientRect().width
      : track.singleWidth;

    track.singleWidth = nextWidth || track.singleWidth;
    track.offset = progress * track.singleWidth;
  }

  let lastTime = null;
  let resizeRaf = null;

  function tick(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min(now - lastTime, 32);
    lastTime = now;

    for (const track of [track1, track2]) {
      track.offset += CONFIG.baseSpeed * (dt / 16.67);

      const distance = track.singleWidth
        ? track.offset % track.singleWidth
        : 0;

      const translateX = track.direction === 1
        ? -track.singleWidth + distance
        : -distance;

      track.el.style.transform = `translate3d(${translateX}px, 0, 0)`;
    }

    requestAnimationFrame(tick);
  }

  function handleResize() {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      refreshTrack(track1);
      refreshTrack(track2);
    });
  }

  window.addEventListener('resize', handleResize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(handleResize);
  }

  requestAnimationFrame(tick);

})();
