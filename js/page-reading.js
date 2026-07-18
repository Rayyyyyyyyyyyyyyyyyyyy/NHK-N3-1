const ReadingPage = {
  view: 'list',
  articles: [],
  currentId: null,
  answers: {}
};

async function renderReading(root) {
  const articles = await DataStore.loadReading();
  ReadingPage.articles = articles;
  ReadingPage.root = root;

  if (ReadingPage.view === 'detail' && ReadingPage.currentId) {
    renderReadingDetail(root);
  } else {
    renderReadingList(root);
  }
}

function renderReadingList(root) {
  const articles = ReadingPage.articles;
  root.innerHTML = `
    <h2 class="page-title">讀解</h2>
    <div class="card" style="padding:4px 16px;">
      ${articles.map(a => `
        <a href="#" class="reading-list-item" data-id="${a.id}">
          <span>
            <span class="rli-title">${escapeHtml(a.title)}</span><br>
            <span class="rli-type">${escapeHtml(a.type)}</span>
          </span>
          <span class="rli-check">${Store.state.rDone.includes(a.id) ? '✓' : ''}</span>
        </a>
      `).join('')}
    </div>

    <section class="card ext-link-card">
      <p class="card-title">延伸練習</p>
      <a class="btn btn-outline btn-block" target="_blank" rel="noopener" href="https://www3.nhk.or.jp/nhkworld/zt/shows/ljfn/">NHK 從新聞學日語</a>
      <a class="btn btn-outline btn-block" target="_blank" rel="noopener" href="https://www3.nhk.or.jp/news/easy/" style="margin-top:8px;">NHK NEWS WEB EASY</a>
      <p style="font-size:0.78rem;color:#5b6470;margin:10px 0 0;">NHK 內容有版權且禁止內嵌，故以連結開啟。</p>
    </section>
  `;

  root.querySelectorAll('.reading-list-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      ReadingPage.currentId = el.dataset.id;
      ReadingPage.view = 'detail';
      ReadingPage.answers = {};
      renderReadingDetail(root);
    });
  });
}

function renderReadingDetail(root) {
  const article = ReadingPage.articles.find(a => a.id === ReadingPage.currentId);
  if (!article) { ReadingPage.view = 'list'; renderReadingList(root); return; }

  if (!ReadingPage.optionsCache || ReadingPage.optionsCache.articleId !== article.id) {
    ReadingPage.optionsCache = {
      articleId: article.id,
      options: article.questions.map(q => shuffle([q.answer, ...q.distractors]))
    };
  }

  root.innerHTML = `
    <a href="#" class="back-link" id="reading-back">← 返回讀解列表</a>
    <h2 class="page-title" style="margin-top:0;">${escapeHtml(article.title)}</h2>
    <div class="card">
      <p class="reading-text">${escapeHtml(article.text)}</p>
      <div class="reading-notes">
        📌 單字備註：${article.notes.map(n => `<b>${escapeHtml(n.term)}</b>＝${escapeHtml(n.meaning)}`).join('　／　')}
      </div>
    </div>
    <div id="reading-questions"></div>
    <div id="reading-summary"></div>
  `;

  root.querySelector('#reading-back').addEventListener('click', (e) => {
    e.preventDefault();
    ReadingPage.view = 'list';
    renderReadingList(root);
  });

  const qWrap = root.querySelector('#reading-questions');
  const letters = ['A', 'B', 'C', 'D'];

  article.questions.forEach((q, qi) => {
    const options = ReadingPage.optionsCache.options[qi];
    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <p style="font-weight:700;margin:0 0 10px;">問題 ${qi + 1}：${escapeHtml(q.q)}</p>
      <div class="option-list">
        ${options.map((opt, i) => `
          <button class="option-btn" data-qi="${qi}" data-idx="${i}">
            <span class="option-letter">${letters[i]}</span>
            <span>${escapeHtml(opt)}</span>
          </button>`).join('')}
      </div>
      <div class="q-explanation"></div>
    `;
    qWrap.appendChild(card);

    card.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (ReadingPage.answers[qi] !== undefined) return;
        const chosen = options[Number(btn.dataset.idx)];
        const isCorrect = chosen === q.answer;
        ReadingPage.answers[qi] = isCorrect;

        card.querySelectorAll('.option-btn').forEach(b => {
          b.disabled = true;
          if (b.querySelector('span:last-child').textContent === q.answer) b.classList.add('correct');
          else if (b === btn && !isCorrect) b.classList.add('wrong');
        });

        card.querySelector('.q-explanation').innerHTML = `<div class="explanation">${escapeHtml(q.explanation)}</div>`;

        checkReadingComplete(article, root);
      });
    });
  });
}

function checkReadingComplete(article, root) {
  const total = article.questions.length;
  const answeredCount = Object.keys(ReadingPage.answers).length;
  if (answeredCount < total) return;

  const correctCount = Object.values(ReadingPage.answers).filter(Boolean).length;
  const allCorrect = correctCount === total;
  if (allCorrect) Store.markReadingDone(article.id);

  const summary = root.querySelector('#reading-summary');
  summary.innerHTML = `
    <div class="card" style="text-align:center;">
      <p style="font-size:1rem;">本篇成績：<b>${correctCount} / ${total}</b> ${allCorrect ? '🎉 全對！' : ''}</p>
      <button class="btn" id="reading-redo">重做這篇</button>
    </div>
  `;
  summary.querySelector('#reading-redo').addEventListener('click', () => {
    ReadingPage.answers = {};
    ReadingPage.optionsCache = null;
    renderReadingDetail(root);
  });
}
