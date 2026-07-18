async function renderHome(root) {
  const [vocabN3, vocabN2, vocabN1] = await Promise.all([
    DataStore.loadVocab('n3'), DataStore.loadVocab('n2'), DataStore.loadVocab('n1')
  ]);
  const [grammarN3, grammarN2, grammarN1] = await Promise.all([
    DataStore.loadGrammar('n3'), DataStore.loadGrammar('n2'), DataStore.loadGrammar('n1')
  ]);
  const [readingN3, readingN2, readingN1] = await Promise.all([
    DataStore.loadReading('n3'), DataStore.loadReading('n2'), DataStore.loadReading('n1')
  ]);
  const [listeningN3, listeningN2, listeningN1] = await Promise.all([
    DataStore.loadListening('n3'), DataStore.loadListening('n2'), DataStore.loadListening('n1')
  ]);

  const s = Store.state;

  const levels = {
    n3: { vocab: vocabN3, grammar: grammarN3, reading: readingN3, listening: listeningN3 },
    n2: { vocab: vocabN2, grammar: grammarN2, reading: readingN2, listening: listeningN2 },
    n1: { vocab: vocabN1, grammar: grammarN1, reading: readingN1, listening: listeningN1 }
  };

  function bar(label, count, total) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="progress-row">
        <div class="progress-label"><span>${label}</span><span>${count} / ${total}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  function levelProgressBlock(level) {
    const d = levels[level];
    const vKnownCount = Object.keys(s.vKnown[level]).length;
    const gCount = s.gDone[level].length;
    const rCount = s.rDone[level].length;
    const lCount = s.lCorrect[level].length;
    return `
      <div class="level-progress-block">
        <p class="level-progress-heading">${LEVEL_LABEL[level]}</p>
        ${bar('單字', vKnownCount, d.vocab.length)}
        ${bar('文法', gCount, d.grammar.length)}
        ${bar('讀解', rCount, d.reading.length)}
        ${bar('聽力', lCount, d.listening.length)}
      </div>`;
  }

  // advancement suggestion: N3 -> N2
  const gDoneN3 = s.gDone.n3.length;
  const gTotalN3 = grammarN3.length;
  const vKnownN3 = Object.keys(s.vKnown.n3).length;
  const VOCAB_GOAL_N3 = 300;
  const n3Ready = gDoneN3 >= gTotalN3 && vKnownN3 >= VOCAB_GOAL_N3;

  // advancement suggestion: N2 -> N1
  const gDoneN2 = s.gDone.n2.length;
  const gTotalN2 = grammarN2.length;
  const vKnownN2 = Object.keys(s.vKnown.n2).length;
  const VOCAB_GOAL_N2 = 600;
  const n2Ready = gDoneN2 >= gTotalN2 && vKnownN2 >= VOCAB_GOAL_N2;

  function advanceCard(fromLabel, toLabel, toLevel, ready, gDone, gTotal, vKnown, vGoal) {
    if (ready) {
      return `
        <div class="advance-block advance-ready">
          <p>🎉 ${fromLabel} 基礎穩固，可以進入 ${toLabel} 修煉！</p>
          <button class="btn btn-block advance-switch-btn" data-level="${toLevel}">切換到 ${toLabel}</button>
        </div>`;
    }
    const gGap = Math.max(0, gTotal - gDone);
    const vGap = Math.max(0, vGoal - vKnown);
    const gaps = [];
    if (gGap > 0) gaps.push(`文法還差 ${gGap} 題`);
    if (vGap > 0) gaps.push(`單字還差 ${vGap} 字`);
    return `
      <div class="advance-block">
        <p>${fromLabel} 進階門檻：${gaps.join('、')}</p>
      </div>`;
  }

  root.innerHTML = `
    <h2 class="page-title">首頁</h2>

    <section class="card">
      <p class="card-title">整體進度</p>
      ${levelProgressBlock('n3')}
      ${levelProgressBlock('n2')}
      ${levelProgressBlock('n1')}
    </section>

    <section class="card">
      <p class="card-title">進階建議</p>
      ${advanceCard('N3', 'N2', 'n2', n3Ready, gDoneN3, gTotalN3, vKnownN3, VOCAB_GOAL_N3)}
      ${advanceCard('N2', 'N1', 'n1', n2Ready, gDoneN2, gTotalN2, vKnownN2, VOCAB_GOAL_N2)}
    </section>

    <section class="card">
      <p class="card-title">今日菜單</p>
      <ul class="menu-list">
        <li>① 單字 10 分鐘：新字 10 張＋複習不熟的</li>
        <li>② 文法 10 分鐘：做 5 題並看解析</li>
        <li>③ 擇一深入：讀解一篇或聽力 3 題</li>
        <li>④ 有餘力：錯題重做</li>
      </ul>
    </section>

    <section class="card">
      <p class="card-title">進度備份</p>
      <div class="btn-row">
        <button class="btn btn-outline" id="btn-export">匯出進度碼</button>
        <button class="btn btn-outline" id="btn-import">匯入進度碼</button>
      </div>
      <textarea class="progress-code" id="progress-code" style="margin-top:10px;" placeholder="進度碼會顯示在這裡，或貼上要匯入的進度碼"></textarea>
      <button class="btn btn-block" id="btn-do-import" style="margin-top:8px;">還原進度</button>
      <p class="status-msg" id="progress-status"></p>
    </section>

    <section class="card">
      <p class="card-title">備考路線</p>
      <p class="route-step"><b>第 1～3 個月：</b>文法 30 題刷到全綠、單字每天 10 個新字</p>
      <p class="route-step"><b>第 4～6 個月：</b>每天一篇 NHK 新聞，開始《新完全マスター読解 N2》</p>
      <p class="route-step"><b>第 7 個月起：</b>做 N2 模擬題，穩定 7 成後混入 N1 教材</p>
      <p class="route-step" style="margin-bottom:0;"><b>聽力日常：</b>日劇・「日本語の森」，先無字幕再開日文字幕</p>
    </section>
  `;

  root.querySelectorAll('.advance-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetLevel = btn.dataset.level;
      if (currentPage === 'listening') stopListeningTTS();
      Store.setLevel(targetLevel);
      updateLevelPills();
      resetPageStateForLevelChange();
      navigate('home');
    });
  });

  root.querySelector('#btn-export').addEventListener('click', () => {
    const code = Store.exportCode();
    const ta = root.querySelector('#progress-code');
    ta.value = code;
    ta.focus();
    ta.select();
    setStatus('已產生進度碼，可複製保存', 'ok');
  });

  root.querySelector('#btn-import').addEventListener('click', () => {
    const ta = root.querySelector('#progress-code');
    ta.value = '';
    ta.placeholder = '請貼上進度碼，然後按「還原進度」';
    ta.focus();
  });

  root.querySelector('#btn-do-import').addEventListener('click', async () => {
    const ta = root.querySelector('#progress-code');
    const code = ta.value.trim();
    if (!code) {
      setStatus('請先貼上進度碼', 'err');
      return;
    }
    try {
      Store.importCode(code);
      updateStreakDisplay();
      updateLevelPills();
      await renderHome(root);
      root.querySelector('#progress-status').textContent = '✓ 進度已還原！';
      root.querySelector('#progress-status').className = 'status-msg ok';
    } catch (e) {
      setStatus('匯入失敗，請確認進度碼是否正確', 'err');
    }
  });

  function setStatus(msg, kind) {
    const el = root.querySelector('#progress-status');
    el.textContent = msg;
    el.className = 'status-msg ' + (kind === 'ok' ? 'ok' : 'err');
  }
}
