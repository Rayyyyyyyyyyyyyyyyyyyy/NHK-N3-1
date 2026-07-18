const VocabPage = {
  mode: 'flashcard',
  vocab: [],
  fcDeck: [],
  fcIndex: 0,
  fcFlipped: false,
  quizStreak: 0,
  quizCurrent: null,
  quizOptions: [],
  quizAnswered: false,
  root: null
};

async function renderVocab(root) {
  VocabPage.root = root;
  const vocab = await DataStore.loadVocab();
  VocabPage.vocab = vocab;

  root.innerHTML = `
    <h2 class="page-title">單字</h2>
    <p class="meta-row"><span>已掌握 <b id="vocab-known-count"></b> ／ ${vocab.length}</span></p>
    <div class="mode-toggle">
      <button id="mode-flashcard" class="${VocabPage.mode === 'flashcard' ? 'active' : ''}">翻卡記憶</button>
      <button id="mode-quiz" class="${VocabPage.mode === 'quiz' ? 'active' : ''}">讀音測驗</button>
    </div>
    <div id="vocab-body"></div>
  `;

  updateVocabKnownCount();

  root.querySelector('#mode-flashcard').addEventListener('click', () => {
    VocabPage.mode = 'flashcard';
    renderVocab(root);
  });
  root.querySelector('#mode-quiz').addEventListener('click', () => {
    VocabPage.mode = 'quiz';
    renderVocab(root);
  });

  if (VocabPage.mode === 'flashcard') {
    if (VocabPage.fcDeck.length === 0) drawFlashcardDeck();
    renderFlashcardView();
  } else {
    if (!VocabPage.quizCurrent) nextQuizQuestion();
    renderQuizView();
  }
}

function updateVocabKnownCount() {
  const el = document.getElementById('vocab-known-count');
  if (el) el.textContent = Object.keys(Store.state.vKnown).length;
}

function drawFlashcardDeck() {
  const vocab = VocabPage.vocab;
  const learningWords = Object.keys(Store.state.vLearning).filter(w => vocab.some(v => v.w === w));
  const knownSet = new Set(Object.keys(Store.state.vKnown));
  const learningSet = new Set(Object.keys(Store.state.vLearning));

  let deckWords = shuffle(learningWords).slice(0, 10);
  if (deckWords.length < 10) {
    const fresh = vocab.filter(v => !knownSet.has(v.w) && !learningSet.has(v.w));
    const freshShuffled = shuffle(fresh);
    for (const v of freshShuffled) {
      if (deckWords.length >= 10) break;
      if (!deckWords.includes(v.w)) deckWords.push(v.w);
    }
  }
  // fallback: if still short (dataset very small), draw from anything
  if (deckWords.length < 10) {
    const rest = shuffle(vocab.map(v => v.w)).filter(w => !deckWords.includes(w));
    for (const w of rest) {
      if (deckWords.length >= 10) break;
      deckWords.push(w);
    }
  }
  VocabPage.fcDeck = deckWords.map(w => vocab.find(v => v.w === w)).filter(Boolean);
  VocabPage.fcIndex = 0;
  VocabPage.fcFlipped = false;
}

function renderFlashcardView() {
  const body = document.getElementById('vocab-body');
  if (!body) return;
  const deck = VocabPage.fcDeck;
  if (VocabPage.fcIndex >= deck.length) {
    body.innerHTML = `
      <div class="card" style="text-align:center;">
        <p>這一輪 10 張都複習完了！</p>
        <button class="btn" id="fc-restart">再抽 10 張</button>
      </div>`;
    body.querySelector('#fc-restart').addEventListener('click', () => {
      drawFlashcardDeck();
      renderFlashcardView();
    });
    return;
  }

  const item = deck[VocabPage.fcIndex];
  const flipped = VocabPage.fcFlipped;

  body.innerHTML = `
    <p class="meta-row"><span>第 ${VocabPage.fcIndex + 1} / ${deck.length} 張</span></p>
    <div class="flashcard" id="fc-card">
      ${flipped ? `
        <div class="fc-reading">${escapeHtml(item.r)}</div>
        <div class="fc-front-word" style="font-size:1.8rem;">${escapeHtml(item.w)}</div>
        <div class="fc-zh">${escapeHtml(item.zh || '')}</div>
        <div class="fc-en">${escapeHtml(item.en || '')}</div>
        <div class="kanji-chip-row" id="fc-kanji-row"></div>
        <div id="fc-kanji-detail"></div>
      ` : `
        <div class="fc-front-word">${escapeHtml(item.w)}</div>
        <div class="fc-hint">點卡片看讀音與釋義</div>
      `}
    </div>
    ${flipped ? `
      <div class="btn-row" style="margin-top:14px;">
        <button class="btn" style="background:#fff;color:var(--vermilion);border-color:var(--vermilion);" id="fc-learning">還不熟</button>
        <button class="btn" style="background:var(--green);border-color:var(--green);" id="fc-known">記住了</button>
      </div>
    ` : ''}
  `;

  body.querySelector('#fc-card').addEventListener('click', (e) => {
    if (e.target.closest('.kanji-chip')) return;
    VocabPage.fcFlipped = !VocabPage.fcFlipped;
    renderFlashcardView();
  });

  if (flipped) {
    const kanjiChars = extractKanjiChars(item.w);
    const kanjiRow = body.querySelector('#fc-kanji-row');
    if (kanjiChars.length) {
      kanjiRow.innerHTML = kanjiChars.map(k => `<button class="kanji-chip" data-k="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('');
      kanjiRow.querySelectorAll('.kanji-chip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const k = btn.dataset.k;
          const detailBox = body.querySelector('#fc-kanji-detail');
          detailBox.innerHTML = `<div class="kanji-detail">查詢中…</div>`;
          try {
            const data = await KanjiApi.lookup(k);
            const on = (data.on_readings || []).join('、') || '無';
            const kun = (data.kun_readings || []).join('、') || '無';
            const meanings = (data.meanings || []).join('、') || '無';
            const jlpt = data.jlpt ? `N${data.jlpt}` : '未標示';
            detailBox.innerHTML = `
              <div class="kanji-detail">
                <b>${escapeHtml(k)}</b>（JLPT ${jlpt}）<br>
                音讀：${escapeHtml(on)}<br>
                訓讀：${escapeHtml(kun)}<br>
                字義：${escapeHtml(meanings)}
              </div>`;
          } catch (err) {
            detailBox.innerHTML = `<div class="kanji-detail" style="color:var(--vermilion);">查詢失敗，稍後再試</div>`;
          }
        });
      });
    }

    body.querySelector('#fc-learning').addEventListener('click', (e) => {
      e.stopPropagation();
      Store.markVocabLearning(item.w);
      updateVocabKnownCount();
      VocabPage.fcIndex++;
      VocabPage.fcFlipped = false;
      renderFlashcardView();
    });
    body.querySelector('#fc-known').addEventListener('click', (e) => {
      e.stopPropagation();
      Store.markVocabKnown(item.w);
      updateVocabKnownCount();
      VocabPage.fcIndex++;
      VocabPage.fcFlipped = false;
      renderFlashcardView();
    });
  }
}

function nextQuizQuestion() {
  const vocab = VocabPage.vocab;
  const correct = vocab[Math.floor(Math.random() * vocab.length)];
  const distractPool = shuffle(vocab.filter(v => v.w !== correct.w && v.r !== correct.r));
  const distractors = [];
  for (const v of distractPool) {
    if (distractors.length >= 3) break;
    if (!distractors.some(d => d.r === v.r)) distractors.push(v);
  }
  const options = shuffle([correct, ...distractors]);
  VocabPage.quizCurrent = correct;
  VocabPage.quizOptions = options;
  VocabPage.quizAnswered = false;
}

function renderQuizView() {
  const body = document.getElementById('vocab-body');
  if (!body) return;
  const item = VocabPage.quizCurrent;
  const letters = ['A', 'B', 'C', 'D'];

  body.innerHTML = `
    <p class="quiz-streak">本次 ${VocabPage.quizStreak} 連勝</p>
    <div class="q-card">
      <p style="font-size:0.9rem;color:#5b6470;margin:0 0 6px;">這個字怎麼唸？</p>
      <p style="font-size:2rem;font-weight:700;color:var(--indigo-deep);margin:0 0 14px;">${escapeHtml(item.w)}</p>
      <div class="option-list" id="quiz-options">
        ${VocabPage.quizOptions.map((opt, i) => `
          <button class="option-btn" data-idx="${i}">
            <span class="option-letter">${letters[i]}</span>
            <span>${escapeHtml(opt.r)}</span>
          </button>`).join('')}
      </div>
      <div id="quiz-explanation"></div>
    </div>
  `;

  body.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (VocabPage.quizAnswered) return;
      VocabPage.quizAnswered = true;
      const idx = Number(btn.dataset.idx);
      const chosen = VocabPage.quizOptions[idx];
      const isCorrect = chosen.w === item.w && chosen.r === item.r;

      body.querySelectorAll('.option-btn').forEach((b, i) => {
        b.disabled = true;
        const opt = VocabPage.quizOptions[i];
        if (opt.w === item.w && opt.r === item.r) b.classList.add('correct');
        else if (i === idx) b.classList.add('wrong');
      });

      if (isCorrect) VocabPage.quizStreak++;
      else VocabPage.quizStreak = 0;

      const exp = body.querySelector('#quiz-explanation');
      exp.innerHTML = `
        <div class="explanation">
          <b>${escapeHtml(item.w)}</b>（${escapeHtml(item.r)}）：${escapeHtml(item.zh || item.en || '')}
        </div>
        <div class="btn-row" style="margin-top:12px;">
          ${!Store.state.vKnown[item.w] ? `<button class="btn btn-outline" id="quiz-mark-known">標為已掌握</button>` : ''}
          <button class="btn" id="quiz-next">下一題</button>
        </div>
      `;
      const markBtn = exp.querySelector('#quiz-mark-known');
      if (markBtn) markBtn.addEventListener('click', () => {
        Store.markVocabKnown(item.w);
        updateVocabKnownCount();
        markBtn.remove();
      });
      exp.querySelector('#quiz-next').addEventListener('click', () => {
        nextQuizQuestion();
        renderQuizView();
      });

      body.querySelector('.quiz-streak').textContent = `本次 ${VocabPage.quizStreak} 連勝`;
    });
  });
}
