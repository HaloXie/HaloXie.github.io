(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ReadingHighlights = api;
    api.init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'halo:reading-highlights';
  const HIGHLIGHT_CLASS = 'reading-highlight';
  const MAX_HIGHLIGHTS = 8;
  const DENSITY = 0.15;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isEnabledPreference(value) {
    return !['disabled', 'off', 'false', '0'].includes(String(value || '').toLowerCase());
  }

  function scoreCandidate(candidate) {
    const textLength = normalizeText(candidate.text).length;
    const strongLength = normalizeText(candidate.strongText).length;
    const strongRatio = textLength ? strongLength / textLength : 0;

    if (candidate.kind === 'blockquote') {
      if (textLength < 40 || textLength > 280) return null;
      return 50 + Math.min(20, Math.round(strongRatio * 20));
    }

    if (candidate.kind !== 'paragraph' || textLength < 36 || textLength > 320) return null;
    if (strongLength < 14 || strongRatio < 0.42) return null;

    const strongIsShortLabel = strongLength <= 24 && /[:：]\s*$/.test(normalizeText(candidate.strongText));
    if (strongIsShortLabel) return null;

    return 60 + Math.round(strongRatio * 30) + (textLength <= 180 ? 5 : 0);
  }

  function selectCandidates(candidates, proseBlockCount) {
    if (!proseBlockCount || !candidates.length) return [];

    const densityLimit = Math.max(1, Math.floor(proseBlockCount * DENSITY));
    const limit = Math.min(MAX_HIGHLIGHTS, densityLimit);
    const usedSections = new Set();

    return candidates
      .map((candidate, index) => ({ candidate, index, score: scoreCandidate(candidate) }))
      .filter((item) => item.score !== null)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .filter((item) => {
        if (usedSections.has(item.candidate.section)) return false;
        usedSections.add(item.candidate.section);
        return true;
      })
      .slice(0, limit)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.candidate);
  }

  function isExcludedBlock(element) {
    const className = element.className || '';
    return /(?:^|\s)(?:prompt|callout|alert)(?:\s|$)/i.test(className)
      || element.hasAttribute('data-prompt')
      || Boolean(element.querySelector('table, pre, code, figure, nav, h1, h2, h3, h4, h5, h6, ul, ol'));
  }

  function collectCandidates(content) {
    const candidates = [];
    let proseBlockCount = 0;
    let section = 0;

    Array.from(content.children).forEach((element) => {
      if (/^H[1-6]$/.test(element.tagName)) {
        section += 1;
        return;
      }

      const kind = element.tagName === 'P'
        ? 'paragraph'
        : element.tagName === 'BLOCKQUOTE' ? 'blockquote' : null;
      if (!kind || isExcludedBlock(element)) return;

      proseBlockCount += 1;
      const strongText = Array.from(element.querySelectorAll('strong'))
        .map((strong) => strong.textContent)
        .join(' ');
      candidates.push({ element, kind, section, text: element.textContent, strongText });
    });

    return { candidates, proseBlockCount };
  }

  function readPreference(storage) {
    try {
      return storage.getItem(STORAGE_KEY);
    } catch (_error) {
      return null;
    }
  }

  function writePreference(storage, enabled) {
    try {
      storage.setItem(STORAGE_KEY, enabled ? 'enabled' : 'disabled');
    } catch (_error) {
      // Storage can be unavailable in private or hardened browsing contexts.
    }
  }

  function syncToggle(button, enabled) {
    const state = enabled ? 'enabled' : 'disabled';
    const label = button.dataset[`${state}Label`];
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('data-reading-highlights-ready', '');
    button.hidden = false;
  }

  function init(doc, storage) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    const content = doc.querySelector('article[data-toc] > .content');
    const button = doc.querySelector('[data-reading-highlights-toggle]');
    if (!content || !button) return;

    if (storage === undefined) {
      try {
        storage = typeof localStorage !== 'undefined' ? localStorage : null;
      } catch (_error) {
        storage = null;
      }
    }
    const bootstrappedState = doc.documentElement.dataset.readingHighlights;
    let enabled = bootstrappedState === 'on' || bootstrappedState === 'off'
      ? bootstrappedState === 'on'
      : isEnabledPreference(storage ? readPreference(storage) : null);
    const selection = collectCandidates(content);
    selectCandidates(selection.candidates, selection.proseBlockCount)
      .forEach((candidate) => candidate.element.classList.add(HIGHLIGHT_CLASS));

    const applyState = () => {
      doc.documentElement.dataset.readingHighlights = enabled ? 'on' : 'off';
      syncToggle(button, enabled);
    };

    button.addEventListener('click', () => {
      enabled = !enabled;
      if (storage) writePreference(storage, enabled);
      applyState();
    });

    applyState();
  }

  return {
    STORAGE_KEY,
    collectCandidates,
    init,
    isEnabledPreference,
    scoreCandidate,
    selectCandidates,
    syncToggle
  };
});
