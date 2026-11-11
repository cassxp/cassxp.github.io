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
    {url: base + '/witch-house.mp3', title: 'Witch House', artist: 'CassXP · Playlist', available: false}
  ];
  const routes = new Set(['/', '/index.html', '/clips.html', '/news.html', '/jadedevonne.html', '/conheca-cass.html', '/contact.html', '/vods.html']);
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
    <audio preload="metadata" playsinline aria-label="Música do site CassXP"></audio>`;
  document.body.appendChild(el);

  const audio = el.querySelector('audio');
  const toggle = el.querySelector('.music-toggle');
  const previous = el.querySelector('.music-prev');
  const next = el.querySelector('.music-next');
  const volume = el.querySelector('.music-volume');
  const feedback = el.querySelector('.music-feedback');
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
    if (pausedByUser || !audio.paused) return;
    try {
      const result = audio.play();
      if (result && typeof result.catch === 'function') result.catch(err => {
        render();
        if (err && err.name === 'NotAllowedError') {
          waitingForGesture = true;
          status('Clique em reproduzir para liberar o áudio.');
        } else if (!err || err.name !== 'AbortError') {
          status('Não foi possível reproduzir esta música.');
        }
      });
    } catch (_) { status('Clique em reproduzir para ouvir.'); }
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
  toggle.addEventListener('click', () => {
    if (audio.paused) {
      pausedByUser = false;
      attemptPlay();
    } else {
      pausedByUser = true;
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
  audio.addEventListener('playing', () => { waitingForGesture = false; status(''); render(); });
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
  const gesture = e => {
    if (!waitingForGesture || pausedByUser || !audio.paused || el.contains(e.target)) return;
    attemptPlay();
  };
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', e => {
    if (['Tab','Shift','Alt','Control','Meta'].includes(e.key)) return;
    gesture(e);
  }, true);
  window.addEventListener('pageshow', () => { if (!pausedByUser && audio.paused) attemptPlay(); });
  render();
  attemptPlay();

  // Em prévia independente a navegação já é SPA por hash; não interceptar seus links.
  // Em file:// a navegação completa é mantida; via HTTP(S) o mesmo áudio permanece montado.
  if (preview || !['https:', 'http:'].includes(location.protocol)) return;

  let serial = 0;
  function isInternal(url) {
    return url.origin === location.origin && routes.has(url.pathname);
  }
  async function transition(url, push = true) {
    const current = ++serial;
    try {
      const response = await fetch(url.pathname + url.search, {credentials: 'same-origin'});
      if (!response.ok) throw new Error('Página não encontrada');
      const html = await response.text();
      if (current !== serial) return;
      const next = new DOMParser().parseFromString(html, 'text/html');
      const incoming = next.querySelector('main.page-main');
      const existing = document.querySelector('main.page-main');
      if (!incoming || !existing) throw new Error('Estrutura diferente');
      existing.replaceWith(incoming);
      document.title = next.title;
      for (const selector of ['meta[name="description"]','link[rel="canonical"]','meta[property="og:title"]','meta[property="og:description"]','meta[property="og:image"]']) {
        const a = next.head.querySelector(selector), b = document.head.querySelector(selector);
        if (a && b) b.replaceWith(a.cloneNode(true));
      }
      const activeUrl = url.pathname.endsWith('/news.html') ? 'clips.html' : url.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav a').forEach(a => {
        a.removeAttribute('aria-current');
        if (a.getAttribute('href') === activeUrl) a.setAttribute('aria-current', 'page');
      });
      document.querySelector('.nav')?.classList.remove('open');
      document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');
      if (push) history.pushState({cassxp:true},'',url.pathname+url.search+url.hash);
      document.dispatchEvent(new CustomEvent('cassxp:pagechange', {detail:{url:url.href}}));
      if (url.hash) {
        requestAnimationFrame(() => document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView());
      } else window.scrollTo(0,0);
      // A medição do app.js é carregada apenas no domínio oficial.
      if (location.hostname === 'cassxp.github.io' && typeof window.gtag === 'function') {
        window.gtag('event','page_view', {page_location:url.href, page_title:document.title});
      }
    } catch (_) {
      if (current !== serial) return;
      if (push) location.assign(url.href);
      else location.reload();
    }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href); } catch (_) { return; }
    if (!isInternal(url)) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      if (url.hash) return;
      event.preventDefault(); return;
    }
    event.preventDefault();
    transition(url, true);
  }, true);
  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    if (isInternal(url)) transition(url, false);
  });
})();
