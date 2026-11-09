(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false');
    }));
  }
  const dialog = document.getElementById('media-modal');
  const stage = document.getElementById('media-stage');
  const title = document.getElementById('media-title');
  const external = document.getElementById('media-external');
  const validId = /^[a-zA-Z0-9_-]+$/;
  function clearModal() { if (stage) stage.innerHTML=''; document.body.classList.remove('no-scroll'); }
  if (dialog) {
    dialog.addEventListener('close', clearModal);
    dialog.addEventListener('click', ev => { if (ev.target === dialog) dialog.close(); });
    dialog.querySelector('.modal-close').addEventListener('click', () => dialog.close());
  }
  function openMedia(kind, id, display) {
    if (!dialog || !stage || !validId.test(id)) return;
    const isChannel = kind === 'channel';
    const url = isChannel ? 'https://www.twitch.tv/cassxp' : 'https://www.twitch.tv/cassxp/clip/' + encodeURIComponent(id);
    title.textContent = display || (isChannel ? 'CassXP na Twitch' : 'Clipe CassXP');
    external.href = url;
    stage.innerHTML = '';
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      const host = location.hostname || 'cassxp.github.io';
      const src = isChannel
       ? 'https://player.twitch.tv/?channel=cassxp&parent=' + encodeURIComponent(host) + '&autoplay=false&muted=true'
       : 'https://clips.twitch.tv/embed?clip=' + encodeURIComponent(id) + '&parent=' + encodeURIComponent(host) + '&autoplay=false';
      const iframe = document.createElement('iframe');
      iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      iframe.setAttribute('allowfullscreen', ''); iframe.setAttribute('title', title.textContent);
      iframe.setAttribute('referrerpolicy', 'origin'); iframe.src = src;
      stage.appendChild(iframe);
    } else {
      const fallback = document.createElement('div'); fallback.className='preview-fallback';
      fallback.innerHTML = '<h3>O player abre quando o site estiver hospedado</h3><p>Em arquivos locais, a Twitch não permite incorporar vídeos. Você pode testar no endereço do site quando esta prévia for publicada ou abrir o conteúdo diretamente na Twitch.</p>';
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.className='btn btn-primary';link.textContent='Abrir na Twitch ↗';fallback.appendChild(link);stage.appendChild(fallback);
    }
    dialog.showModal(); document.body.classList.add('no-scroll');
  }
  // Delegação permite que clipes, player e filtros continuem ativos após navegação SPA.
  document.addEventListener('click', ev => {
    const media = ev.target.closest && ev.target.closest('[data-media]');
    if (media) openMedia(media.dataset.media, media.dataset.id || 'cassxp', media.dataset.title || 'CassXP na Twitch');
    const filter = ev.target.closest && ev.target.closest('.filter[data-filter]');
    if (filter) {
      const value = filter.dataset.filter;
      document.querySelectorAll('.filter').forEach(f => f.setAttribute('aria-pressed', String(f === filter)));
      document.querySelectorAll('.clip-card[data-game]').forEach(card => { card.hidden = value !== 'all' && card.dataset.game !== value; });
    }
  });
  function applyQueryFilter() {
    const game = new URLSearchParams(location.search).get('jogo');
    if (game && ['gta','dbd'].includes(game)) {
      document.querySelector('.filter[data-filter="' + game + '"]')?.click();
    }
  }
  document.addEventListener('cassxp:pagechange', applyQueryFilter);
  applyQueryFilter();
  // Só carregar medição no domínio publicado. A prévia local não gera visitas artificiais.
  if (location.hostname === 'cassxp.github.io') {
    const ga=document.createElement('script');ga.async=true;ga.src='https://www.googletagmanager.com/gtag/js?id=G-8L57GGN7L4';document.head.appendChild(ga);
    window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config','G-8L57GGN7L4');
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-P6KR7N38');
  }
})();
