/* CassXP — player persistente para o Stream Hub.
 * Usa o MP3 já existente no site original, sem redistribuir a música no pacote.
 * Mantém o mesmo elemento <audio> vivo durante a navegação por fetch (HTTP/HTTPS).
 */
(() => {
  'use strict';
  if (document.getElementById('cassxp-music')) return;

  // Playlist CassXP: 7 Rings, Flower in a Hurricane e Witch House.
  const base = location.hostname === 'cassxp.github.io' ? '' : 'https://cassxp.github.io';
  const TRACKS = [
    {url: base + '/7-rings.mp3', title: '7 rings', artist: 'Ariana Grande', available: true},
    {url: base + '/flower-in-a-hurricane.mp3', title: 'Flower in a Hurricane', artist: 'CassXP · Playlist', available: false},
    {url: base + '/Witch%20House.mp3', title: 'Witch House', artist: 'CassXP · Playlist', available: false}
  ];
  const routes = new Set(['/', '/index.html', '/clips.html', '/lives.html', '/news.html', '/jadedevonne.html', '/conheca-cass.html', '/contact.html', '/vods.html']);
  const preview = document.querySelector('.demo-page') !== null;
  const storeKey = 'cassxp-streamhub-';
  const get = key => { try { return sessionStorage.getItem(storeKey + key); } catch (_) { return null; } };
  const put = (key, val) => { try { sessionStorage.setItem(storeKey + key, String(val)); } catch (_) {} };

  const el = document.createElement('aside');
  el.id = 'cassxp-music';
  el.className = 'music-player';
  el.setAttribute('aria-label', 'Player da música de fundo');
  el.innerHTML = `
    <div class="music-art" aria-hidden="true">♫</div>
    <div class="music-info"><strong>7 rings</strong><span>Ariana Grande</span></div>
    <button class="music-prev" type="button" aria-label="Música anterior" title="Música anterior">⏮</button>
    <button class="music-toggle" type="button" aria-label="Reproduzir música" title="Reproduzir música">▶</button>
    <button class="music-next" type="button" aria-label="Próxima música" title="Próxima música">⏭</button>
    <label class="music-volume-label"><span class="sr-only">Volume da música</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m11 5-5 4H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>
      <input class="music-volume" type="range" min="0" max="100" step="1" value="40" aria-label="Volume da música" />
    </label>
    <span class="music-feedback sr-only" role="status" aria-live="polite"></span>
    <button class="music-unlock" type="button" hidden>Ativar som</button>
    <audio preload="auto" autoplay playsinline aria-label="Música do site CassXP"></audio>`;
  document.body.appendChild(el);

  const audio = el.querySelector('audio');
  const toggle = el.querySelector('.music-toggle');
  const previous = el.querySelector('.music-prev');
  const next = el.querySelector('.music-next');
  const volume = el.querySelector('.music-volume');
  const feedback = el.querySelector('.music-feedback');
  const unlock = el.querySelector('.music-unlock');
  const songName = el.querySelector('.music-info strong');
  const songArtist = el.querySelector('.music-info span');
  let pausedByUser = false;
  let waitingForGesture = false;
  let lastStored = -1;
  let trackIndex = 0;
  let transitionRequested = false;

  const storedVolume = Number(get('volume'));
  const startVolume = get('volume') !== null && Number.isFinite(storedVolume)
    ? Math.min(100, Math.max(0, storedVolume)) : 40;
  volume.value = startVolume;
  audio.volume = startVolume / 100;

  function status(message) {
    feedback.textContent = message || '';
    el.title = message || 'CassXP — ' + TRACKS[trackIndex].title;
  }
  function showUnlock(show) {
    unlock.hidden = !show;
    el.classList.toggle('needs-interaction', show);
  }
  function render() {
    const playing = !audio.paused && !audio.ended;
    toggle.textContent = playing ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproduzir música');
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.title = playing ? 'Pausar música' : 'Reproduzir música';
    el.classList.toggle('is-playing', playing);
  }
  function syncLabel() {
    const track = TRACKS[trackIndex];
    songName.textContent = track.title;
    songArtist.textContent = track.artist;
    audio.setAttribute('aria-label', track.title);
    status('');
  }
  function attemptPlay() {
    if (pausedByUser || !audio.paused || !audio.src) return;
    try {
      const result = audio.play();
      if (result && typeof result.catch === 'function') result.catch(err => {
        render();
        if (err && err.name === 'NotAllowedError') {
          waitingForGesture = true;
          showUnlock(true);
          status('O navegador bloqueou o áudio automático. Clique para liberar o som.');
        } else if (!err || err.name !== 'AbortError') {
          status('Não foi possível reproduzir esta música.');
        }
      });
    } catch (_) {
      waitingForGesture = true;
      showUnlock(true);
      status('Clique para liberar o áudio.');
    }
  }
  function chooseTrack(index, keepPaused = false) {
    trackIndex = index;
    const track = TRACKS[index];
    lastStored = -1;
    put('time', 0);
    put('track', index);
    audio.src = track.url;
    audio.loop = false;
    syncLabel();
    if (!keepPaused) {
      pausedByUser = false;
      attemptPlay();
    }
    render();
  }
  function availableIndices() { return TRACKS.map((track, i) => track.available ? i : -1).filter(i => i >= 0); }
  function step(direction) {
    const playable = availableIndices();
    if (!playable.length) return;
    const pos = playable.indexOf(trackIndex);
    const nextPos = pos < 0 ? 0 : (pos + direction + playable.length) % playable.length;
    chooseTrack(playable[nextPos]);
    if (playable.length === 1) status('As outras faixas ainda não estão disponíveis no site.');
  }
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  unlock.addEventListener('click', () => {
    pausedByUser = false;
    showUnlock(false);
    attemptPlay();
  });
  toggle.addEventListener('click', () => {
    if (audio.paused) {
      pausedByUser = false;
      attemptPlay();
    } else {
      pausedByUser = true;
      waitingForGesture = false;
      showUnlock(false);
      audio.pause();
      status('Música pausada.');
    }
  });
  volume.addEventListener('input', () => {
    const value = Number(volume.value);
    audio.volume = value / 100;
    put('volume', value);
    if (!pausedByUser && audio.paused) attemptPlay();
  });
  audio.addEventListener('playing', () => {
    waitingForGesture = false;
    showUnlock(false);
    status('');
    render();
  });
  audio.addEventListener('pause', render);
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('error', () => {
    if (transitionRequested) return;
    transitionRequested = true;
    const badTrack = TRACKS[trackIndex];
    badTrack.available = false;
    const remaining = availableIndices();
    if (remaining.length && remaining[0] !== trackIndex) step(1);
    else status('Áudio indisponível neste momento.');
    transitionRequested = false;
    render();
  });
  audio.addEventListener('loadedmetadata', () => {
    const oldTime = Number(get('time'));
    if (Number.isFinite(oldTime) && oldTime > 0 && oldTime < audio.duration) {
      try { audio.currentTime = oldTime; } catch (_) {}
    }
  }, {once:true});
  audio.addEventListener('timeupdate', () => {
    const second = Math.floor(audio.currentTime);
    if (second % 4 === 0 && second !== lastStored) { lastStored = second; put('time', audio.currentTime); }
  });
  // Só adiciona à rotação faixas cujo arquivo de áudio foi efetivamente publicado.
  if (location.protocol === 'https:' && location.hostname === 'cassxp.github.io') {
    TRACKS.slice(1).forEach(async track => {
      try {
        const response = await fetch(track.url, {method:'HEAD'});
        const type = response.headers.get('content-type') || '';
        track.available = response.ok && /audio|octet-stream/i.test(type);
      } catch (_) { track.available = false; }
    });
  }
  const savedTrack = Number(get('track'));
  chooseTrack(Number.isInteger(savedTrack) && savedTrack >= 0 && savedTrack < TRACKS.length && TRACKS[savedTrack].available ? savedTrack : 0, true);
  // O navegador pode negar autoplay com som. A primeira interação
  // real com o site deve liberar a reprodução sem exigir clique no player.
  // Não interferir quando o visitante tiver pausado a música manualmente.
  const gesture = event => {
    if (pausedByUser || !audio.paused || !audio.src) return;
    if (el.contains(event.target)) return;
    if (event.type === 'keydown' && ['Tab','Shift','Alt','Control','Meta','Escape'].includes(event.key)) return;
    waitingForGesture = false;
    showUnlock(false);
    attemptPlay();
  };
  // pointerup cobre toques, click cobre teclas/tecnologias assistivas
  // e gestos de mouse em navegadores com ativação de usuário diferente.
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('pointerup', gesture, true);
  document.addEventListener('click', gesture, true);
  document.addEventListener('keydown', gesture, true);
  window.addEventListener('pageshow', () => {
    if (!pausedByUser && audio.paused) attemptPlay();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !pausedByUser && audio.paused && !waitingForGesture) attemptPlay();
  });
  render();
  attemptPlay();

  // Em prévia independente a navegação já é SPA por hash; não interceptar seus links.
  // Em file:// a navegação completa é mantida; via HTTP(S) o mesmo áudio permanece montado.
  if (preview || !['https:', 'http:'].includes(location.protocol)) return;

  // A tela da transição vive no mesmo DOM que o player: música contínua.
  let serial = 0;
  let displayedRoute = location.pathname + location.search;
  const pageSweep = document.createElement('div');
  pageSweep.className = 'cassxp-page-sweep';
  pageSweep.setAttribute('aria-hidden', 'true');
  // Renderização real a cada quadro: órbitas, runas, traços de luz e faíscas.
  // Diferentemente da versão anterior, o desenho inteiro evolui pelo tempo.
  // Anéis CSS/SVG independentes permanecem animados mesmo se o Canvas atrasar.
  const backupRunes = Array.from({length:12}, (_, i) =>
    '<g transform="rotate('+(i*30)+' 250 250)"><circle cx="250" cy="48" r="14"/>'+
    '<path d="M244 45 L250 36 L256 45 L250 57 Z M243 47 L257 47"/></g>'
  ).join('');
  pageSweep.innerHTML = `
    <div class="cassxp-arcane-backup" aria-hidden="true">
      <svg viewBox="0 0 500 500" focusable="false">
        <g class="arcane-backup-outside">
          <circle cx="250" cy="250" r="235"/><circle cx="250" cy="250" r="220"/>
          <circle cx="250" cy="250" r="186"/>
          ${backupRunes}
        </g>
        <g class="arcane-backup-mid">
          <circle cx="250" cy="250" r="173"/><circle cx="250" cy="250" r="143"/>
          <path d="M250 96 L383 327 L117 327 Z M250 404 L117 173 L383 173 Z"/>
          <path d="M250 108 L392 250 L250 392 L108 250 Z"/>
          <circle cx="250" cy="250" r="117"/>
        </g>
        <g class="arcane-backup-inside">
          <circle cx="250" cy="250" r="101"/><circle cx="250" cy="250" r="67"/>
          <path d="M250 145 L323 323 L145 218 L355 218 L177 323 Z"/>
          <path d="M250 178 L250 322 M178 250 L322 250 M199 199 L301 301 M301 199 L199 301"/>
        </g>
      </svg>
    </div>
    <canvas class="cassxp-arcane-canvas" aria-hidden="true"></canvas>
    <div class="cassxp-arcane-caption">
      <span>CASS<span class="cassxp-arcane-xp">XP</span></span>
      <small>INVOCANDO O PORTAL</small>
      <strong class="cassxp-fx-destination">O UNIVERSO CASSXP</strong>
    </div>`;
  document.body.appendChild(pageSweep);
  const fxDestination = pageSweep.querySelector('.cassxp-fx-destination');
  const magicCanvas = pageSweep.querySelector('.cassxp-arcane-canvas');
  const magicCtx = (() => {
    try { return magicCanvas.getContext('2d', {alpha:true}); }
    catch (_) { return null; }
  })();
  let magicFrame = 0;
  let magicStarted = 0;
  let magicLastPaint = 0;
  let magicSlowFrames = 0;
  let magicW = 0, magicH = 0, magicScale = 1;
  const pageNames = {
    'index.html':'INÍCIO', 'lives.html':'LIVES', 'clips.html':'CLIPES', 'vods.html':'VODS',
    'jadedevonne.html':'JADE DEVONNE', 'conheca-cass.html':'CONHEÇA CASS',
    'contact.html':'CONTATO', 'news.html':'CLIPES'
  };
  // A animação foi solicitada explicitamente para este site. Um visitante pode
  // optar pela versão suave com ?magia=reduzida, sem afetar a navegação.
  const magicParam = new URLSearchParams(location.search).get('magia');
  const forceMagic = magicParam === '1';
  const reduceMagic = magicParam === 'reduzida';
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  function stopArcane() {
    if (magicFrame) cancelAnimationFrame(magicFrame);
    magicFrame = 0;
  }
  function startArcane() {
    stopArcane();
    // O SVG já está visível e animando. Deixa duas oportunidades de pintura
    // antes de preparar o Canvas, evitando o fundo roxo vazio no primeiro frame.
    if (!magicCtx) return;
    magicFrame = requestAnimationFrame(() => {
      magicFrame = requestAnimationFrame(() => {
        if (!pageSweep.classList.contains('is-covering')) return;
        try {
          const bounds = pageSweep.getBoundingClientRect();
          magicW = Math.max(1, Math.round(bounds.width || window.innerWidth));
          magicH = Math.max(1, Math.round(bounds.height || window.innerHeight));
          magicScale = 1;
          magicCanvas.width = magicW;
          magicCanvas.height = magicH;
          magicCtx.setTransform(1,0,0,1,0,0);
          magicStarted = performance.now();
          magicLastPaint = 0;
          magicSlowFrames = 0;
          drawArcane(magicStarted);
        } catch (_) {
          stopArcane();
          pageSweep.classList.remove('has-canvas');
        }
      });
    });
  }
  function drawArcane(now) {
    if (!pageSweep.classList.contains('is-covering')) {
      magicFrame = 0;
      return;
    }
    // Limita o Canvas a cerca de 30 FPS para reduzir travamentos.
    // Os círculos SVG giram a 60 FPS pelo compositor CSS independentemente.
    if (magicLastPaint && now - magicLastPaint < 32) {
      magicFrame = requestAnimationFrame(drawArcane);
      return;
    }
    if (magicLastPaint && now - magicLastPaint > 115) magicSlowFrames++;
    else magicSlowFrames = Math.max(0, magicSlowFrames - 1);
    if (magicSlowFrames >= 5) {
      // Em dispositivo lento: mantém só o círculo SVG, sem tela vazia.
      pageSweep.classList.remove('has-canvas');
      magicFrame = 0;
      return;
    }
    magicLastPaint = now;
    const ctx = magicCtx;
    const gentle = reduceMagic;
    const t = gentle ? 1.4 : Math.max(.13,(now - magicStarted) / 1000);
    const R = Math.min(magicW * .39, magicH * .32, 275);
    const cx = magicW / 2, cy = magicH * .43;
    const grow = Math.min(1, (t + .28) / .78);
    const entrance = 1 - Math.pow(1-grow, 3);
    ctx.clearRect(0,0,magicW,magicH);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Nuvens mágicas, em movimento lento e contínuo.
    for (let k=0; k<3; k++) {
      const x = cx + Math.sin(t*.57 + k*2.17)*R*.75;
      const y = cy + Math.cos(t*.48 + k*1.39)*R*.55;
      const grad = ctx.createRadialGradient(x,y,4,x,y,R*(.75+k*.08));
      grad.addColorStop(0,'rgba(204,32,179,.19)');
      grad.addColorStop(.48,'rgba(120,20,138,.12)');
      grad.addColorStop(1,'rgba(60,8,70,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();ctx.arc(x,y,R*(.75+k*.08),0,Math.PI*2);ctx.fill();
    }

    ctx.translate(cx,cy);
    ctx.scale(entrance,entrance);
    const line=(width,color,blur=12)=>{
      ctx.strokeStyle=color;ctx.lineWidth=width;
      ctx.shadowColor='#ff27d3';ctx.shadowBlur=blur;
      ctx.lineCap='round';ctx.lineJoin='round';
    };
    const circle=(radius)=>{
      ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
    };
    // 3 conjuntos independentes: em cada frame os ângulos são diferentes.
    ctx.save();
    ctx.rotate(t*.72);
    line(1.9,'rgba(255,72,211,.92)',17);
    circle(R);circle(R*.968);circle(R*.847);
    ctx.setLineDash([2,8]);line(1.4,'#ffa3ef',10);circle(R*1.029);ctx.setLineDash([]);
    // Marcações e doze cápsulas de runas.
    for(let i=0;i<72;i++){
      const a=i*Math.PI/36;
      const r1=R*(i%6===0?.911:.937);
      const r2=R*(i%6===0?.967:.954);
      line(i%6===0?1.6:.9,'#ff67e1',0);
      ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);
      ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);ctx.stroke();
    }
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6-Math.PI/2;
      ctx.save();ctx.translate(Math.cos(a)*R*.886,Math.sin(a)*R*.886);
      ctx.rotate(a+Math.PI/2);
      line(1.3,'#ff74e7',0);circle(R*.068);
      const z=R*.036;
      ctx.beginPath();
      if(i%3===0){ctx.moveTo(-z,-z);ctx.lineTo(0,z);ctx.lineTo(z,-z);ctx.moveTo(-z,0);ctx.lineTo(z,0);}
      else if(i%3===1){ctx.moveTo(0,-z);ctx.lineTo(0,z);ctx.moveTo(-z,-z*.5);ctx.lineTo(0,-z);ctx.lineTo(z,-z*.5);ctx.moveTo(-z,z*.5);ctx.lineTo(z,z*.5);}
      else{ctx.moveTo(-z,-z);ctx.lineTo(z,z);ctx.moveTo(z,-z);ctx.lineTo(-z,z);ctx.moveTo(-z,0);ctx.lineTo(z,0);}
      ctx.stroke();ctx.restore();
    }
    ctx.restore();
    // Contra-rotação do mandala central (visível ao longo da animação).
    ctx.save();ctx.rotate(-t*1.13);
    line(1.65,'rgba(255,58,225,.94)',14);
    circle(R*.77);circle(R*.685);circle(R*.55);
    const polygon=(n,rad,step=1,turn=-Math.PI/2)=>{
      ctx.beginPath();
      for(let i=0;i<n;i++){
        const a=turn+(i*step%n)*2*Math.PI/n;
        const x=Math.cos(a)*rad,y=Math.sin(a)*rad;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.stroke();
    };
    line(1.3,'#fc59da',11);polygon(8,R*.76,3);polygon(6,R*.685);polygon(12,R*.6,5);
    ctx.restore();
    ctx.save();ctx.rotate(t*.61);
    line(2,'#ff72e8',18);circle(R*.49);circle(R*.33);
    polygon(5,R*.475,2);polygon(8,R*.32,3);
    ctx.restore();

    // Trilhas intensas de luz que percorrem as bordas com velocidades próprias.
    for(let j=0;j<5;j++){
      const angle=(j*2.19)+(t*(1.6+j*.22))*(j%2?-1:1);
      const rr=R*[.996,.83,.7,.54,.365][j];
      ctx.save();ctx.rotate(angle);
      line(j===0?4:2.7,j%2===0?'#fff0ff':'#ff8bec',26);
      ctx.beginPath();ctx.arc(0,0,rr,0,.15+j*.03);ctx.stroke();
      ctx.restore();
    }

    // Sigilo central brilhante, que pulsa como um núcleo de energia.
    const pulse=1+.07*Math.sin(t*9);
    ctx.save();ctx.scale(pulse,pulse);
    const glow=ctx.createRadialGradient(0,0,1,0,0,R*.29);
    glow.addColorStop(0,'rgba(255,238,255,.27)');
    glow.addColorStop(.2,'rgba(255,69,226,.19)');
    glow.addColorStop(1,'rgba(255,14,187,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,R*.29,0,Math.PI*2);ctx.fill();
    line(2.1,'#ffb3f4',22);
    for(let a=0;a<8;a++){
      const ang=a*Math.PI/4;
      ctx.beginPath();ctx.moveTo(Math.cos(ang)*R*.07,Math.sin(ang)*R*.07);
      ctx.lineTo(Math.cos(ang)*R*.2,Math.sin(ang)*R*.2);ctx.stroke();
    }
    circle(R*.11);
    ctx.restore();

    // Poeira mágica não repete uma posição estática: flutua e cintila.
    ctx.shadowBlur=0;ctx.shadowColor='transparent';
    for(let i=0;i<62;i++){
      const seed=i*2.3999632297;
      const distance=.19+(i%29)/29*1.28;
      const speed=(i%2===0?1:-1)*(.16+i%7*.075);
      const a=seed+t*speed;
      const r=R*distance*(1+.025*Math.sin(t*4+i));
      const x=Math.cos(a)*r+Math.sin(t*.7+i)*7;
      const y=Math.sin(a)*r+Math.cos(t*.43+i)*9;
      const flicker=(Math.sin(t*(3+i%5)+i*2.1)+1)/2;
      ctx.globalAlpha=(.14+.77*flicker)*Math.min(1,t*2);
      ctx.fillStyle=i%7===0?'#fff4ff':'#ff64dc';
      const size=1+(i%5)*.52;
      ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    // Onda luminosa no fim: a página de destino nasce da magia.
    if(pageSweep.classList.contains('is-leaving')) {
      const q=Math.min(1,Math.max(0,(t-3.08)/.7));
      const rad=R*(.34+q*2.55);
      line(2+q*12,'rgba(255,151,248,'+(1-q)+')',35);
      circle(rad);
      const flash=ctx.createRadialGradient(0,0,0,0,0,R*(.28+q*1.9));
      flash.addColorStop(0,'rgba(255,245,255,'+(.6*(1-q))+')');
      flash.addColorStop(.4,'rgba(255,84,224,'+(.28*(1-q))+')');
      flash.addColorStop(1,'rgba(255,42,191,0)');
      ctx.fillStyle=flash;ctx.beginPath();ctx.arc(0,0,R*(.28+q*1.9),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    pageSweep.classList.add("has-canvas");
    if (!gentle) {
      magicFrame=requestAnimationFrame((when) => {
        try { drawArcane(when); }
        catch (_) {
          stopArcane();
          pageSweep.classList.remove('has-canvas');
        }
      });
    } else magicFrame=0;
  }

  function resetPageFx() {
    stopArcane();
    pageSweep.classList.remove('is-ready','is-covering','is-leaving','has-canvas');
    magicLastPaint = 0;
    magicSlowFrames = 0;
  }
  function updateNav(url) {
    const activeUrl = url.pathname.endsWith('/news.html') ? 'clips.html'
      : url.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach(a => {
      a.removeAttribute('aria-current');
      if (a.getAttribute('href') === activeUrl) a.setAttribute('aria-current', 'page');
    });
    document.querySelector('.nav')?.classList.remove('open');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
  }
  function scrollToDestination(url) {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    try {
      if (url.hash) {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (target) target.scrollIntoView({block:'start',behavior:'instant'});
        else window.scrollTo({top:0,behavior:'instant'});
      } else {
        window.scrollTo({top:0,behavior:'instant'});
      }
    } catch (_) { window.scrollTo(0,0); }
    document.documentElement.style.scrollBehavior = prev;
  }
  function isInternal(url) {
    return url.origin === location.origin && routes.has(url.pathname);
  }
  async function transition(url, push = true, onlyAnchor = false) {
    const current = ++serial;
    resetPageFx();
    // O painel CassXP aparece sempre; em movimento reduzido faz apenas fade.
    const doMotion = true;
    const gentleMotion = reduceMagic;
    pageSweep.classList.toggle('is-reduced', gentleMotion);
    const sameDocument = onlyAnchor || displayedRoute === url.pathname + url.search;

    // Inicia a transição IMEDIATAMENTE no clique, sem esperar download HTML.
    // Isso também inclui Lives/Jogos ao navegar para âncoras na mesma página.
    if (doMotion) {
      fxDestination.textContent = pageNames[url.pathname.split('/').pop() || 'index.html'] ||
        (url.hash ? url.hash.slice(1).toUpperCase() : 'CASSXP');
      if (url.hash === '#lives') fxDestination.textContent = 'LIVES';
      if (url.hash === '#jogos') fxDestination.textContent = 'JOGOS';
      pageSweep.classList.add('is-ready');
      // Força o estado inicial antes da transição CSS, inclusive com cache quente.
      void pageSweep.offsetWidth;
      pageSweep.classList.add('is-covering');
      startArcane();
    }

    try {
      // O fetch é simultâneo ao efeito; nunca deixa a tela branca carregando.
      const responsePromise = sameDocument ? Promise.resolve(null)
        : fetch(url.pathname + url.search, {credentials:'same-origin'}).then(response => {
            if (!response.ok) throw new Error('Página não encontrada');
            return response.text();
          });

      const [html] = await Promise.all([
        responsePromise,
        sleep(gentleMotion ? 650 : 3050)
      ]);
      if (current !== serial) return;

      let incoming = null;
      if (!sameDocument) {
        const next = new DOMParser().parseFromString(html, 'text/html');
        incoming = next.querySelector('main.page-main');
        const existing = document.querySelector('main.page-main');
        if (!incoming || !existing) throw new Error('Estrutura da página não reconhecida');
        existing.replaceWith(incoming);
        document.body.className = next.body.className;
        document.title = next.title;
        for (const selector of [
          'meta[name="description"]','link[rel="canonical"]',
          'meta[property="og:title"]','meta[property="og:description"]',
          'meta[property="og:image"]'
        ]) {
          const a = next.head.querySelector(selector), b = document.head.querySelector(selector);
          if (a && b) b.replaceWith(a.cloneNode(true));
        }
      } else {
        incoming = document.querySelector('main.page-main');
      }

      displayedRoute = url.pathname + url.search;
      updateNav(url);
      if (push) history.pushState({cassxp:true},'',url.pathname+url.search+url.hash);
      scrollToDestination(url);
      if (!sameDocument) {
        document.dispatchEvent(new CustomEvent('cassxp:pagechange', {detail:{url:url.href}}));
      }
      if (doMotion) {
        // Pausa curta para a marca ficar visível e legível.
        await sleep(gentleMotion ? 240 : 280);
        if (current !== serial) return;
        pageSweep.classList.add('is-leaving');
        if (!gentleMotion && incoming && typeof incoming.animate === 'function') {
          incoming.animate([
            {opacity:.35,transform:'translateY(15px)',filter:'blur(3px)'},
            {opacity:1,transform:'translateY(0)',filter:'blur(0)'}
          ], {duration:440,easing:'cubic-bezier(.18,.7,.15,1)'});
        }
        await sleep(gentleMotion ? 450 : 760);
        if (current === serial) resetPageFx();
      }
      if (location.hostname === 'cassxp.github.io' && typeof window.gtag === 'function') {
        window.gtag('event','page_view', {page_location:url.href,page_title:document.title});
      }
    } catch (_) {
      if (current !== serial) return;
      resetPageFx();
      if (push) location.assign(url.href);
      else location.reload();
    }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href); } catch (_) { return; }
    if (!isInternal(url)) return;
    const samePage = displayedRoute === url.pathname + url.search;
    if (samePage && !url.hash) {
      event.preventDefault();
      return;
    }
    // Âncoras dos menus ganham a transição. Botões para seções dentro da
    // própria página continuam rolando normalmente, sem tela extra.
    if (samePage && url.hash && !link.closest('.nav')) return;
    event.preventDefault();
    transition(url, true, samePage);
  }, true);
  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    if (isInternal(url)) transition(url, false, displayedRoute === url.pathname + url.search);
  });
  // Prévia é iniciada assim que o DOM está pronto, sem aguardar imagens/Twitch.
  if (forceMagic) {
    const runPreview = () => requestAnimationFrame(() =>
      transition(new URL(location.href), false, true));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runPreview, {once:true});
    } else runPreview();
  }
})();
