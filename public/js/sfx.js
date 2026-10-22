// Gate Rush feedback: tiny WebAudio synth + optional haptics. No audio files, no network.
// - AudioContext is created only after the first user gesture (autoplay policy).
// - Settings persist in localStorage ('gate-rush-sfx'): { sound, haptic }.
// - Suspended while the tab is hidden. Any missing API → silent no-op.
const KEY = 'gate-rush-sfx';
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

export function loadSfxPrefs() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY)); } catch {}
  return { sound: p?.sound !== false, haptic: p?.haptic !== false };
}

// tone recipes: [freqStart, freqEnd, dur, type, gain, delay]
const RECIPES = {
  gateUp: [[520, 880, 0.09, 'triangle', 0.18, 0], [880, 1320, 0.08, 'triangle', 0.12, 0.06]],
  gateDown: [[420, 220, 0.16, 'sawtooth', 0.12, 0]],
  hit: [[180, 60, 0.22, 'square', 0.16, 0], [90, 45, 0.25, 'sine', 0.22, 0]],
  dodge: [[660, 990, 0.07, 'sine', 0.14, 0]],
  close: [[740, 1480, 0.12, 'triangle', 0.16, 0], [1480, 1760, 0.06, 'sine', 0.1, 0.1]],
  warn: [[880, 880, 0.06, 'square', 0.07, 0], [880, 880, 0.06, 'square', 0.07, 0.12]],
  clear: [[523, 523, 0.12, 'triangle', 0.16, 0], [659, 659, 0.12, 'triangle', 0.16, 0.11], [784, 784, 0.12, 'triangle', 0.16, 0.22], [1047, 1047, 0.28, 'triangle', 0.18, 0.33]],
  lose: [[392, 330, 0.18, 'sawtooth', 0.12, 0], [330, 262, 0.18, 'sawtooth', 0.12, 0.16], [262, 130, 0.4, 'sawtooth', 0.12, 0.32]],
};
const BUZZ = { hit: [40, 30, 40], close: 15, clear: [20, 40, 20, 40, 60], lose: 120, warn: 10 };

export function createSfx({ enabled = true } = {}) {
  const prefs = loadSfxPrefs();
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  let ac = null, master = null, last = {};
  const stats = { played: 0, buzzed: 0, unlocked: false };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };

  function unlock() {
    if (!enabled || !AC || !prefs.sound) return;
    try {
      if (!ac) { ac = new AC(); master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination); }
      if (ac.state === 'suspended' && !document.hidden) ac.resume();
      stats.unlocked = true;
    } catch { ac = null; }
  }
  function tone([f0, f1, dur, type, gain, delay]) {
    const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function play(name) {
    if (!enabled) return;
    const now = performance.now();
    if (last[name] && now - last[name] < 60) return; // de-dupe bursts
    last[name] = now;
    if (prefs.sound && ac && ac.state === 'running' && !document.hidden && RECIPES[name]) {
      try { RECIPES[name].forEach(tone); stats.played++; } catch {}
    }
    // haptics: opt-out toggle, skipped under reduced motion, absent on iOS Safari (no-op)
    if (prefs.haptic && BUZZ[name] && !reduced() && navigator.vibrate) { try { navigator.vibrate(BUZZ[name]); stats.buzzed++; } catch {} }
  }
  function set(k, v) {
    prefs[k] = !!v; save();
    if (k === 'sound') { if (v) unlock(); else if (ac) try { ac.suspend(); } catch {} }
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    try { document.hidden ? ac.suspend() : prefs.sound && ac.resume(); } catch {}
  });
  return {
    unlock, play, set, prefs,
    get supported() { return { audio: !!AC, vibrate: typeof navigator !== 'undefined' && !!navigator.vibrate }; },
    get state() { return { ...stats, ctx: ac ? ac.state : 'none', ...prefs }; },
  };
}
