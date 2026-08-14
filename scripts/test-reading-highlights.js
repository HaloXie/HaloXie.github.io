'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const highlights = require('../plugins/reading-highlights/reading-highlights.js');

function candidate(overrides = {}) {
  return {
    kind: 'paragraph',
    section: 0,
    text: 'A sufficiently complete conclusion that gives readers the central result without rewriting the article.',
    strongText: 'A sufficiently complete conclusion that gives readers the central result',
    ...overrides
  };
}

assert.equal(highlights.isEnabledPreference(null), true, 'missing preference defaults to enabled');
assert.equal(highlights.isEnabledPreference('enabled'), true);
assert.equal(highlights.isEnabledPreference('disabled'), false);
assert.equal(highlights.isEnabledPreference('OFF'), false);

assert.equal(highlights.scoreCandidate(candidate({ strongText: 'Role:' })), null, 'short labels are excluded');
assert.equal(highlights.scoreCandidate(candidate({ strongText: 'tiny' })), null, 'weak strong ratio is excluded');
assert.ok(highlights.scoreCandidate(candidate()) > 0, 'strong-led conclusion is eligible');
assert.ok(highlights.scoreCandidate(candidate({ kind: 'blockquote', strongText: '' })) > 0, 'compact blockquote is eligible');
assert.equal(highlights.scoreCandidate(candidate({ kind: 'blockquote', text: 'Too short.' })), null);

const sameSection = [candidate(), candidate({ text: `${candidate().text} Extra context.` })];
assert.equal(highlights.selectCandidates(sameSection, 20).length, 1, 'each section receives at most one highlight');

const manySections = Array.from({ length: 20 }, (_, section) => candidate({ section }));
assert.equal(highlights.selectCandidates(manySections, 20).length, 3, 'selection respects the 15% density limit');

const hugeArticle = Array.from({ length: 100 }, (_, section) => candidate({ section }));
assert.equal(highlights.selectCandidates(hugeArticle, 100).length, 8, 'selection respects the global cap');

assert.equal(highlights.selectCandidates([candidate()], 0).length, 0, 'no prose blocks means no highlights');

const attributes = new Map();
const fakeButton = {
  dataset: {
    enabledLabel: 'Turn off reading highlights',
    disabledLabel: 'Turn on reading highlights'
  },
  hidden: true,
  setAttribute(name, value) {
    attributes.set(name, value);
  }
};
highlights.syncToggle(fakeButton, false);
assert.equal(attributes.get('aria-pressed'), 'false');
assert.equal(attributes.get('aria-label'), 'Turn on reading highlights');
assert.equal(attributes.get('data-reading-highlights-ready'), '');
assert.equal(fakeButton.hidden, false, 'toggle is revealed only after runtime synchronization');

const root = path.join(__dirname, '..');
const headSource = fs.readFileSync(path.join(root, '_includes/head.html'), 'utf8');
const bootstrapIndex = headSource.indexOf('data-reading-highlights-bootstrap');
const stylesheetIndex = headSource.indexOf('/plugins/reading-highlights/reading-highlights.css');
assert.ok(bootstrapIndex >= 0 && bootstrapIndex < stylesheetIndex, 'preference bootstrap precedes plugin CSS');
assert.match(headSource, /localStorage\.getItem\('halo:reading-highlights'\)/);
assert.match(headSource, /catch \(_error\) \{\s*enabled = true;/);

const packageJson = require('../package.json');
assert.equal(packageJson.scripts.test, 'npm run test:reading-highlights', 'default npm test runs plugin tests');

console.log('Reading highlights tests passed.');
