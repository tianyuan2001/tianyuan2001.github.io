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
    const config = stats || document.querySelector('[data-scholar-config]');
    if (!config) return;
    const total = document.querySelector('#total_cit') || (stats && stats.querySelector('[data-scholar-total]'));
    const updated = stats && stats.querySelector('[data-scholar-updated]');
    const citationElements = document.querySelectorAll('.show_paper_citations, [data-scholar-paper]');
    if (!total && !citationElements.length) return;
    citationElements.forEach(element => {
      if (!element.textContent.trim()) element.textContent = '· Citations: —';
    });
    const repository = config.dataset.repository;
    const path = 'google-scholar-stats/gs_data.json';
    const raw = `https://raw.githubusercontent.com/${repository}/${path}`;
    const cdn = `https://cdn.jsdelivr.net/gh/${repository}@${path}`;
    const urls = config.dataset.useCdn === 'true' ? [cdn, raw] : [raw, cdn];
    for (const url of urls) {
      try {
        const data = await readJSON(url);
        if (!Number.isInteger(data.citedby) || data.citedby < 0) throw new Error('Invalid citation count');
        if (total) total.textContent = data.citedby.toLocaleString('en-US');
        const date = new Date(data.updated);
        if (updated && !Number.isNaN(date.getTime())) {
          updated.textContent = ` (updated ${date.toLocaleDateString('en-CA', { timeZone: 'UTC' })})`;
        }
        const publications = data.publications || {};
        const byTitle = new Map();
        Object.values(publications).forEach(paper => {
          const title = normalizeTitle(paper.title || (paper.bib || {}).title);
          if (!title) return;
          // Duplicate titles require an explicit ID; don't guess which record to use.
          byTitle.set(title, byTitle.has(title) ? null : paper);
        });
        citationElements.forEach(element => {
          const id = (element.getAttribute('data') || element.dataset.scholarPaper || '').trim();
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
    if (total) total.textContent = '—';
    if (updated) updated.textContent = ' (citation data temporarily unavailable)';
  }

  function initVisitorMap() {
    const map = document.querySelector('[data-visitor-map]');
    if (!map) return;
    const image = map.querySelector('[data-visitor-map-image]');
    if (!image) return;
    const error = map.querySelector('[data-visitor-map-error]');
    function update(failed) {
      image.hidden = failed;
      error.hidden = !failed;
    }
    image.addEventListener('load', () => update(false));
    image.addEventListener('error', () => update(true));
    if (image.complete) update(image.naturalWidth === 0);
  }

  function initPublicationTabs() {
    const browser = document.querySelector('[data-publication-tabs]');
    if (!browser) return;
    const tablist = browser.querySelector('[role="tablist"]');
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = Array.from(browser.querySelectorAll('[role="tabpanel"]'));
    function activate(tab, focus = false) {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
      if (focus) tab.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(tabs[next], true);
      });
    });
    activate(tabs[0]);
    tablist.hidden = false;
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

  initVisitorMap();
  initPublicationTabs();
  initNews();
  initScholar();
})();
