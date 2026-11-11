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
  // Círculo arcano da transição: anéis, selos e runas vetoriais originais.
  // SVG leve, sem GIF externo; cada camada tem movimento próprio.
  const arcanePoint = (r, degrees) => {
    const a = degrees * Math.PI / 180;
    return [+(250 + Math.cos(a) * r).toFixed(2), +(250 + Math.sin(a) * r).toFixed(2)];
  };
  const arcanePolygon = (sides, r, offset = -90) =>
    Array.from({length:sides}, (_, i) => arcanePoint(r, offset + 360*i/sides).join(',')).join(' ');
  const arcaneStar = (points, step, r, offset = -90) =>
    Array.from({length:points}, (_, i) => arcanePoint(r, offset + 360*(i*step%points)/points).join(',')).join(' ');
  const arcaneTicks = Array.from({length:72}, (_, i) => {
    const a = i * 5, major = i % 6 === 0;
    const p1 = arcanePoint(major ? 211 : 217, a);
    const p2 = arcanePoint(major ? 226 : 223, a);
    return '<line x1="'+p1[0]+'" y1="'+p1[1]+'" x2="'+p2[0]+'" y2="'+p2[1]+'" />';
  }).join('');
  const arcaneRunes = Array.from({length:12}, (_, i) => {
    const [x, y] = arcanePoint(202, i*30-90);
    const glyphs = [
      'M-6 -8 L0 7 L6 -8 M-7 1 L7 1',
      'M0 -9 L0 9 M-6 -4 L0 -9 L6 -4 M-6 4 L6 4',
      'M-7 -7 L7 7 M7 -7 L-7 7 M-8 0 L8 0',
      'M-8 6 L0 -9 L8 6 M-5 -1 L5 -1'
    ];
    return '<g transform="translate('+x+' '+y+') rotate('+(i*30)+')">'+
      '<circle r="14.5" /><circle r="11.6" opacity=".5"/>'+
      '<path d="'+glyphs[i%glyphs.length]+'" /></g>';
  }).join('');
  const arcaneDust = Array.from({length:62}, (_, i) => {
    const angle = (i * 137.508 + 17) * Math.PI / 180;
    const radius = 36 + (i % 14) * 12;
    const x = Math.round(Math.cos(angle) * radius);
    const y = Math.round(Math.sin(angle) * radius);
    const driftX = Math.round(Math.cos(angle) * (45 + i % 100));
    const driftY = Math.round(Math.sin(angle) * (45 + i % 100) - 30);
    return '<i style="--px:'+x+'px;--py:'+y+'px;--mx:'+driftX+'px;--my:'+driftY+
      'px;--d:'+(i*79%1080)+'ms;--sz:'+(1+(i%4))+'px"></i>';
  }).join('');
  pageSweep.innerHTML = `
    <div class="cassxp-arcane-mist mist-a"></div>
    <div class="cassxp-arcane-mist mist-b"></div>
    <div class="cassxp-arcane-halo"></div>
    <div class="cassxp-arcane-circle">
      <svg viewBox="0 0 500 500" class="cassxp-arcane-svg" aria-hidden="true" focusable="false">
        <g class="arcane-outer">
          <circle class="arcane-stroke outer-glow" cx="250" cy="250" r="228"/>
          <circle class="arcane-stroke" cx="250" cy="250" r="220"/>
          <circle class="arcane-stroke" cx="250" cy="250" r="185"/>
          <circle class="arcane-dotted" cx="250" cy="250" r="232"/>
          <g class="arcane-ticks">${arcaneTicks}</g>
          <g class="arcane-runes">${arcaneRunes}</g>
        </g>
        <g class="arcane-mid">
          <circle class="arcane-stroke" cx="250" cy="250" r="176"/>
          <circle class="arcane-stroke subtle" cx="250" cy="250" r="167"/>
          <circle class="arcane-stroke" cx="250" cy="250" r="137"/>
          <polygon class="arcane-stroke subtle" points="${arcanePolygon(8,168)}"/>
          <polygon class="arcane-stroke" points="${arcaneStar(8,3,170)}"/>
          <polygon class="arcane-stroke subtle" points="${arcanePolygon(12,148)}"/>
        </g>
        <g class="arcane-inner">
          <circle class="arcane-stroke" cx="250" cy="250" r="115"/>
          <circle class="arcane-stroke subtle" cx="250" cy="250" r="102"/>
          <polygon class="arcane-stroke" points="${arcaneStar(5,2,104)}"/>
          <polygon class="arcane-stroke subtle" points="${arcanePolygon(6,112)}"/>
          <circle class="arcane-stroke" cx="250" cy="250" r="69"/>
          <circle class="arcane-stroke subtle" cx="250" cy="250" r="53"/>
          <polygon class="arcane-stroke" points="${arcaneStar(8,3,51)}"/>
          <path class="arcane-symbol" d="M250 206 L250 294 M222 228 L278 272 M278 228 L222 272 M229 250 L271 250 M241 217 L259 283 M259 217 L241 283"/>
        </g>
      </svg>
    </div>
    <div class="cassxp-arcane-dust">${arcaneDust}</div>
    <div class="cassxp-arcane-flare"></div>
    <div class="cassxp-arcane-caption">
      <span>CASS<span class="cassxp-arcane-xp">XP</span></span>
      <small>ABRINDO PORTAL</small>
      <strong class="cassxp-fx-destination">O UNIVERSO CASSXP</strong>
    </div>`;
  document.body.appendChild(pageSweep);
  const fxDestination = pageSweep.querySelector('.cassxp-fx-destination');
  const pageNames = {
    'index.html':'INÍCIO', 'lives.html':'LIVES', 'clips.html':'CLIPES', 'vods.html':'VODS',
    'jadedevonne.html':'JADE DEVONNE', 'conheca-cass.html':'CONHEÇA CASS',
    'contact.html':'CONTATO', 'news.html':'CLIPES'
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  function resetPageFx() {
    pageSweep.classList.remove('is-ready','is-covering','is-leaving');
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
    const gentleMotion = reducedMotion.matches;
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
        sleep(gentleMotion ? 650 : 2720)
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
})();
