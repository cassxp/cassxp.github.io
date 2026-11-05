/* CassXP: player único e navegação interna sem recarregar a música. */
(function () {
  'use strict';

  var ROUTES = ['/', '/index.html', '/jadedevonne.html', '/news.html', '/contact.html'];
  var AUDIO_URL = '/7-rings.mp3';
  var navRequest = 0;

  function stored(key) {
    try { return window.sessionStorage.getItem('cassxp-' + key); }
    catch (e) { return null; }
  }
  function save(key, value) {
    try { window.sessionStorage.setItem('cassxp-' + key, String(value)); }
    catch (e) {}
  }
  function pagePath(path) {
    return path === '/index.html' ? '/' : path;
  }
  function isInternalPage(url) {
    return url.origin === window.location.origin &&
      ROUTES.indexOf(url.pathname) !== -1;
  }
  function createPlayer() {
    var style = document.createElement('style');
    style.id = 'cassxp-player-styles';
    style.textContent =
      '#cassxp-mini-music{position:fixed;right:16px;bottom:16px;z-index:99999;' +
      'display:flex;align-items:center;gap:9px;padding:7px 11px;' +
      'max-width:calc(100vw - 32px);box-sizing:border-box;' +
      'border:1px solid #55415d;border-radius:24px;background:rgba(26,20,32,.95);' +
      'box-shadow:0 5px 22px rgba(0,0,0,.3);font:13px/1.2 Arial,sans-serif;color:#fff}' +
      '#cassxp-music-toggle{appearance:none;border:0;border-radius:50%;background:#8548a0;' +
      'color:#fff;width:32px;height:32px;font-size:16px;line-height:1;cursor:pointer;' +
      'display:grid;place-items:center;padding:0}' +
      '#cassxp-music-volume{width:80px;cursor:pointer;accent-color:#c28ada;margin:0}' +
      '#cassxp-mini-music button:focus-visible,#cassxp-mini-music input:focus-visible{' +
      'outline:2px solid #fff;outline-offset:2px}' +
      '#cassxp-music-status{font-size:11px;color:#f2ced9;max-width:135px;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#cassxp-music-status:empty{display:none}' +
      '@media(max-width:480px){#cassxp-mini-music{right:10px;bottom:10px;' +
      'padding:6px 9px;gap:7px}#cassxp-music-volume{width:62px}' +
      '#cassxp-music-status{max-width:95px}}';
    document.head.appendChild(style);

    var holder = document.createElement('div');
    holder.id = 'cassxp-mini-music';
    holder.setAttribute('aria-label', 'Controle de música');
    holder.innerHTML =
      '<button id="cassxp-music-toggle" type="button" aria-label="Reproduzir música" ' +
      'title="Reproduzir/Pausar">▶</button>' +
      '<span aria-hidden="true">🔊</span>' +
      '<input id="cassxp-music-volume" type="range" min="0" max="100" value="55" ' +
      'aria-label="Volume da música">' +
      '<span id="cassxp-music-status" role="status" aria-live="polite"></span>' +
      '<audio id="cassxp-background-music" loop preload="auto" playsinline></audio>';
    document.body.appendChild(holder);

    var audio = holder.querySelector('audio');
    var toggle = holder.querySelector('button');
    var slider = holder.querySelector('input');
    var status = holder.querySelector('#cassxp-music-status');
    var savedVolume = Number(stored('volume'));
    var volume = stored('volume') !== null && isFinite(savedVolume)
      ? Math.max(0, Math.min(100, savedVolume)) : 55;
    var pausedByUser = stored('paused') === '1';
    var lastSavedSecond = -1;
    slider.value = String(volume);
    audio.volume = volume / 100;
    audio.muted = false;
    audio.src = AUDIO_URL;

    function show(message) { status.textContent = message || ''; }
    function updateButton() {
      var playing = !audio.paused && !audio.ended;
      toggle.textContent = playing ? 'Ⅱ' : '▶';
      toggle.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproduzir música');
      toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    function playMusic() {
      if (pausedByUser || !audio.paused || audio.error) return;
      try {
        var promise = audio.play();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(function (error) {
            updateButton();
            if (!audio.paused) return;
            if (error && error.name === 'NotAllowedError') {
              show('Toque em ▶ para ouvir');
            } else if (!error || error.name !== 'AbortError') {
              show('Áudio indisponível');
            }
          });
        }
      } catch (e) {
        show('Toque em ▶ para ouvir');
      }
    }
    toggle.addEventListener('click', function () {
      if (audio.paused) {
        pausedByUser = false;
        save('paused', '0');
        playMusic();
      } else {
        pausedByUser = true;
        save('paused', '1');
        audio.pause();
        show('');
      }
    });
    slider.addEventListener('input', function () {
      var value = Number(slider.value);
      audio.volume = value / 100;
      audio.muted = false;
      save('volume', value);
      if (!pausedByUser) playMusic();
    });
    audio.addEventListener('playing', function () {
      show('');
      updateButton();
    });
    audio.addEventListener('pause', updateButton);
    audio.addEventListener('error', function () {
      show('Erro ao carregar o MP3');
      updateButton();
    });
    audio.addEventListener('loadedmetadata', function () {
      var time = Number(stored('time'));
      if (isFinite(time) && time > 0 && isFinite(audio.duration) &&
          time < audio.duration) {
        try { audio.currentTime = time; } catch (e) {}
      }
    }, {once: true});
    audio.addEventListener('timeupdate', function () {
      var second = Math.floor(audio.currentTime);
      if (second !== lastSavedSecond && second % 4 === 0) {
        lastSavedSecond = second;
        save('time', audio.currentTime);
      }
    });
    function startAtFirstGesture(event) {
      if (pausedByUser || !audio.paused) return;
      if (event.target && event.target.closest &&
          event.target.closest('#cassxp-mini-music')) return;
      playMusic();
    }
    document.addEventListener('pointerdown', startAtFirstGesture, true);
    document.addEventListener('touchstart', startAtFirstGesture,
      {capture: true, passive: true});
    document.addEventListener('keydown', function (event) {
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].indexOf(event.key) !== -1) return;
      startAtFirstGesture(event);
    }, true);
    updateButton();
    if (!pausedByUser) playMusic();
  }

  function updateMetadata(next) {
    document.title = next.title;
    document.documentElement.lang = next.documentElement.lang || 'pt-BR';
    var selectors = [
      'meta[name="description"]',
      'link[rel="canonical"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]'
    ];
    selectors.forEach(function (selector) {
      var incoming = next.head.querySelector(selector);
      var current = document.head.querySelector(selector);
      if (incoming && current) {
        if (incoming.hasAttribute('content')) {
          current.setAttribute('content', incoming.getAttribute('content'));
        } else if (incoming.hasAttribute('href')) {
          current.setAttribute('href', incoming.getAttribute('href'));
        }
      } else if (incoming) {
        document.head.appendChild(incoming.cloneNode(true));
      }
    });
  }

  function updateActiveNavigation(next) {
    var current = document.querySelectorAll('.dummy-nav .wsite-menu-default > li');
    var incoming = next.querySelectorAll('.dummy-nav .wsite-menu-default > li');
    if (current.length !== incoming.length) return;
    for (var i = 0; i < current.length; i++) {
      current[i].id = incoming[i].id;
      current[i].className = incoming[i].className;
    }
  }

  function displayPage(next, url) {
    var currentHero = document.querySelector('.wsite-header-elements');
    var incomingHero = next.querySelector('.wsite-header-elements');
    var currentMain = document.getElementById('main');
    var incomingMain = next.getElementById('main');
    if (!currentHero || !incomingHero || !currentMain || !incomingMain) return false;

    // Não substituímos o body nem o player: o mesmo áudio continua tocando.
    currentHero.replaceWith(incomingHero);
    currentMain.replaceWith(incomingMain);
    document.body.className = next.body.className;
    updateMetadata(next);
    updateActiveNavigation(next);
    // As animações originais do tema são inicializadas no carregamento completo;
    // ao mudar de página, não escondemos seções aguardando uma nova inicialização.
    document.querySelectorAll('#main .wsite-section-effect-reveal').forEach(function (element) {
      element.classList.remove('wsite-section-effect-reveal');
    });
    if (url.hash) {
      var anchor = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (anchor) { anchor.scrollIntoView(); return true; }
    }
    window.scrollTo(0, 0);
    return true;
  }

  function navigate(url, addHistory) {
    var requestId = ++navRequest;
    fetch(url.pathname + url.search, {credentials: 'same-origin'})
      .then(function (response) {
        if (!response.ok) throw new Error('Página indisponível');
        return response.text();
      })
      .then(function (html) {
        if (requestId !== navRequest) return;
        var next = new DOMParser().parseFromString(html, 'text/html');
        if (!displayPage(next, url)) throw new Error('Estrutura da página inesperada');
        if (addHistory) history.pushState({cassxp: true}, '', url.pathname + url.search + url.hash);
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'page_view', {
            page_location: window.location.origin + url.pathname + url.search,
            page_title: document.title
          });
        }
      })
      .catch(function () {
        if (requestId !== navRequest) return;
        // Em caso de falha de rede, mantém a navegação normal funcionando.
        if (addHistory) window.location.assign(url.href);
        else window.location.reload();
      });
  }

  function init() {
    createPlayer();
    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      var element = event.target;
      var link = element && element.closest ? element.closest('a[href]') : null;
      if (!link || link.hasAttribute('download') ||
          (link.target && link.target !== '_self')) return;
      var url;
      try { url = new URL(link.href, window.location.href); }
      catch (e) { return; }
      if (!isInternalPage(url)) return;
      if (url.pathname === window.location.pathname &&
          url.search === window.location.search && url.hash) return;
      if (pagePath(url.pathname) === pagePath(window.location.pathname) &&
          url.search === window.location.search && !url.hash) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      navigate(url, true);
    }, true);
    window.addEventListener('popstate', function () {
      var url = new URL(window.location.href);
      if (isInternalPage(url)) navigate(url, false);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once: true});
  } else {
    init();
  }
}());
