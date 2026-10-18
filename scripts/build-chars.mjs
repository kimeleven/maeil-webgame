// Generates the 8 original character SVGs (REBOOT-SPEC §4.2): round little creatures, neon rim light, 512×512.
import { writeFileSync, mkdirSync } from 'node:fs';
import { COLORS } from '../public/js/logic.js';

const out = new URL('../public/img/chars/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const face = (c, y = 270) => `
  <ellipse cx="212" cy="${y}" rx="26" ry="30" fill="#fff"/><ellipse cx="300" cy="${y}" rx="26" ry="30" fill="#fff"/>
  <circle cx="218" cy="${y + 4}" r="15" fill="#141826"/><circle cx="294" cy="${y + 4}" r="15" fill="#141826"/>
  <circle cx="224" cy="${y - 4}" r="5" fill="#fff"/><circle cx="300" cy="${y - 4}" r="5" fill="#fff"/>
  <path d="M232 ${y + 46} Q256 ${y + 66} 280 ${y + 46}" stroke="#141826" stroke-width="9" fill="none" stroke-linecap="round"/>
  <ellipse cx="176" cy="${y + 40}" rx="18" ry="10" fill="#ff7aa8" opacity=".45"/><ellipse cx="336" cy="${y + 40}" rx="18" ry="10" fill="#ff7aa8" opacity=".45"/>`;

const body = (c, extra = '') => `
  <ellipse cx="256" cy="452" rx="150" ry="22" fill="#000" opacity=".35"/>
  <path d="M256 120 C380 120 410 230 404 320 C398 410 330 446 256 446 C182 446 114 410 108 320 C102 230 132 120 256 120Z" fill="url(#g)" stroke="${c}" stroke-width="6" filter="url(#glow)"/>
  <ellipse cx="256" cy="360" rx="92" ry="70" fill="#fff" opacity=".16"/>${extra}`;

const parts = {
  // 깃발 든 햇살 여우
  SPH: (c) => `<path d="M150 150 L128 52 L214 124Z" fill="${c}" stroke="#fff3" stroke-width="4"/><path d="M362 150 L384 52 L298 124Z" fill="${c}" stroke="#fff3" stroke-width="4"/>
    ${body(c)}<path d="M404 330 Q470 300 470 380 Q440 420 396 390Z" fill="${c}"/><path d="M455 360 Q470 385 450 400" stroke="#fff" stroke-width="10" fill="none"/>
    <line x1="120" y1="400" x2="80" y2="160" stroke="#ddd" stroke-width="8" stroke-linecap="round"/><path d="M82 165 L160 186 L92 222Z" fill="#fff6c7"/>
    <g stroke="#ffe39a" stroke-width="6" stroke-linecap="round"><line x1="256" y1="60" x2="256" y2="92"/><line x1="200" y1="72" x2="210" y2="100"/><line x1="312" y1="72" x2="302" y2="100"/></g>`,
  // 지도 펼친 로봇 부엉이
  SPT: (c) => `<path d="M160 140 L150 80 L210 122Z" fill="${c}"/><path d="M352 140 L362 80 L302 122Z" fill="${c}"/>
    ${body(c)}<line x1="256" y1="120" x2="256" y2="70" stroke="#cfe0ff" stroke-width="6"/><circle cx="256" cy="64" r="11" fill="#7ff" />
    <rect x="186" y="246" width="140" height="56" rx="28" fill="#0d1530" opacity=".55"/>
    <path d="M150 360 L210 340 L256 362 L302 340 L362 360 L362 430 L302 410 L256 432 L210 410 L150 430Z" fill="#f4ecd4" stroke="#b9a77a" stroke-width="4"/>
    <path d="M190 390 Q230 360 256 396 T330 384" stroke="#e05" stroke-width="5" fill="none" stroke-dasharray="10 8"/>`,
  // 폭죽 꼬리 수달
  SIH: (c) => `<circle cx="160" cy="150" r="30" fill="${c}"/><circle cx="352" cy="150" r="30" fill="${c}"/>
    ${body(c)}<path d="M400 380 Q470 360 462 270" stroke="${c}" stroke-width="30" fill="none" stroke-linecap="round"/>
    <g stroke-width="7" stroke-linecap="round"><line x1="462" y1="250" x2="462" y2="200" stroke="#ffe066"/><line x1="462" y1="250" x2="500" y2="218" stroke="#7ff"/><line x1="462" y1="250" x2="424" y2="214" stroke="#fff"/><line x1="462" y1="250" x2="505" y2="262" stroke="#ff9ad0"/></g>
    <ellipse cx="256" cy="326" rx="24" ry="14" fill="#5a2338"/>
    <g stroke="#fff" stroke-width="4" opacity=".7"><line x1="200" y1="332" x2="150" y2="322"/><line x1="312" y1="332" x2="362" y2="322"/></g>`,
  // 스케이트보드 탄 번개 고양이
  SIT: (c) => `<path d="M150 160 L140 70 L220 128Z" fill="${c}"/><path d="M362 160 L372 70 L292 128Z" fill="${c}"/>
    ${body(c)}<path d="M244 150 L276 150 L258 190 L284 190 L236 246 L250 202 L228 202Z" fill="#fff59a"/>
    <rect x="120" y="440" width="272" height="20" rx="10" fill="#26304f" stroke="${c}" stroke-width="4"/>
    <circle cx="160" cy="474" r="14" fill="#fff"/><circle cx="352" cy="474" r="14" fill="#fff"/>
    <g stroke="${c}" stroke-width="6" opacity=".6" stroke-linecap="round"><line x1="40" y1="420" x2="96" y2="420"/><line x1="60" y1="450" x2="104" y2="450"/></g>`,
  // 찻잔 든 이끼 거북
  CPH: (c) => `${body(c, `<path d="M140 220 Q256 90 372 220" stroke="#3f8f5a" stroke-width="18" fill="none"/>
    <g fill="#3f8f5a" opacity=".8"><circle cx="190" cy="160" r="16"/><circle cx="256" cy="134" r="18"/><circle cx="322" cy="160" r="16"/></g>`)}
    <path d="M196 372 L316 372 L304 432 Q256 448 208 432Z" fill="#fff" stroke="#c9d6ff" stroke-width="4"/><path d="M316 386 Q348 392 338 414 Q330 426 310 420" stroke="#fff" stroke-width="8" fill="none"/>
    <g stroke="#fff" stroke-width="5" opacity=".6" fill="none"><path d="M236 360 q-10 -22 4 -40"/><path d="M270 360 q10 -22 -4 -40"/></g>`,
  // 돋보기 든 달 박쥐
  CPT: (c) => `<path d="M118 260 Q40 200 30 300 Q70 290 90 330 Q100 300 120 320Z" fill="${c}"/><path d="M394 260 Q472 200 482 300 Q442 290 422 330 Q412 300 392 320Z" fill="${c}"/>
    <path d="M170 140 L160 70 L220 124Z" fill="${c}"/><path d="M342 140 L352 70 L292 124Z" fill="${c}"/>
    ${body(c)}<path d="M380 80 A40 40 0 1 1 420 140 A30 30 0 1 0 380 80Z" fill="#fff6c7"/>
    <circle cx="330" cy="380" r="40" fill="#bdf4ff" opacity=".35" stroke="#fff" stroke-width="8"/><line x1="300" y1="410" x2="262" y2="448" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`,
  // 구름 위 낮잠 양
  CIH: (c) => `<g fill="#e9eefc" opacity=".9"><circle cx="110" cy="440" r="50"/><circle cx="190" cy="460" r="56"/><circle cx="300" cy="462" r="58"/><circle cx="400" cy="440" r="50"/></g>
    ${body(c, `<g fill="#fff" opacity=".85"><circle cx="190" cy="140" r="34"/><circle cx="256" cy="122" r="38"/><circle cx="322" cy="140" r="34"/></g>`)}
    <ellipse cx="128" cy="250" rx="34" ry="16" fill="${c}" transform="rotate(-25 128 250)"/><ellipse cx="384" cy="250" rx="34" ry="16" fill="${c}" transform="rotate(25 384 250)"/>
    <text x="380" y="110" font-family="sans-serif" font-weight="900" font-size="44" fill="#fff" opacity=".8">z</text><text x="420" y="74" font-family="sans-serif" font-weight="900" font-size="30" fill="#fff" opacity=".6">z</text>`,
  // 별자리 연결하는 고슴도치
  CIT: (c) => `<g fill="${c}" opacity=".9">${Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.95 + i * 0.137); return `<path d="M${256 + Math.cos(a) * 120} ${290 + Math.sin(a) * 150} L${256 + Math.cos(a) * 210} ${290 + Math.sin(a) * 230} L${256 + Math.cos(a + 0.12) * 125} ${290 + Math.sin(a + 0.12) * 155}Z"/>`; }).join('')}</g>
    ${body(c)}<g stroke="#bfe8ff" stroke-width="3" opacity=".8"><line x1="60" y1="120" x2="120" y2="80"/><line x1="120" y1="80" x2="170" y2="110"/><line x1="380" y1="60" x2="440" y2="110"/><line x1="440" y1="110" x2="470" y2="70"/></g>
    <g fill="#fff">${[[60, 120], [120, 80], [170, 110], [380, 60], [440, 110], [470, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7"/>`).join('')}</g>`,
};

for (const [code, fn] of Object.entries(parts)) {
  const c = COLORS[code];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="${code}">
<defs><radialGradient id="g" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".75"/></radialGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
${fn(c)}${face(c)}
</svg>
`;
  writeFileSync(out + code + '.svg', svg);
}
console.log('chars: 8 svg →', out);
