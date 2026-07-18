const STORAGE_KEY = 'nihongo_dojo_v3';
const LEGACY_STORAGE_KEY = 'nihongo_dojo_v2';
const LEVELS = ['n3', 'n2', 'n1'];

const LEGACY_READING_LEVELS = { r1: 'n3', r2: 'n2', r3: 'n2' };
const LEGACY_LISTENING_LEVELS = {
  l1: 'n3', l2: 'n3', l3: 'n2', l4: 'n2', l5: 'n2', l6: 'n2', l7: 'n3', l8: 'n3'
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyLevelMap(fill) {
  const o = {};
  LEVELS.forEach(lv => { o[lv] = fill === 'array' ? [] : {}; });
  return o;
}

function defaultState() {
  return {
    streak: 0,
    lastDate: '',
    level: 'n3',
    vKnown: emptyLevelMap('object'),
    vLearning: emptyLevelMap('object'),
    gDone: emptyLevelMap('array'),
    lDone: emptyLevelMap('array'),
    lCorrect: emptyLevelMap('array'),
    rDone: emptyLevelMap('array')
  };
}

function isLegacyShape(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.level && LEVELS.includes(parsed.level) && parsed.vKnown && LEVELS.every(lv => lv in parsed.vKnown)) {
    return false; // already v3 shape
  }
  return true;
}

function migrateLegacyToV3(legacy) {
  const s = defaultState();
  s.streak = legacy.streak || 0;
  s.lastDate = legacy.lastDate || '';
  s.level = 'n2';

  if (legacy.vKnown && typeof legacy.vKnown === 'object') {
    s.vKnown.n2 = Object.assign({}, legacy.vKnown);
  }
  if (legacy.vLearning && typeof legacy.vLearning === 'object') {
    s.vLearning.n2 = Object.assign({}, legacy.vLearning);
  }
  if (Array.isArray(legacy.gDone)) {
    s.gDone.n2 = legacy.gDone.slice();
  }
  if (Array.isArray(legacy.rDone)) {
    legacy.rDone.forEach(id => {
      const lv = LEGACY_READING_LEVELS[id] || 'n2';
      if (!s.rDone[lv].includes(id)) s.rDone[lv].push(id);
    });
  }
  if (Array.isArray(legacy.lDone)) {
    legacy.lDone.forEach(id => {
      const lv = LEGACY_LISTENING_LEVELS[id] || 'n2';
      if (!s.lDone[lv].includes(id)) s.lDone[lv].push(id);
    });
  }
  if (Array.isArray(legacy.lCorrect)) {
    legacy.lCorrect.forEach(id => {
      const lv = LEGACY_LISTENING_LEVELS[id] || 'n2';
      if (!s.lCorrect[lv].includes(id)) s.lCorrect[lv].push(id);
    });
  }
  return s;
}

function normalizeState(parsed) {
  const base = defaultState();
  const merged = Object.assign({}, base, parsed);
  LEVELS.forEach(lv => {
    merged.vKnown[lv] = Object.assign({}, base.vKnown[lv], (parsed.vKnown && parsed.vKnown[lv]) || {});
    merged.vLearning[lv] = Object.assign({}, base.vLearning[lv], (parsed.vLearning && parsed.vLearning[lv]) || {});
    merged.gDone[lv] = ((parsed.gDone && parsed.gDone[lv]) || []).slice();
    merged.lDone[lv] = ((parsed.lDone && parsed.lDone[lv]) || []).slice();
    merged.lCorrect[lv] = ((parsed.lCorrect && parsed.lCorrect[lv]) || []).slice();
    merged.rDone[lv] = ((parsed.rDone && parsed.rDone[lv]) || []).slice();
  });
  if (!LEVELS.includes(merged.level)) merged.level = 'n3';
  return merged;
}

const Store = {
  state: null,

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.state = normalizeState(parsed);
        return this.state;
      } catch (e) {
        this.state = defaultState();
        return this.state;
      }
    }

    // no v3 data yet — try migrating legacy v2 data
    let legacyRaw = null;
    try {
      legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      legacyRaw = null;
    }
    if (legacyRaw) {
      try {
        const legacyParsed = JSON.parse(legacyRaw);
        this.state = isLegacyShape(legacyParsed) ? migrateLegacyToV3(legacyParsed) : normalizeState(legacyParsed);
        this.save();
        return this.state;
      } catch (e) {
        this.state = defaultState();
        return this.state;
      }
    }

    this.state = defaultState();
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // localStorage unavailable; ignore
    }
  },

  setLevel(level) {
    if (!LEVELS.includes(level)) return;
    this.state.level = level;
    this.save();
  },

  touchStreak() {
    const today = todayStr();
    const s = this.state;
    if (s.lastDate === today) {
      // same day, no change
    } else if (s.lastDate === '') {
      s.streak = 1;
      s.lastDate = today;
    } else {
      const prev = new Date(s.lastDate + 'T00:00:00');
      const cur = new Date(today + 'T00:00:00');
      const diffDays = Math.round((cur - prev) / 86400000);
      if (diffDays === 1) {
        s.streak += 1;
      } else {
        s.streak = 1;
      }
      s.lastDate = today;
    }
    this.save();
  },

  markVocabKnown(level, word) {
    delete this.state.vLearning[level][word];
    this.state.vKnown[level][word] = true;
    this.save();
  },

  markVocabLearning(level, word) {
    delete this.state.vKnown[level][word];
    this.state.vLearning[level][word] = true;
    this.save();
  },

  markGrammarCorrect(level, idx) {
    if (!this.state.gDone[level].includes(idx)) this.state.gDone[level].push(idx);
    this.save();
  },

  markGrammarWrong(level, idx) {
    this.state.gDone[level] = this.state.gDone[level].filter(i => i !== idx);
    this.save();
  },

  markReadingDone(level, id) {
    if (!this.state.rDone[level].includes(id)) this.state.rDone[level].push(id);
    this.save();
  },

  markListeningAnswered(level, id, correct) {
    if (!this.state.lDone[level].includes(id)) this.state.lDone[level].push(id);
    if (correct) {
      if (!this.state.lCorrect[level].includes(id)) this.state.lCorrect[level].push(id);
    } else {
      this.state.lCorrect[level] = this.state.lCorrect[level].filter(i => i !== id);
    }
    this.save();
  },

  exportCode() {
    const json = JSON.stringify(this.state);
    return btoa(encodeURIComponent(json));
  },

  importCode(code) {
    const json = decodeURIComponent(atob(code.trim()));
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('invalid');
    this.state = isLegacyShape(parsed) ? migrateLegacyToV3(parsed) : normalizeState(parsed);
    this.save();
  }
};
