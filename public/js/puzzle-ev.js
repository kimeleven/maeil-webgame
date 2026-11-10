// 오늘의 퍼즐 익명 이벤트 (t_9242a69d). gev.js(자체 수집 → /api/events) 뒤에 로드하는 클래식 스크립트.
// 이전에는 퍼즐 페이지가 gev를 아예 부르지 않아 전송이 0건이었다. play_start = 첫 조작 1회, share_click = 공유 복사 버튼.
(function () {
  var page = (document.body && document.body.dataset.page) || '';
  if (!/^(sd-play|ms-play|wg-play|g2048|sol|nono)$/.test(page)) return;
  if (/[?&]date=/.test(location.search)) return; // 시험용 날짜 덮어쓰기는 집계 제외
  var started = false;
  function gv(n) { try { if (window.gev) window.gev(n, { g: 'puzzle', from: 'direct' }); } catch (e) {} }
  function start() { if (!started) { started = true; gv('play_start'); } }
  document.addEventListener('pointerdown', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('button,[id$="-copy"]') : null;
    if (t && /-copy$/.test(t.id || '')) { gv('share_click'); return; }
    if (e.target && e.target.closest && e.target.closest('main')) start();
  }, true);
  document.addEventListener('keydown', function () { if (page === 'g2048') start(); }, true);
})();
