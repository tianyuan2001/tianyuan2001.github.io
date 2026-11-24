// Network/error regression checks without a browser dependency.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('assets/js/site.js', 'utf8');

async function scenario(responses, expected, expectedCalls) {
  const total = { textContent: 'Citations unavailable' };
  const updated = { textContent: '' };
  const paper = { getAttribute: () => null, dataset: { scholarPaper: 'missing:paper' }, textContent: '' };
  const stats = {
    dataset: { repository: 'owner/repo', useCdn: 'false' },
    querySelector: selector => selector === '[data-scholar-total]' ? total : updated
  };
  const calls = [];
  vm.runInNewContext(source, {
    document: {
      querySelector: selector => selector === '[data-scholar-stats]' ? stats : null,
      querySelectorAll: () => [paper]
    },
    fetch: async url => {
      calls.push(url);
      const result = responses.shift();
      if (result instanceof Error) throw result;
      return { ok: true, json: async () => result };
    },
    AbortController: class { abort() {} }, setTimeout, clearTimeout
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(total.textContent, expected);
  assert.strictEqual(calls.length, expectedCalls);
  assert.strictEqual(paper.textContent, '· Citations: —');
}

(async () => {
  await scenario([{ citedby: 0, publications: {} }], '0', 1);
  await scenario([new Error('network'), { citedby: 42 }], '42', 2);
  await scenario([{ citedby: 'invalid' }, { citedby: -1 }], '—', 2);
  await scenario([new Error('network'), new Error('network')], '—', 2);
  // Pages without a statistics or News component must do nothing.
  vm.runInNewContext(source, { document: { querySelector: () => null } });
  console.log('PASS: zero counts, fallback, invalid data, outages, missing paper, absent components');
})().catch(error => { console.error(error); process.exitCode = 1; });

// Check scrolling controls with a deterministic animation clock.
function newsScenario(reduce) {
  const events = {};
  const frames = new Map();
  let id = 0;
  const feed = {
    scrollTop: 0, scrollHeight: 900, clientHeight: 300,
    addEventListener: (name, fn) => { events[`feed:${name}`] = fn; }
  };
  const button = {
    hidden: true,
    addEventListener: (name, fn) => { events[`button:${name}`] = fn; }
  };
  const panel = {
    querySelector: name => name === '.news-feed' ? feed : button,
    contains: () => false,
    addEventListener: (name, fn) => { events[`panel:${name}`] = fn; }
  };
  const doc = {
    hidden: false,
    querySelector: name => name === '[data-news]' ? panel : null,
    addEventListener: (name, fn) => { events[`doc:${name}`] = fn; }
  };
  vm.runInNewContext(source, {
    document: doc,
    window: { matchMedia: () => ({ matches: reduce, addEventListener: () => {} }) },
    performance: { now: () => 0 },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key)
  });
  const tick = now => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
  };
  assert.strictEqual(button.hidden, false);
  assert.strictEqual(frames.size, reduce ? 0 : 1);
  if (reduce) {
    assert.strictEqual(button.textContent, 'Resume scrolling');
    events['button:click']();
  }
  tick(5000); tick(5100);
  assert(feed.scrollTop > 0, 'News should advance');
  events['panel:mouseenter']();
  assert.strictEqual(frames.size, 0);
  events['panel:mouseleave']();
  assert.strictEqual(frames.size, 1);
  events['feed:wheel']();
  events['panel:mouseleave']();
  assert.strictEqual(frames.size, 0, 'Manual reading stays paused');
  events['button:click']();
  assert.strictEqual(frames.size, 1);
  doc.hidden = true; events['doc:visibilitychange']();
  assert.strictEqual(frames.size, 0);
}
newsScenario(false);
newsScenario(true);
console.log('PASS: auto-scroll, hover pause, manual pause, resume, hidden tab, reduced motion');

async function titleMatching() {
  const papers = [
    { dataset: { scholarPaper: '', scholarTitle: 'Black-Box Attack: A Study' }, textContent: '· Citations: —' },
    { dataset: { scholarPaper: 'user:exact', scholarTitle: 'Different title' }, textContent: '· Citations: —' },
    { dataset: { scholarPaper: '', scholarTitle: 'Duplicate Title' }, textContent: '· Citations: —' },
    { dataset: { scholarPaper: '', scholarTitle: 'Unknown paper' }, textContent: '· Citations: —' }
  ];
  papers.forEach(paper => { paper.getAttribute = () => null; });
  const stats = { dataset: { repository: 'owner/repo' }, querySelector: () => ({ textContent: '' }) };
  vm.runInNewContext(source, {
    document: { querySelector: s => s === '[data-scholar-stats]' ? stats : null, querySelectorAll: () => papers },
    fetch: async () => ({ ok: true, json: async () => ({ citedby: 50, publications: {
      'user:one': { title: 'black box attack—a study', num_citations: 8 },
      'user:exact': { bib: { title: 'Old title' }, num_citations: 0 },
      'user:dup1': { title: 'Duplicate Title', num_citations: 3 },
      'user:dup2': { title: 'Duplicate Title', num_citations: 4 }
    } }) }),
    AbortController: class { abort() {} }, setTimeout, clearTimeout
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepStrictEqual(papers.map(p => p.textContent), ['· Citations: 8', '· Citations: 0', '· Citations: —', '· Citations: —']);
  console.log('PASS: title normalization, explicit IDs, zero citations, ambiguous and unmatched titles');
}
titleMatching().catch(error => { console.error(error); process.exitCode = 1; });

async function legacyMarkup() {
  for (const withTotal of [true, false]) {
    const total = { textContent: '—' };
    const papers = ['user:exact', 'user:missing'].map(id => ({
      dataset: {}, textContent: '', getAttribute: name => name === 'data' ? id : null
    }));
    const selectors = [];
    vm.runInNewContext(source, {
      document: {
        querySelector: selector => selector === '[data-scholar-config]' ? { dataset: { repository: 'owner/repo' } } : selector === '#total_cit' && withTotal ? total : null,
        querySelectorAll: selector => { selectors.push(selector); return papers; }
      },
      fetch: async () => ({ ok: true, json: async () => ({ citedby: 1250, publications: {
        'user:exact': { num_citations: 12 }
      } }) }),
      AbortController: class { abort() {} }, setTimeout, clearTimeout
    });
    await new Promise(resolve => setImmediate(resolve));
    assert(selectors[0].includes('.show_paper_citations'));
    assert.strictEqual(papers[0].textContent, '· Citations: 12');
    assert.strictEqual(papers[1].textContent, '· Citations: —');
    if (withTotal) assert.strictEqual(total.textContent, '1,250');
  }
  console.log('PASS: original class/data markup, total_cit, missing ID, papers without total component');
}
legacyMarkup().catch(error => { console.error(error); process.exitCode = 1; });
