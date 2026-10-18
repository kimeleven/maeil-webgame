// Quiz + chemistry pure logic (REBOOT-SPEC §4, §5.2). Shared by browser and API/tests.
export const CODES = ['SPH', 'SPT', 'SIH', 'SIT', 'CPH', 'CPT', 'CIH', 'CIT'];
export const AXES = [[0, 3, 6, 9], [1, 4, 7], [2, 5, 8]]; // question indexes per axis
export const LETTERS = [['S', 'C'], ['P', 'I'], ['H', 'T']];
export const COLORS = { SPH: '#FFB547', SPT: '#4F8BFF', SIH: '#FF5FA2', SIT: '#22D3EE', CPH: '#7BE495', CPT: '#A58BFF', CIH: '#FFD166', CIT: '#9AA5B1' };
export const isCode = (c) => CODES.includes(c);

// best buddy = opposite on every axis (matches spec §4.4 table)
export function bestBuddy(code) {
  return code.split('').map((ch, i) => (LETTERS[i][0] === ch ? LETTERS[i][1] : LETTERS[i][0])).join('');
}

// answers: array of 10 'a' | 'b'. Returns { code, pct: [% first letter per axis] }
export function scoreQuiz(answers) {
  if (!Array.isArray(answers) || answers.length !== 10 || answers.some((a) => a !== 'a' && a !== 'b')) throw new Error('need 10 answers');
  let code = '';
  const pct = [];
  AXES.forEach((qs, i) => {
    const a = qs.filter((q) => answers[q] === 'a').length, b = qs.length - a;
    let pick;
    if (a === b) pick = answers[qs[qs.length - 1]] === 'a' ? 0 : 1; // tie → last question of that axis (Q10)
    else pick = a > b ? 0 : 1;
    code += LETTERS[i][pick];
    pct.push(Math.round((100 * a) / qs.length));
  });
  return { code, pct };
}

// chemistry between two codes: pattern index follows spec table order (=== first, ≠≠≠ last)
export function chemistry(a, b) {
  if (!isCode(a) || !isCode(b)) throw new Error('bad code');
  const same = [0, 1, 2].map((i) => a[i] === b[i]);
  const pattern = (same[0] ? 0 : 4) + (same[1] ? 0 : 2) + (same[2] ? 0 : 1);
  const roles = [0, 1, 2].map((i) => (same[i] ? { both: a[i] + a[i] } : { a: a[i], b: b[i] }));
  const care = !same[1] ? 'prog' : !same[2] ? 'judge' : same[0] ? 'same' : 'none';
  return { pattern, same, roles, play: pattern, care, a, b };
}

// render chemistry roles into text lines with an i18n dict (chem.roles)
export function roleLines(chem, roles, nameA, nameB) {
  return chem.roles.map((r) => (r.both ? roles[r.both] : `${nameA}: ${roles[r.a]} · ${nameB}: ${roles[r.b]}`));
}
