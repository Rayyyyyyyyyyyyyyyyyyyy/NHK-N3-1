const DataStore = {
  vocab: null,
  grammar: null,
  reading: null,
  listening: null,

  async loadVocab() {
    if (this.vocab) return this.vocab;
    try {
      const res = await fetch('data/vocab-n2.json');
      if (!res.ok) throw new Error('fetch failed');
      this.vocab = await res.json();
    } catch (e) {
      const res2 = await fetch('data/vocab-seed.json');
      const seed = await res2.json();
      this.vocab = seed.map(x => ({ w: x.w, r: x.r, en: '', zh: x.zh }));
    }
    return this.vocab;
  },

  async loadGrammar() {
    if (this.grammar) return this.grammar;
    const res = await fetch('data/grammar.json');
    this.grammar = await res.json();
    return this.grammar;
  },

  async loadReading() {
    if (this.reading) return this.reading;
    const res = await fetch('data/reading.json');
    this.reading = await res.json();
    return this.reading;
  },

  async loadListening() {
    if (this.listening) return this.listening;
    const res = await fetch('data/listening.json');
    this.listening = await res.json();
    return this.listening;
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
