const STORAGE_KEY = 'nihongo_dojo_v2';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultState() {
  return {
    streak: 0,
    lastDate: '',
    vKnown: {},
    vLearning: {},
    gDone: [],
    lDone: [],
    lCorrect: [],
    rDone: []
  };
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
    if (!raw) {
      this.state = defaultState();
      return this.state;
    }
    try {
      const parsed = JSON.parse(raw);
      this.state = Object.assign(defaultState(), parsed);
    } catch (e) {
      this.state = defaultState();
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // localStorage unavailable; ignore
    }
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

  markVocabKnown(word) {
    delete this.state.vLearning[word];
    this.state.vKnown[word] = true;
    this.save();
  },

  markVocabLearning(word) {
    delete this.state.vKnown[word];
    this.state.vLearning[word] = true;
    this.save();
  },

  markGrammarCorrect(idx) {
    if (!this.state.gDone.includes(idx)) this.state.gDone.push(idx);
    this.save();
  },

  markGrammarWrong(idx) {
    this.state.gDone = this.state.gDone.filter(i => i !== idx);
    this.save();
  },

  markReadingDone(id) {
    if (!this.state.rDone.includes(id)) this.state.rDone.push(id);
    this.save();
  },

  markListeningAnswered(id, correct) {
    if (!this.state.lDone.includes(id)) this.state.lDone.push(id);
    if (correct) {
      if (!this.state.lCorrect.includes(id)) this.state.lCorrect.push(id);
    } else {
      this.state.lCorrect = this.state.lCorrect.filter(i => i !== id);
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
    this.state = Object.assign(defaultState(), parsed);
    this.save();
  }
};
