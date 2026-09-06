// 每個等級進階到下一級的建議門檻：該級文法全部掌握，且單字掌握達標
const ADVANCE_RULES = {
  n5: { next: 'n4', vocabGoal: 150 },
  n4: { next: 'n3', vocabGoal: 250 },
  n3: { next: 'n2', vocabGoal: 300 },
  n2: { next: 'n1', vocabGoal: 600 }
};

async function renderHome(root) {
  const levelData = {};
  await Promise.all(LEVELS.map(async lv => {
    const [vocab, grammar, reading, listening] = await Promise.all([
      DataStore.loadVocab(lv),
      DataStore.loadGrammar(lv),
      DataStore.loadReading(lv),
      DataStore.loadListening(lv)
    ]);
    levelData[lv] = { vocab, grammar, reading, listening };
  }));

  const s = Store.state;

  function bar(label, count, total) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="progress-row">
        <div class="progress-label"><span>${label}</span><span>${count} / ${total}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  function levelProgressBlock(level) {
    const d = levelData[level];
    const isCurrent = level === s.level;
    return `
      <div class="level-progress-block">
        <p class="level-progress-heading">
          ${LEVEL_LABEL[level]}${isCurrent ? '<span class="level-current-badge">修煉中</span>' : ''}
        </p>
        ${bar('單字', Object.keys(s.vKnown[level]).length, d.vocab.length)}
        ${bar('文法', s.gDone[level].length, d.grammar.length)}
        ${bar('讀解', s.rDone[level].length, d.reading.length)}
        ${bar('聽力', s.lCorrect[level].length, d.listening.length)}
      </div>`;
  }

  function advanceStatus(level) {
    const rule = ADVANCE_RULES[level];
    if (!rule) return null;
    const gDone = s.gDone[level].length;
    const gTotal = levelData[level].grammar.length;
    const vKnown = Object.keys(s.vKnown[level]).length;
    return {
      next: rule.next,
      ready: gDone >= gTotal && vKnown >= rule.vocabGoal,
      gGap: Math.max(0, gTotal - gDone),
      vGap: Math.max(0, rule.vocabGoal - vKnown)
    };
  }

  function advanceBlock(level) {
    const st = advanceStatus(level);
    if (!st) return '';
    const from = LEVEL_LABEL[level];
    const to = LEVEL_LABEL[st.next];
    if (st.ready) {
      return `
        <div class="advance-block advance-ready">
          <p>🎉 ${from} 基礎穩固，可以進入 ${to} 修煉！</p>
          <button class="btn btn-block advance-switch-btn" data-level="${st.next}">切換到 ${to}</button>
        </div>`;
    }
    const gaps = [];
    if (st.gGap > 0) gaps.push(`文法還差 ${st.gGap} 題`);
    if (st.vGap > 0) gaps.push(`單字還差 ${st.vGap} 字`);
    return `
      <div class="advance-block">
        <p>${from} 進階門檻：${gaps.join('、')}</p>
      </div>`;
  }

  // 只顯示「目前等級」與「已達標可進階」的建議，避免五個等級全列出來太雜
  const advanceLevels = LEVELS.filter(lv => {
    const st = advanceStatus(lv);
    if (!st) return false;
    return lv === s.level || st.ready;
  });
  const advanceHtml = advanceLevels.length
    ? advanceLevels.map(advanceBlock).join('')
    : `<div class="advance-block"><p>目前在 ${LEVEL_LABEL[s.level]}，已是最高等級，繼續保持！</p></div>`;

  root.innerHTML = `
    <h2 class="page-title">首頁</h2>

    <section class="card">
      <p class="card-title">整體進度</p>
      ${LEVELS.map(levelProgressBlock).join('')}
    </section>

    <section class="card">
      <p class="card-title">進階建議</p>
      ${advanceHtml}
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
      <p class="route-step"><b>N5・N4 打底：</b>把該級文法刷到全綠，單字每天 10 個新字，先建立語感</p>
      <p class="route-step"><b>第 1～3 個月：</b>文法 30 題刷到全綠、單字每天 10 個新字</p>
      <p class="route-step"><b>第 4～6 個月：</b>每天一篇 NHK 新聞，開始《新完全マスター読解 N2》</p>
      <p class="route-step"><b>第 7 個月起：</b>做 N2 模擬題，穩定 7 成後混入 N1 教材</p>
      <p class="route-step" style="margin-bottom:0;"><b>聽力日常：</b>日劇・「日本語の森」，先無字幕再開日文字幕</p>
    </section>
  `;

  root.querySelectorAll('.advance-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentPage === 'listening') stopListeningTTS();
      Store.setLevel(btn.dataset.level);
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
