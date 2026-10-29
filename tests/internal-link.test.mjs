import test from 'node:test';
import assert from 'node:assert/strict';
import { linkInfo, EVENTS } from '../public/js/track.js';

test('internal_link is whitelisted and classifies fixed enums only', () => {
  assert.ok(EVENTS.includes('internal_link'));
  assert.deepEqual(linkInfo('/ko/me/play-character/', '/ko/play/magnet-harbor/'), { to: 'magnet', from: 'char' });
  assert.deepEqual(linkInfo('/en/play/magnet-harbor/', '/en/friends/chemistry/'), { to: 'chem', from: 'game' });
  assert.deepEqual(linkInfo('/ja/', '/ja/friends/things-to-do/?x=1'), { to: 'todo', from: 'home' });
  assert.deepEqual(linkInfo('/es/c/abc', '/es/play/gate-rush/'), { to: 'gate-rush', from: 'c' });
  assert.equal(linkInfo('/ko/', '/ko/about/'), null);
  assert.equal(linkInfo('/ko/', 'https://x.com/a/b/c'), null);
});
