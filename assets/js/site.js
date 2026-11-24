(() => {
  'use strict';

  async function readJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeTitle(title) {
    return String(title || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }

  async function initScholar() {
    const stats = document.querySelector('[data-scholar-stats]');
    if (!stats) return;
    const repository = stats.dataset.repository;
    const path = 'google-scholar-stats/gs_data.json';
    const raw = `https://raw.githubusercontent.com/${repository}/${path}`;
    const cdn = `https://cdn.jsdelivr.net/gh/${repository}@${path}`;
    const urls = stats.dataset.useCdn === 'true' ? [cdn, raw] : [raw, cdn];
    for (const url of urls) {
      try {
        const data = await readJSON(url);
        if (!Number.isInteger(data.citedby) || data.citedby < 0) throw new Error('Invalid citation count');
        stats.querySelector('[data-scholar-total]').textContent = data.citedby.toLocaleString('en-US');
        const updated = stats.querySelector('[data-scholar-updated]');
        const date = new Date(data.updated);
        if (updated && !Number.isNaN(date.getTime())) {
          updated.textContent = `Updated ${date.toLocaleDateString('en-CA', { timeZone: 'UTC' })}`;
        }
        const publications = data.publications || {};
        const byTitle = new Map();
        Object.values(publications).forEach(paper => {
          const title = normalizeTitle(paper.title || (paper.bib || {}).title);
          if (!title) return;
          // Duplicate titles require an explicit ID; don't guess which record to use.
          byTitle.set(title, byTitle.has(title) ? null : paper);
        });
        document.querySelectorAll('[data-scholar-paper]').forEach(element => {
          const id = element.dataset.scholarPaper;
          const paper = id ? publications[id] : byTitle.get(normalizeTitle(element.dataset.scholarTitle));
          if (paper && Number.isInteger(paper.num_citations) && paper.num_citations >= 0) {
            element.textContent = `· Citations: ${paper.num_citations.toLocaleString('en-US')}`;
            element.title = 'Google Scholar citations';
          }
        });
        return;
      } catch (error) {
        // Try the other host; never replace unavailable data with a false zero.
      }
    }
    stats.querySelector('[data-scholar-total]').textContent = '—';
    stats.querySelector('[data-scholar-updated]').textContent = 'Temporarily unavailable';
  }

  function initNews() {
    const panel = document.querySelector('[data-news]');
    if (!panel) return;
    const feed = panel.querySelector('.news-feed');
    const button = panel.querySelector('[data-news-toggle]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reducedMotion.matches;
    let hovered = false;
    let focused = false;
    let position = feed.scrollTop;
    let previous = 0;
    let holdUntil = performance.now() + 4000;
    let frame = null;

    function updateButton() {
      button.textContent = paused ? 'Resume scrolling' : 'Pause scrolling';
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = null;
      previous = 0;
    }
    function start() {
      if (frame === null && !paused && !hovered && !focused && !document.hidden) {
        position = feed.scrollTop;
        frame = requestAnimationFrame(tick);
      }
    }
    function tick(now) {
      frame = null;
      const delta = previous ? Math.min(now - previous, 100) : 0;
      previous = now;
      const max = feed.scrollHeight - feed.clientHeight;
      if (now >= holdUntil && max > 1) {
        position += delta * 0.018;
        feed.scrollTop = Math.min(position, max);
        if (position >= max) {
          // Keep the last item readable before returning to the beginning.
          if (position >= max + 72) {
            feed.scrollTop = position = 0;
            holdUntil = now + 4000;
          }
        }
      }
      startFrame();
    }
    function startFrame() {
      if (!paused && !hovered && !focused && !document.hidden) frame = requestAnimationFrame(tick);
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      paused = !paused;
      updateButton();
      if (paused) stop(); else start();
    });
    panel.addEventListener('mouseenter', () => { hovered = true; stop(); });
    panel.addEventListener('mouseleave', () => { hovered = false; start(); });
    panel.addEventListener('focusin', () => { focused = true; stop(); });
    panel.addEventListener('focusout', event => {
      if (!panel.contains(event.relatedTarget)) { focused = false; start(); }
    });
    // Manual scrolling stays manual until the reader explicitly resumes.
    ['wheel', 'touchstart', 'keydown'].forEach(type => feed.addEventListener(type, () => {
      paused = true;
      updateButton();
      stop();
    }, { passive: true }));
    reducedMotion.addEventListener('change', event => {
      if (event.matches) { paused = true; updateButton(); stop(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    updateButton();
    start();
  }

  initNews();
  initScholar();
})();
