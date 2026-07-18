const DataStore = {
  vocab: { n3: null, n2: null, n1: null },
  grammar: { n3: null, n2: null, n1: null },
  reading: null,
  listening: null,

  async loadVocab(level) {
    if (this.vocab[level]) return this.vocab[level];
    try {
      const res = await fetch(`data/vocab-${level}.json`);
      if (!res.ok) throw new Error('fetch failed');
      this.vocab[level] = await res.json();
    } catch (e) {
      if (level === 'n2') {
        const res2 = await fetch('data/vocab-seed.json');
        const seed = await res2.json();
        this.vocab[level] = seed.map(x => ({ w: x.w, r: x.r, en: '', zh: x.zh }));
      } else {
        this.vocab[level] = [];
      }
    }
    return this.vocab[level];
  },

  async loadGrammar(level) {
    if (this.grammar[level]) return this.grammar[level];
    const res = await fetch(`data/grammar-${level}.json`);
    this.grammar[level] = await res.json();
    return this.grammar[level];
  },

  async loadReadingAll() {
    if (this.reading) return this.reading;
    const res = await fetch('data/reading.json');
    this.reading = await res.json();
    return this.reading;
  },

  async loadReading(level) {
    const all = await this.loadReadingAll();
    return all.filter(a => a.level === level);
  },

  async loadListeningAll() {
    if (this.listening) return this.listening;
    const res = await fetch('data/listening.json');
    this.listening = await res.json();
    return this.listening;
  },

  async loadListening(level) {
    const all = await this.loadListeningAll();
    return all.filter(a => a.level === level);
  }
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LEVEL_LABEL = { n3: 'N3', n2: 'N2', n1: 'N1' };
