// ========== EQ VISUALIZER ========== 
document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('eqCanvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('wrapper');
  const playBtn = document.getElementById('playBtn');
  const scIframe = document.getElementById('sc-widget');

  let W, H, cx, cy, R;
  let isPlaying = false;
  let t = 0;
  let widget = null;
  let widgetReady = false;

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    const sz = Math.min(rect.width, rect.height) || 480;
    canvas.width = sz; canvas.height = sz;
    W = sz; H = sz; cx = W/2; cy = H/2; R = sz/2;
  }
  resize();
  window.addEventListener('resize', resize);

  const BAR_COUNT = 22;
  const barE = Array.from({length: BAR_COUNT}, () => Math.random()*0.3+0.1);
  const barV = new Array(BAR_COUNT).fill(0);
  const barT = Array.from({length: BAR_COUNT}, () => Math.random());

  function updateBars() {
    for (let i = 0; i < BAR_COUNT; i++) {
      if (isPlaying) {
        if (Math.random() < 0.07) barT[i] = 0.2 + Math.random() * 0.8;
        barT[i] *= 0.94;
        if (barT[i] < 0.12) barT[i] = 0.12 + Math.random() * 0.25;
      } else {
        barT[i] = 0.05 + Math.abs(Math.sin(t*0.4 + i*0.35)) * 0.12;
      }
      barV[i] += (barT[i] - barE[i]) * 0.28;
      barV[i] *= 0.62;
      barE[i] = Math.max(0.03, Math.min(1, barE[i] + barV[i]));
    }
  }

  function drawEQAreaConnected() {
    const maxH = R * 0.13;
    const gap = R * 0.52 / BAR_COUNT;

    const leftStart = cx - R * 0.70;
    const rightStart = cx + R * 0.14;

    const leftPts = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const x = leftStart + i * gap + gap * 0.5;
      const h = barE[i] * maxH;
      leftPts.push({x, h});
    }
    const rightPts = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const x = rightStart + i * gap + gap * 0.5;
      const h = barE[i] * maxH;
      rightPts.push({x, h});
    }

    const allTopPts = [];
    const allBotPts = [];

    leftPts.forEach(p => {
      allTopPts.push({x: p.x, y: cy - p.h});
      allBotPts.push({x: p.x, y: cy + p.h});
    });

    const bridgeSteps = 12;
    const lx = leftPts[BAR_COUNT-1].x;
    const lh = leftPts[BAR_COUNT-1].h;
    const rx = rightPts[0].x;
    const rh = rightPts[0].h;
    for (let s = 1; s < bridgeSteps; s++) {
      const prog = s / bridgeSteps;
      const x = lx + (rx - lx) * prog;
      const baseH = lh + (rh - lh) * prog;
      const dip = Math.sin(prog * Math.PI) * baseH * 0.65;
      const h = baseH - dip;
      allTopPts.push({x, y: cy - Math.max(h, 1)});
      allBotPts.push({x, y: cy + Math.max(h, 1)});
    }

    rightPts.forEach(p => {
      allTopPts.push({x: p.x, y: cy - p.h});
      allBotPts.push({x: p.x, y: cy + p.h});
    });

    allTopPts.sort((a,b) => a.x - b.x);
    allBotPts.sort((a,b) => a.x - b.x);

    const x0 = allTopPts[0].x;
    const x1 = allTopPts[allTopPts.length-1].x;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    ctx.clip();

    const gradTop = ctx.createLinearGradient(x0, 0, x1, 0);
    gradTop.addColorStop(0,   'rgba(0,160,200,0.0)');
    gradTop.addColorStop(0.06,'rgba(0,160,200,0.6)');
    gradTop.addColorStop(0.45,'rgba(0,210,240,0.75)');
    gradTop.addColorStop(0.55,'rgba(0,210,240,0.75)');
    gradTop.addColorStop(0.94,'rgba(0,160,200,0.6)');
    gradTop.addColorStop(1,   'rgba(0,160,200,0.0)');

    ctx.beginPath();
    ctx.moveTo(allTopPts[0].x, cy);
    allTopPts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(allTopPts[allTopPts.length-1].x, cy);
    ctx.closePath();
    ctx.fillStyle = gradTop;
    ctx.fill();

    const gradBot = ctx.createLinearGradient(x0, 0, x1, 0);
    gradBot.addColorStop(0,   'rgba(160,0,220,0.0)');
    gradBot.addColorStop(0.06,'rgba(160,0,220,0.6)');
    gradBot.addColorStop(0.45,'rgba(200,60,255,0.75)');
    gradBot.addColorStop(0.55,'rgba(200,60,255,0.75)');
    gradBot.addColorStop(0.94,'rgba(160,0,220,0.6)');
    gradBot.addColorStop(1,   'rgba(160,0,220,0.0)');

    ctx.beginPath();
    ctx.moveTo(allBotPts[0].x, cy);
    allBotPts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(allBotPts[allBotPts.length-1].x, cy);
    ctx.closePath();
    ctx.fillStyle = gradBot;
    ctx.fill();

    const lineTop = ctx.createLinearGradient(x0, 0, x1, 0);
    lineTop.addColorStop(0,   'rgba(0,200,255,0.0)');
    lineTop.addColorStop(0.06,'rgba(0,220,255,0.9)');
    lineTop.addColorStop(0.5, 'rgba(120,240,255,1.0)');
    lineTop.addColorStop(0.94,'rgba(0,220,255,0.9)');
    lineTop.addColorStop(1,   'rgba(0,200,255,0.0)');

    ctx.beginPath();
    ctx.moveTo(allTopPts[0].x, allTopPts[0].y);
    for (let i = 1; i < allTopPts.length; i++) {
      const prev = allTopPts[i-1];
      const curr = allTopPts[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(allTopPts[allTopPts.length-1].x, allTopPts[allTopPts.length-1].y);
    ctx.strokeStyle = lineTop;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,230,255,1)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const lineBot = ctx.createLinearGradient(x0, 0, x1, 0);
    lineBot.addColorStop(0,   'rgba(180,0,255,0.0)');
    lineBot.addColorStop(0.06,'rgba(190,0,255,0.9)');
    lineBot.addColorStop(0.5, 'rgba(220,80,255,1.0)');
    lineBot.addColorStop(0.94,'rgba(190,0,255,0.9)');
    lineBot.addColorStop(1,   'rgba(180,0,255,0.0)');

    ctx.beginPath();
    ctx.moveTo(allBotPts[0].x, allBotPts[0].y);
    for (let i = 1; i < allBotPts.length; i++) {
      const prev = allBotPts[i-1];
      const curr = allBotPts[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.lineTo(allBotPts[allBotPts.length-1].x, allBotPts[allBotPts.length-1].y);
    ctx.strokeStyle = lineBot;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(200,0,255,1)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function drawBigCenterWave() {
    const avgE = isPlaying
      ? barE.reduce((a,b)=>a+b,0)/BAR_COUNT
      : 0.3 + Math.sin(t*0.5)*0.05;

    const waveW = R * 0.58;
    const pts = 200;
    const baseAmp = R * 0.28;
    const amp = baseAmp * (0.55 + avgE * 0.7);
    const freq = isPlaying ? (3.5 + avgE * 0.8) : 3.5;
    const speed = isPlaying ? t * 5 : t * 1.2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    ctx.clip();

    function buildWavePath(signY) {
      ctx.beginPath();
      for (let j = 0; j <= pts; j++) {
        const prog = j / pts;
        const x = cx - waveW + prog * waveW * 2;
        const env = Math.sin(prog * Math.PI);
        const wave = Math.sin(prog * Math.PI * freq + speed) * env;
        const y = cy + signY * wave * amp;
        j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }

    ctx.save();
    buildWavePath(-1);
    ctx.strokeStyle = 'rgba(0,210,255,0.18)';
    ctx.lineWidth = 22; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
    buildWavePath(1);
    ctx.strokeStyle = 'rgba(180,0,255,0.18)';
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    buildWavePath(-1);
    ctx.strokeStyle = 'rgba(0,200,255,0.35)';
    ctx.lineWidth = 12; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
    buildWavePath(1);
    ctx.strokeStyle = 'rgba(160,0,255,0.35)';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    buildWavePath(-1);
    const gradTop = ctx.createLinearGradient(cx - waveW, 0, cx + waveW, 0);
    gradTop.addColorStop(0,   'rgba(0,180,255,0.0)');
    gradTop.addColorStop(0.15,'rgba(0,210,255,0.95)');
    gradTop.addColorStop(0.5, 'rgba(100,235,255,1.0)');
    gradTop.addColorStop(0.85,'rgba(0,210,255,0.95)');
    gradTop.addColorStop(1,   'rgba(0,180,255,0.0)');
    ctx.strokeStyle = gradTop;
    ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,230,255,1)';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    buildWavePath(1);
    const gradBot = ctx.createLinearGradient(cx - waveW, 0, cx + waveW, 0);
    gradBot.addColorStop(0,   'rgba(160,0,255,0.0)');
    gradBot.addColorStop(0.15,'rgba(190,0,255,0.95)');
    gradBot.addColorStop(0.5, 'rgba(220,80,255,1.0)');
    gradBot.addColorStop(0.85,'rgba(190,0,255,0.95)');
    gradBot.addColorStop(1,   'rgba(160,0,255,0.0)');
    ctx.strokeStyle = gradBot;
    ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(200,0,255,1)';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.25;
    const scanGrad = ctx.createLinearGradient(cx - R*0.85, 0, cx + R*0.85, 0);
    scanGrad.addColorStop(0, 'transparent');
    scanGrad.addColorStop(0.3, 'rgba(0,210,255,0.4)');
    scanGrad.addColorStop(0.7, 'rgba(0,210,255,0.4)');
    scanGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(cx - R*0.85, cy - 0.5, R*1.7, 1);
    ctx.restore();

    ctx.save();
    [cx - R*0.76, cx + R*0.76].forEach(dx => {
      ctx.beginPath();
      ctx.arc(dx, cy, 3.5, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,220,255,0.9)';
      ctx.shadowColor = 'rgba(0,220,255,1)';
      ctx.shadowBlur = 12;
      ctx.fill();
    });
    ctx.restore();

    ctx.restore();
  }

  function drawAmbient() {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = 'rgba(0,180,255,1)';
    ctx.lineWidth = 0.5;
    [-0.22, 0, 0.22].forEach(off => {
      ctx.beginPath();
      ctx.moveTo(cx - R*0.9, cy + off*R);
      ctx.lineTo(cx + R*0.9, cy + off*R);
      ctx.stroke();
    });
    ctx.restore();
  }

  function draw() {
    t += 0.035;
    updateBars();
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.clip();
    drawAmbient();
    drawEQAreaConnected();
    drawBigCenterWave();
    ctx.restore();
    requestAnimationFrame(draw);
  }

  draw();

  if (scIframe && window.SC && SC.Widget) {
    widget = SC.Widget(scIframe);

    playBtn.disabled = true;
    playBtn.textContent = 'LOADING...';

    widget.bind(SC.Widget.Events.READY, function() {
      widgetReady = true;
      playBtn.disabled = false;
      playBtn.textContent = '▶ PLAY';
    });

    widget.bind(SC.Widget.Events.PLAY, function() {
      isPlaying = true;
      playBtn.textContent = '⏸ PAUSE';
    });

    widget.bind(SC.Widget.Events.PAUSE, function() {
      isPlaying = false;
      playBtn.textContent = '▶ PLAY';
    });

    widget.bind(SC.Widget.Events.FINISH, function() {
      isPlaying = false;
      playBtn.textContent = '▶ PLAY';
    });
  } else {
    playBtn.disabled = false;
    playBtn.textContent = '▶ PLAY';
  }

  playBtn.addEventListener('click', () => {
    if (widget && widgetReady) {
      widget.isPaused(function(paused) {
        if (paused) {
          widget.play();
        } else {
          widget.pause();
        }
      });
    } else {
      isPlaying = !isPlaying;
      playBtn.textContent = isPlaying ? '⏸ PAUSE' : '▶ PLAY';
    }
  });
});
