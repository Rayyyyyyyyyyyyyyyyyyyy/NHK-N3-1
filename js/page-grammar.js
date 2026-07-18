const GrammarPage = {
  data: [],
  level: null,
  queue: [],
  pointer: 0,
  options: [],
  answered: false
};

function buildGrammarQueue() {
  const total = GrammarPage.data.length;
  const done = new Set(Store.state.gDone[GrammarPage.level]);
  const unmastered = [];
  const mastered = [];
  for (let i = 0; i < total; i++) {
    if (done.has(i)) mastered.push(i);
    else unmastered.push(i);
  }
  GrammarPage.queue = shuffle(unmastered).concat(shuffle(mastered));
  GrammarPage.pointer = 0;
}

function currentGrammarOptions(item) {
  const opts = shuffle([item.answer, ...item.distractors]);
  return opts;
}

async function renderGrammar(root) {
  const level = Store.state.level;
  const data = await DataStore.loadGrammar(level);
  GrammarPage.data = data;
  GrammarPage.level = level;
  if (GrammarPage.queue.length === 0) buildGrammarQueue();

  root.innerHTML = `
    <h2 class="page-title">文法 <span style="font-size:0.85rem;color:var(--indigo);">${LEVEL_LABEL[level]}</span></h2>
    <div id="grammar-body"></div>
  `;
  renderGrammarQuestion();
}

function renderGrammarQuestion() {
  const body = document.getElementById('grammar-body');
  if (!body) return;
  const idx = GrammarPage.queue[GrammarPage.pointer];
  const item = GrammarPage.data[idx];
  GrammarPage.options = currentGrammarOptions(item);
  GrammarPage.answered = false;
  const letters = ['A', 'B', 'C', 'D'];
  const doneCount = Store.state.gDone[GrammarPage.level].length;

  const qHtml = escapeHtml(item.q).replace('＿＿', '<span class="blank">＿＿</span>');

  body.innerHTML = `
    <p class="meta-row">
      <span>第 ${GrammarPage.pointer + 1} 題 ／ ${GrammarPage.queue.length}</span>
      <span>已掌握 ${doneCount} / ${GrammarPage.data.length}</span>
    </p>
    <div class="q-card">
      <p style="font-size:1.05rem;line-height:1.9;">${qHtml}</p>
      <div class="option-list" id="grammar-options">
        ${GrammarPage.options.map((opt, i) => `
          <button class="option-btn" data-idx="${i}">
            <span class="option-letter">${letters[i]}</span>
            <span>${escapeHtml(opt)}</span>
          </button>`).join('')}
      </div>
      <div id="grammar-explanation"></div>
    </div>
  `;

  body.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (GrammarPage.answered) return;
      GrammarPage.answered = true;
      const chosen = GrammarPage.options[Number(btn.dataset.idx)];
      const isCorrect = chosen === item.answer;

      body.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = true;
        if (b.querySelector('span:last-child').textContent === item.answer) b.classList.add('correct');
        else if (b === btn && !isCorrect) b.classList.add('wrong');
      });

      if (isCorrect) Store.markGrammarCorrect(GrammarPage.level, idx);
      else Store.markGrammarWrong(GrammarPage.level, idx);

      const exp = body.querySelector('#grammar-explanation');
      exp.innerHTML = `
        <div class="explanation">${escapeHtml(item.explanation)}</div>
        <button class="btn btn-block" id="grammar-next" style="margin-top:12px;">下一題</button>
      `;
      exp.querySelector('#grammar-next').addEventListener('click', () => {
        GrammarPage.pointer++;
        if (GrammarPage.pointer >= GrammarPage.queue.length) {
          buildGrammarQueue();
        }
        renderGrammarQuestion();
      });

      body.querySelector('.meta-row span:last-child').textContent = `已掌握 ${Store.state.gDone[GrammarPage.level].length} / ${GrammarPage.data.length}`;
    });
  });
}
