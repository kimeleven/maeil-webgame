// Share card renderer (REBOOT-SPEC §6). Canvas 1080×1350 (save) and 1200×630 (OG, used at build time).
import { COLORS } from './logic.js';

const FONT = '-apple-system,"SF Pro","Apple SD Gothic Neo","Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","PingFang SC","Noto Sans SC","Noto Sans KR",system-ui,sans-serif';
const imgCache = {};
export function loadImg(src) {
  if (!imgCache[src]) imgCache[src] = new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
  return imgCache[src];
}
const charSrc = (c) => `/img/chars/${c}.svg`;

function bg(ctx, W, H, glow) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0B0F1A'); g.addColorStop(1, '#151B2E');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.42, Math.max(W, H) * 0.6);
  r.addColorStop(0, glow + '66'); r.addColorStop(1, glow + '00');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W * 0.9, 0, 10, W * 0.9, 0, W * 0.7);
  v.addColorStop(0, 'rgba(79,70,229,.45)'); v.addColorStop(1, 'rgba(79,70,229,0)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function glass(ctx, x, y, w, h, r = 28) {
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke(); ctx.restore();
}
function text(ctx, s, x, y, size, { weight = 700, color = '#e8eaf0', align = 'center', max } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  let sz = size;
  while (max && ctx.measureText(s).width > max && sz > 18) { sz -= 2; ctx.font = `${weight} ${sz}px ${FONT}`; }
  ctx.fillText(s, x, y);
}
function wrap(ctx, s, x, y, size, maxW, lh, opts = {}) {
  ctx.font = `${opts.weight || 500} ${size}px ${FONT}`;
  const cjk = /[\u3040-\u30ff\u4e00-\u9fff]/.test(s);
  const tokens = cjk ? [...s] : s.split(/(\s+)/);
  let line = '', yy = y; const lines = [];
  for (const t of tokens) { const test = line + t; if (ctx.measureText(test).width > maxW && line.trim()) { lines.push(line); line = t.trimStart(); } else line = test; }
  if (line.trim()) lines.push(line);
  for (const l of lines.slice(0, opts.maxLines || 4)) { text(ctx, l.trim(), x, yy, size, { weight: opts.weight || 500, color: opts.color || '#e8eaf0', align: opts.align || 'center' }); yy += lh; }
  return yy;
}
function brand(ctx, W, D) {
  ctx.fillStyle = '#22d3ee'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(W / 2 - ctx.measureText(D.brand).width / 2 - 26, 112, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  text(ctx, D.brand, W / 2, 124, 40, { weight: 800 });
}
function footer(ctx, W, H, cta) {
  text(ctx, cta, W / 2, H - 150, 40, { weight: 700, max: W - 160 });
  text(ctx, 'playtoday.cloud', W / 2, H - 92, 32, { weight: 600, color: '#8b9cff' });
}
// Halloween frame on saved result cards (and build-time OG when hw=true)
export const hwOn = () => typeof document !== 'undefined' && document.documentElement.classList.contains('halloween');
export function hwFrame(ctx, W, H, label = 'HAPPY HALLOWEEN', corner = false) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#ea580c');
  ctx.strokeStyle = g; ctx.lineWidth = Math.round(W / 60); ctx.beginPath(); ctx.roundRect(ctx.lineWidth / 2 + 10, ctx.lineWidth / 2 + 10, W - ctx.lineWidth - 20, H - ctx.lineWidth - 20, 36); ctx.stroke();
  const r = ctx.createRadialGradient(0, H, 10, 0, H, W * 0.6); r.addColorStop(0, 'rgba(234,88,12,.35)'); r.addColorStop(1, 'rgba(234,88,12,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  const s = Math.round(W / 22);
  ctx.font = `${s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [x, y, e] of [[s * 1.3, s * 1.3, '🎃'], [W - s * 1.3, s * 1.3, '🦇'], [s * 1.3, H - s * 1.3, '🦇'], [W - s * 1.3, H - s * 1.3, '🎃']]) ctx.fillText(e, x, y);
  ctx.font = `800 ${Math.round(s * 0.62)}px ${FONT}`; const tw = ctx.measureText(label).width + s;
  const cx = corner ? W - s * 2.6 - tw / 2 : W / 2; // corner: next to the top-right bat (wide OG, keeps the title clear)
  ctx.fillStyle = 'rgba(234,88,12,.92)'; ctx.beginPath(); ctx.roundRect(cx - tw / 2, 18, tw, s * 1.1, s * 0.55); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(label, cx, 18 + s * 0.57);
  ctx.restore();
}
const hw = (ctx, W, H, D, force) => { if (force || hwOn()) hwFrame(ctx, W, H, (D && D.halloween && D.halloween.frame) || 'HAPPY HALLOWEEN'); };
function canvas(W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

// --- game card ---
export async function rushCard(D, rec) {
  const W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
  bg(ctx, W, H, '#22d3ee'); brand(ctx, W, D);
  glass(ctx, 80, 190, W - 160, 860);
  text(ctx, D.game.name.toUpperCase(), W / 2, 270, 44, { weight: 800, color: '#22d3ee' });
  text(ctx, `${D.game.sector} ${rec.stage}`, W / 2, 440, 150, { weight: 800 });
  text(ctx, `${Number(rec.score).toLocaleString()} ${D.game.score}`, W / 2, 520, 52, { weight: 700, color: '#e8eaf0' });
  if (rec.zone) text(ctx, rec.zone, W / 2, 580, 34, { weight: 600, color: 'rgba(232,234,240,.88)' });
  // mini graph: troops vs boss (max 8 sectors)
  const hist = (rec.history || []).slice(-8);
  const gx = 150, gy = 640, gw = W - 300, gh = 260;
  const max = Math.max(1, ...hist.flatMap((h) => [h.power, h.boss]));
  const bw = gw / Math.max(hist.length, 1);
  hist.forEach((h, i) => {
    const x = gx + i * bw + bw * 0.15, w2 = bw * 0.32;
    const ph = (h.power / max) * gh, bh = (h.boss / max) * gh;
    ctx.fillStyle = h.win ? '#22d3ee' : '#ff5a5f'; ctx.fillRect(x, gy + gh - ph, w2, ph);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + w2 + 6, gy + gh - bh, w2, bh);
    text(ctx, String(h.stage), x + w2, gy + gh + 40, 26, { weight: 600, color: 'rgba(232,234,240,.88)' });
  });
  ctx.fillStyle = '#22d3ee'; ctx.fillRect(gx, gy - 40, 24, 24); text(ctx, D.game.troops, gx + 36, gy - 20, 26, { align: 'left', weight: 600 });
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(gx + 260, gy - 40, 24, 24); text(ctx, D.game.bossLabel, gx + 296, gy - 20, 26, { align: 'left', weight: 600 });
  // upgrade icons (up to 3, most stacked)
  const ups = Object.entries(rec.mods || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  ups.forEach(([k, n], i) => {
    const x = W / 2 + (i - (ups.length - 1) / 2) * 280;
    glass(ctx, x - 125, 960, 250, 64, 32);
    text(ctx, `${D.game.upg[k].n} ×${n}`, x, 1003, 30, { weight: 700 });
  });
  if (rec.assist) { glass(ctx, W - 300, 200, 200, 56, 28); text(ctx, 'ASSIST', W - 200, 238, 28, { weight: 800, color: '#facc15' }); }
  footer(ctx, W, H, D.game.cardCta); hw(ctx, W, H, D);
  return c;
}

// --- quiz card ---
export async function quizCard(D, code, pct) {
  const W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d'), T = D.types[code], col = COLORS[code];
  bg(ctx, W, H, col); brand(ctx, W, D);
  glass(ctx, 80, 180, W - 160, 940);
  const img = await loadImg(charSrc(code)); ctx.drawImage(img, W / 2 - 230, 190, 460, 460);
  text(ctx, T.name, W / 2, 720, 70, { weight: 800, max: W - 220 });
  wrap(ctx, T.one, W / 2, 790, 36, W - 260, 48, { color: 'rgba(232,234,240,.88)', maxLines: 2 });
  const ax = D.quiz.axes;
  pct.forEach((p, i) => {
    const y = 880 + i * 62;
    text(ctx, ax[i][0], 220, y + 12, 28, { weight: 700, align: 'right' }); text(ctx, ax[i][1], 860, y + 12, 28, { weight: 700, align: 'left' });
    ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.beginPath(); ctx.roundRect(240, y - 10, 600, 24, 12); ctx.fill();
    const g = ctx.createLinearGradient(240, 0, 840, 0); g.addColorStop(0, '#6366f1'); g.addColorStop(1, '#22d3ee');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(240, y - 10, Math.max(24, 6 * p), 24, 12); ctx.fill();
  });
  const b = bestBuddyOf(code);
  const bi = await loadImg(charSrc(b)); ctx.drawImage(bi, 300, 1060, 90, 90);
  text(ctx, `${D.quiz.best}: ${D.types[b].name}`, 400, 1118, 30, { weight: 600, align: 'left', max: 560 });
  footer(ctx, W, H, D.quiz.cardCta); hw(ctx, W, H, D);
  return c;
}
function bestBuddyOf(code) { const L = [['S', 'C'], ['P', 'I'], ['H', 'T']]; return code.split('').map((ch, i) => (L[i][0] === ch ? L[i][1] : L[i][0])).join(''); }

// --- chemistry card (nicknames only on this saved image, never in OG) ---
export async function chemCard(D, chem, nickA, nickB, roleLines) {
  const W = 1080, H = 1350, c = canvas(W, H), ctx = c.getContext('2d');
  bg(ctx, W, H, COLORS[chem.a]); brand(ctx, W, D);
  glass(ctx, 80, 180, W - 160, 960);
  const [ia, ib] = await Promise.all([loadImg(charSrc(chem.a)), loadImg(charSrc(chem.b))]);
  ctx.drawImage(ia, 130, 210, 380, 380);
  ctx.save(); ctx.translate(950, 210); ctx.scale(-1, 1); ctx.drawImage(ib, 0, 0, 380, 380); ctx.restore();
  text(ctx, nickA, 320, 630, 34, { weight: 700, max: 360 }); text(ctx, nickB, 760, 630, 34, { weight: 700, max: 360 });
  text(ctx, D.chem.combos[chem.pattern], W / 2, 740, 74, { weight: 800, max: W - 220 });
  let y = 820;
  for (const l of roleLines) y = wrap(ctx, l, W / 2, y, 32, W - 260, 44, { color: 'rgba(232,234,240,.88)', maxLines: 2 }) + 6;
  text(ctx, `${D.chem.playTitle}: ${D.chem.plays[chem.play]}`, W / 2, Math.max(y + 30, 1060), 34, { weight: 700, color: '#22d3ee', max: W - 220 });
  footer(ctx, W, H, D.chem.cardCta); hw(ctx, W, H, D);
  return c;
}

// --- OG 1200×630 (build-time) ---
export async function ogType(D, code, hwForce = false) {
  const W = 1200, H = 630, c = canvas(W, H), ctx = c.getContext('2d'), T = D.types[code];
  bg(ctx, W, H, COLORS[code]);
  const img = await loadImg(charSrc(code)); ctx.drawImage(img, 80, 75, 480, 480);
  text(ctx, D.brand, 620, 150, 36, { weight: 800, align: 'left', color: '#22d3ee' });
  text(ctx, D.quiz.title, 620, 210, 34, { weight: 600, align: 'left', color: 'rgba(232,234,240,.88)', max: 520 });
  text(ctx, T.name, 620, 320, 60, { weight: 800, align: 'left', max: 520 });
  wrap(ctx, T.one, 620, 390, 32, 520, 44, { align: 'left', color: 'rgba(232,234,240,.88)', maxLines: 3 });
  text(ctx, 'playtoday.cloud', 620, 560, 28, { weight: 600, align: 'left', color: '#8b9cff' });
  if (hwForce) hwFrame(ctx, W, H, 'HAPPY HALLOWEEN', true);
  return c;
}
export async function ogSite(D, hwForce = false) {
  const W = 1200, H = 630, c = canvas(W, H), ctx = c.getContext('2d');
  bg(ctx, W, H, '#6366f1');
  const codes = ['SPH', 'SIT', 'CPT'];
  for (let i = 0; i < 3; i++) { const im = await loadImg(charSrc(codes[i])); ctx.drawImage(im, 120 + i * 330, 210, 300, 300); }
  text(ctx, D.brand, W / 2, 120, 72, { weight: 800 });
  text(ctx, `${D.game.name} · ${D.quiz.title} · ${D.chem.title}`, W / 2, 185, 34, { weight: 600, color: 'rgba(232,234,240,.88)', max: W - 120 });
  text(ctx, 'playtoday.cloud', W / 2, 585, 30, { weight: 600, color: '#8b9cff' });
  if (hwForce) hwFrame(ctx, W, H, 'HAPPY HALLOWEEN', true);
  return c;
}
// challenge-link OG (no score/seed in the image)
export async function ogChallenge(D, hwForce = false) {
  const W = 1200, H = 630, c = canvas(W, H), ctx = c.getContext('2d');
  bg(ctx, W, H, '#22d3ee');
  const im = await loadImg('/img/gate-rush.svg'); ctx.drawImage(im, 70, 150, 330, 330);
  text(ctx, D.game.name.toUpperCase(), 800, 190, 44, { weight: 800, color: '#22d3ee', max: 640 });
  wrap(ctx, D.game.challengeTitle, 800, 330, 76, 620, 90, { weight: 900, maxLines: 2 });
  text(ctx, 'playtoday.cloud', 800, 560, 32, { weight: 600, color: '#8b9cff' });
  if (hwForce) hwFrame(ctx, W, H, 'HAPPY HALLOWEEN', true);
  return c;
}
// language-free game OG / endcard drawn by the game renderer snapshot (passed in as image)
export function ogGame(shot, hwForce = false) {
  const W = 1200, H = 630, c = canvas(W, H), ctx = c.getContext('2d');
  bg(ctx, W, H, '#22d3ee');
  const sw = shot.width * (H / shot.height); ctx.drawImage(shot, 0, 0, shot.width, shot.height, W - sw - 120, 0, sw, H);
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.strokeRect(W - sw - 120, 0, sw, H);
  text(ctx, 'GATE RUSH', 320, 260, 84, { weight: 900 });
  text(ctx, '+  ×  ⚡', 320, 360, 64, { weight: 800, color: '#22d3ee' });
  text(ctx, 'playtoday.cloud', 320, 520, 34, { weight: 600, color: '#8b9cff' });
  if (hwForce) hwFrame(ctx, W, H, 'HAPPY HALLOWEEN', true);
  return c;
}
export async function endcard(D) {
  const W = 1080, H = 1920, c = canvas(W, H), ctx = c.getContext('2d');
  bg(ctx, W, H, '#6366f1');
  const im = await loadImg('/img/gate-rush.svg'); ctx.drawImage(im, W / 2 - 260, 420, 520, 520);
  text(ctx, D.brand, W / 2, 1100, 96, { weight: 800 });
  text(ctx, D.game.name, W / 2, 1220, 72, { weight: 800, color: '#22d3ee' });
  text(ctx, 'playtoday.cloud', W / 2, 1400, 60, { weight: 700, color: '#8b9cff' });
  return c;
}

// --- share helpers ---
export const toBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));
export async function saveCanvas(c, name) {
  const blob = await toBlob(c);
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch {
    const t = document.createElement('textarea'); t.value = s; document.body.append(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok;
  }
}
// navigator.share with PNG when supported → else copy text (§6.5)
export async function shareOrCopy({ title, text: body, url, canvas: cv, name }) {
  try {
    if (navigator.share) {
      const data = { title, text: body };
      if (cv && navigator.canShare) {
        const f = new File([await toBlob(cv)], name || 'card.png', { type: 'image/png' });
        if (navigator.canShare({ files: [f] })) data.files = [f];
      }
      await navigator.share(data); return 'shared';
    }
  } catch (e) { if (e.name === 'AbortError') return 'aborted'; }
  return (await copyText(body)) ? 'copied' : 'failed';
}
