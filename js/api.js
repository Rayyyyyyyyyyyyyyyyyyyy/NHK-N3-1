const KanjiApi = {
  cache: {},

  async lookup(kanji) {
    if (this.cache[kanji]) return this.cache[kanji];
    const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
    if (!res.ok) throw new Error('kanjiapi error ' + res.status);
    const data = await res.json();
    this.cache[kanji] = data;
    return data;
  }
};

function extractKanjiChars(word) {
  const set = [];
  for (const ch of word) {
    if (/[一-鿿㐀-䶿]/.test(ch) && !set.includes(ch)) {
      set.push(ch);
    }
  }
  return set;
}
