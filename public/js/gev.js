// Anonymous game-event transport → POST /api/events on our own (free OCI) DB. (t_287677ef)
// Classic script, loaded before the inline game script. window.gev(name, data) never throws and never
// blocks the game: bounded in-memory queue, batched flush (20 events / 3 s / pagehide), at most 2 tries.
// Sends only the allowlisted contract fields; no ids that outlive the event, no seed/score/name/URL/referrer.
(function () {
  if (window.gev) return;
  // share_fail is diagnostic only (not in the v1 allowlist): ignored here, never sent.
  var NAMES = ['play_start', 'play_again', 'play_end', 'share_click', 'share_done', 'challenge_land', 'share_result', 'share_cta_click'];
  var KEYS = ['g', 'from', 'end', 'via', 'k'];
  var MAX_Q = 60, BATCH = 20, WAIT = 3000;
  var q = [], timer = 0, sent = (window.__gevSent = window.__gevSent || []);
  var bot = /bot|crawl|spider|slurp|headless|lighthouse|puppeteer|playwright|phantom|selenium|python|curl|wget/i;
  function off() {
    try { if (navigator.webdriver || bot.test(navigator.userAgent || '')) return 'bot'; } catch (e) {}
    try { if (localStorage.getItem('pt-qa') === '1') return 'qa'; } catch (e) {}
    return '';
  }
  function rid() {
    var b = new Uint8Array(16), s = '', a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.random() * 256; }
    for (var j = 0; j < 16; j++) s += a[b[j] & 63];
    return s + Date.now().toString(36).slice(-6); // 22 chars, per event only (retry de-dup), not a user id
  }
  function lang() {
    var l = (document.body && document.body.dataset.lang) || document.documentElement.lang || '';
    return String(l).toLowerCase();
  }
  function post(batch, beacon) {
    var body = JSON.stringify({ v: 1, events: batch });
    if (beacon && navigator.sendBeacon) {
      try { if (navigator.sendBeacon('/api/events', new Blob([body], { type: 'text/plain' }))) return Promise.resolve(true); } catch (e) {}
    }
    try {
      return fetch('/api/events', { method: 'POST', body: body, keepalive: true, credentials: 'omit', headers: { 'content-type': 'text/plain' } })
        .then(function (r) { return r.status < 500 && r.status !== 429; }, function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }
  function flush(beacon) {
    clearTimeout(timer); timer = 0;
    while (q.length) {
      var batch = q.splice(0, BATCH);
      (function (b) {
        var payload = b.map(function (x) { return x.e; });
        post(payload, beacon).then(function (ok) {
          if (ok) { sent.push.apply(sent, payload); return; }
          var again = b.filter(function (x) { return ++x.t < 2; }); // one retry with the same event ids
          if (again.length) { q = again.concat(q).slice(-MAX_Q); schedule(); }
        });
      })(batch);
    }
  }
  function schedule() { if (!timer) timer = setTimeout(function () { flush(false); }, WAIT); }
  window.gev = function (name, data) {
    try {
      if (NAMES.indexOf(name) < 0 || off()) return;
      var e = { id: rid(), name: name, lang: lang() };
      for (var i = 0; i < KEYS.length; i++) { var k = KEYS[i], v = data && data[k]; if (typeof v === 'string' && v.length <= 12) e[k] = v; }
      q.push({ e: e, t: 0 });
      if (q.length > MAX_Q) q.splice(0, q.length - MAX_Q); // drop oldest, never grow unbounded
      if (q.length >= BATCH) flush(false); else schedule();
    } catch (err) {}
  };
  window.gev.flush = function () { flush(false); };
  addEventListener('pagehide', function () { flush(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
})();
