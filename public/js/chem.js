// Friend chemistry (REBOOT-SPEC §5). /{lang}/friends/chemistry/ (owner) and /{lang}/i/{token} (invitee).
import { chemistry, roleLines } from './logic.js';
import { runQuiz, showResult } from './quiz.js';
import { chemCard, saveCanvas, shareOrCopy, copyText } from './card.js';
import { api } from './net.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in v ? v[k] : ''));
const mine = () => { try { return JSON.parse(localStorage.getItem('play-character')); } catch { return null; } };
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };
const cleanNick = (s, d) => (String(s || '').trim().slice(0, 12) || d);

function chemHtml(D, ch, nickA, nickB) {
  const C = D.chem, lines = roleLines(ch, C.roles, nickA, nickB);
  return `<div class="pair"><img src="/img/chars/${ch.a}.svg" width="160" height="160" alt="${esc(D.types[ch.a].name)}"><img src="/img/chars/${ch.b}.svg" width="160" height="160" alt="${esc(D.types[ch.b].name)}" style="transform:scaleX(-1)"></div>
  <p class="row" style="justify-content:space-around;margin:4px 0"><b>${esc(nickA)} · ${esc(D.types[ch.a].name)}</b><b>${esc(nickB)} · ${esc(D.types[ch.b].name)}</b></p>
  <h2 style="text-align:center;font-size:30px">${esc(C.combos[ch.pattern])}</h2>
  <h3>${esc(C.rolesTitle)}</h3><ul class="prose">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  <h3>${esc(C.playTitle)}</h3><p>${esc(C.plays[ch.play])}${ch.pattern === 7 ? ` <a class="btn ghost" href="/${D.lang}/play/gate-rush/">${esc(C.playGame)}</a>` : ''}</p>
  <h3>${esc(C.careTitle)}</h3><p>${esc(C.care[ch.care])}</p>`;
}
function chemActions(el, D, ch, nickA, nickB) {
  const wrap = document.createElement('div'); wrap.className = 'row'; wrap.style.marginTop = '12px';
  wrap.innerHTML = `<button class="btn" data-save>${esc(D.cta.save)}</button>`;
  wrap.querySelector('[data-save]').onclick = async () => saveCanvas(await chemCard(D, ch, nickA, nickB, roleLines(ch, D.chem.roles, nickA, nickB)), `chemistry-${ch.a}-${ch.b}.png`);
  el.append(wrap);
}

// ---------- owner page ----------
export async function mountChem(el, D) {
  const C = D.chem, me = mine();
  if (!me) {
    el.innerHTML = `<p>${esc(C.needQuiz)}</p><button class="btn" data-q>${esc(D.quiz.start)}</button>`;
    el.querySelector('[data-q]').onclick = () => runQuiz(el, D).then(({ code, pct }) => { try { localStorage.setItem('play-character', JSON.stringify({ code, pct, at: Date.now() })); } catch {} mountChem(el, D); });
    return;
  }
  // list my existing invites (owner keys in localStorage)
  const tokens = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('chem-owner-')) tokens.push(k.slice(11)); } } catch {}
  el.innerHTML = `<div class="row"><img src="/img/chars/${me.code}.svg" width="72" height="72" alt=""><div><span class="muted">${esc(C.mine)}</span><h3 style="margin:0">${esc(D.types[me.code].name)}</h3></div></div>
  <label class="stack" style="margin-top:14px"><span class="muted">${esc(C.nickLabel)}</span><input class="txt" maxlength="12" data-nick placeholder="${esc(C.nickDefault)}"></label>
  <div class="row" style="margin-top:12px"><button class="btn" data-create>${esc(C.create)}</button></div><div data-out></div><p class="status" role="status"></p>
  ${tokens.length ? `<div data-mine style="margin-top:18px"></div>` : ''}<p class="muted">${esc(C.expires)}</p>`;
  const st = el.querySelector('.status'), out = el.querySelector('[data-out]');
  el.querySelector('[data-create]').onclick = async (e) => {
    e.target.disabled = true; st.textContent = D.common.loading;
    try {
      const nick = cleanNick(el.querySelector('[data-nick]').value, C.nickDefault);
      const r = await api('/api/invite', { method: 'POST', body: { lang: D.lang, nick, code: me.code } });
      ls.set(`chem-owner-${r.token}`, r.ownerKey);
      const url = `${location.origin}/${D.lang}/i/${r.token}`;
      st.textContent = '';
      out.innerHTML = `<h3 style="margin-top:16px">${esc(C.linkReady)}</h3><code class="sel">${esc(url)}</code><div class="row" style="margin-top:10px"><button class="btn" data-copy>${esc(D.common.copyLink)}</button><button class="btn ghost" data-share>${esc(D.cta.share)}</button><a class="btn ghost" href="/${D.lang}/i/${r.token}">${esc(C.members)} →</a></div>`;
      out.querySelector('[data-copy]').onclick = async () => (st.textContent = (await copyText(url)) ? D.common.copied : url);
      out.querySelector('[data-share]').onclick = async () => { const s = await shareOrCopy({ title: C.title, text: fmt(C.inviteText, { url }) }); st.textContent = s === 'copied' ? D.common.copied : ''; };
    } catch (err) { st.textContent = err.status === 429 ? D.common.error + ' (429)' : D.common.error; } finally { e.target.disabled = false; }
  };
  const box = el.querySelector('[data-mine]');
  if (box) box.innerHTML = `<h3>${esc(C.members)}</h3>` + tokens.map((t) => `<p><a href="/${D.lang}/i/${esc(t)}">/${D.lang}/i/${esc(t.slice(0, 6))}…</a></p>`).join('');
}

// ---------- invite room ----------
export async function mountInvite(el, D, token) {
  const C = D.chem, ownerKey = ls.get(`chem-owner-${token}`), memberKey = ls.get(`chem-member-${token}`);
  const headers = {}; if (ownerKey) headers['x-owner-key'] = ownerKey; if (memberKey) headers['x-member-key'] = memberKey;
  let inv;
  try { inv = await api(`/api/invite/${encodeURIComponent(token)}`, { headers }); }
  catch (e) { el.innerHTML = `<h2>${esc(D.common.notFound)}</h2><a class="btn" href="/${D.lang}/friends/chemistry/">${esc(C.h1)}</a>`; return; }

  if (ownerKey && inv.isOwner) { // owner view: members list
    const list = inv.members.length ? `<ul class="members">${inv.members.map((m, i) => { const ch = chemistry(inv.ownerCode, m.code); return `<li class="card" style="padding:12px"><img src="/img/chars/${m.code}.svg" width="52" height="52" alt=""><div style="flex:1"><b>${esc(m.nick)}</b> · ${esc(D.types[m.code].name)}<br><span class="muted">${esc(C.combos[ch.pattern])}</span></div><button class="btn ghost" data-open="${i}">→</button></li>`; }).join('')}</ul>` : `<p>${esc(C.empty)}</p>`;
    el.innerHTML = `<h2 style="margin-top:0">${esc(C.members)} (${inv.members.length}/8)</h2>${list}<div data-detail></div><div class="row" style="margin-top:14px"><button class="btn ghost" data-refresh>${esc(C.refresh)}</button><button class="btn danger" data-del>${esc(C.deleteInvite)}</button></div><p class="status" role="status"></p><p class="muted">${esc(C.expires)}</p>`;
    el.querySelector('[data-refresh]').onclick = () => mountInvite(el, D, token);
    el.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { const m = inv.members[+b.dataset.open], ch = chemistry(inv.ownerCode, m.code), d = el.querySelector('[data-detail]'); d.innerHTML = `<div class="card" style="margin-top:14px">${chemHtml(D, ch, inv.ownerNick, m.nick)}</div>`; chemActions(d.firstChild, D, ch, inv.ownerNick, m.nick); }));
    el.querySelector('[data-del]').onclick = async () => {
      if (!confirm(C.deleteConfirm)) return;
      try { await api(`/api/invite/${encodeURIComponent(token)}`, { method: 'DELETE', headers: { 'x-owner-key': ownerKey } }); ls.del(`chem-owner-${token}`); location.href = `/${D.lang}/friends/chemistry/`; } catch { el.querySelector('.status').textContent = D.common.error; }
    };
    return;
  }
  if (memberKey && inv.ownerCode) { // already joined
    const myCode = ls.get(`chem-member-code-${token}`), myNick = ls.get(`chem-member-nick-${token}`) || C.you;
    if (myCode) return renderJoined(el, D, token, chemistry(inv.ownerCode, myCode), inv.ownerNick, myNick, memberKey);
  }
  // invitee entry
  el.innerHTML = `<div style="text-align:center"><img src="/img/chars/${inv.silhouette || 'SPH'}.svg" width="140" height="140" alt="" style="filter:brightness(0) opacity(.55)"><h2>${esc(fmt(C.invitedBy, { nick: inv.ownerNick }))}</h2><p>${esc(C.invitedSub)}</p>
  ${inv.members.length >= 8 ? `<p class="tag">${esc(C.full)}</p>` : `<button class="btn" data-go>${esc(D.quiz.start)}</button>`}</div>`;
  el.querySelector('[data-go]')?.addEventListener('click', async () => {
    const { code, pct } = await runQuiz(el, D);
    try { localStorage.setItem('play-character', JSON.stringify({ code, pct, at: Date.now() })); } catch {}
    el.innerHTML = `<label class="stack"><span class="muted">${esc(C.joinNick)}</span><input class="txt" maxlength="12" data-nick placeholder="${esc(C.friend)}"></label><div class="row" style="margin-top:12px"><button class="btn" data-join>${esc(C.join)}</button></div><p class="status" role="status"></p>`;
    el.querySelector('[data-join]').onclick = async (e) => {
      e.target.disabled = true;
      const nick = cleanNick(el.querySelector('[data-nick]').value, C.friend);
      try {
        const r = await api(`/api/invite/${encodeURIComponent(token)}/join`, { method: 'POST', body: { nick, code } });
        ls.set(`chem-member-${token}`, r.memberKey); ls.set(`chem-member-code-${token}`, code); ls.set(`chem-member-nick-${token}`, nick);
        renderJoined(el, D, token, r.chemistry, r.ownerNick, nick, r.memberKey, pct);
      } catch (err) { el.querySelector('.status').textContent = err.status === 409 ? C.full : D.common.error; e.target.disabled = false; }
    };
  });
}

function renderJoined(el, D, token, ch, ownerNick, myNick, memberKey, pct) {
  const C = D.chem;
  el.innerHTML = chemHtml(D, ch, ownerNick, myNick);
  chemActions(el, D, ch, ownerNick, myNick);
  const row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '10px';
  row.innerHTML = `<a class="btn ghost" href="/${D.lang}/friends/chemistry/">${esc(C.create)}</a><a class="btn ghost" href="/${D.lang}/me/play-character/types/${ch.b.toLowerCase()}/">${esc(D.types[ch.b].name)}</a><button class="btn danger" data-leave>${esc(C.leave)}</button>`;
  el.append(row);
  const st = document.createElement('p'); st.className = 'status'; st.setAttribute('role', 'status'); el.append(st);
  row.querySelector('[data-leave]').onclick = async () => {
    try { await api(`/api/invite/${encodeURIComponent(token)}/member`, { method: 'DELETE', headers: { 'x-member-key': memberKey } }); ['', 'code-', 'nick-'].forEach((p) => ls.del(`chem-member-${p}${token}`)); st.textContent = C.left; row.querySelector('[data-leave]').disabled = true; } catch { st.textContent = D.common.error; }
  };
  void pct; void showResult;
}
