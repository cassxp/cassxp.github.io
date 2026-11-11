(() => {
  'use strict';
  const form = document.getElementById('vod-url-form');
  const input = document.getElementById('vod-url');
  const message = document.getElementById('vod-form-message');
  const frame = document.getElementById('vod-player');
  const openLink = document.getElementById('vod-open-twitch');
  const heading = document.getElementById('vod-selected-title');
  const section = document.getElementById('assistir');
  if (!form || !input || !frame || !openLink || !heading) return;

  function playVod(id, scroll) {
    if (!/^\d{7,15}$/.test(id)) return false;
    const parent = location.hostname || 'cassxp.github.io';
    const url = new URL('https://player.twitch.tv/');
    url.searchParams.set('video', 'v' + id);
    url.searchParams.set('parent', parent);
    url.searchParams.set('autoplay', 'false');
    frame.src = url.toString();
    frame.title = 'VOD ' + id + ' do canal CassXP na Twitch';
    openLink.href = 'https://www.twitch.tv/videos/' + id;
    heading.textContent = id === '2920104874' ? 'Transmissão CassXP — replay' : 'Transmissão CassXP — VOD ' + id;
    if (scroll) section.scrollIntoView({behavior: 'smooth', block: 'start'});
    return true;
  }

  function getVodId(value) {
    let parsed;
    try { parsed = new URL(value.trim()); } catch (_) { return null; }
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    if (!['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'].includes(parsed.hostname.toLowerCase())) return null;
    const match = parsed.pathname.match(/^\/(?:videos\/|cassxp\/v\/)(\d{7,15})\/?$/i);
    return match ? match[1] : null;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = getVodId(input.value);
    if (!id) {
      input.setAttribute('aria-invalid', 'true');
      message.textContent = 'Cole um link válido no formato https://www.twitch.tv/videos/123456789.';
      return;
    }
    input.removeAttribute('aria-invalid');
    playVod(id, true);
    message.textContent = 'VOD ' + id + ' carregado. Aperte play no player acima.';
  });

  document.querySelectorAll('[data-vod-id]').forEach(button => {
    button.addEventListener('click', () => {
      if (playVod(button.dataset.vodId, true)) {
        input.value = '';
        input.removeAttribute('aria-invalid');
        message.textContent = '';
      }
    });
  });

  const queryId = new URLSearchParams(location.search).get('vod');
  if (queryId && /^\d{7,15}$/.test(queryId)) playVod(queryId, false);
})();