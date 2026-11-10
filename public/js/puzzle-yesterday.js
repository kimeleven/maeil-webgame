// 어제 정답 페이지 (t_49b0ed25): 스포일러 방지로 접어 두고, 펼치면 어제 판의 묶음과 단어를 보여 준다.
import { prevDate } from '/js/puzzle-core.js';
import { wgDay, WG_LEVELS } from '/js/puzzle-extra-core.js';
import { $, today } from '/js/puzzle-ui.js';
const data = await (await fetch('/data/wordgroup-days.json')).json();
const y = prevDate(today), day = wgDay(data, y);
$('#wy-date').textContent = `${y} (${day.n}번째 판)`;
$('#wy-list').innerHTML = day.groups.map((g) => `<div class="wg-g wg-l${g.level}"><b>${WG_LEVELS[g.level].name} · ${g.name}</b><span>${g.words.join(' · ')}</span></div>`).join('');
$('#wy-fallback').hidden = true; $('#wy-box').hidden = false;
