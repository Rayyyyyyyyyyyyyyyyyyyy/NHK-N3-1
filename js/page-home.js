async function renderHome(root) {
  const vocab = await DataStore.loadVocab();
  const grammar = await DataStore.loadGrammar();
  const reading = await DataStore.loadReading();
  const listening = await DataStore.loadListening();
  const s = Store.state;

  const vKnownCount = Object.keys(s.vKnown).length;
  const vTotal = vocab.length;
  const gCount = s.gDone.length;
  const gTotal = grammar.length;
  const rCount = s.rDone.length;
  const rTotal = reading.length;
  const lCount = s.lCorrect.length;
  const lTotal = listening.length;

  function bar(label, count, total) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="progress-row">
        <div class="progress-label"><span>${label}</span><span>${count} / ${total}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  root.innerHTML = `
    <h2 class="page-title">首頁</h2>

    <section class="card">
      <p class="card-title">整體進度</p>
      ${bar('單字', vKnownCount, vTotal)}
      ${bar('文法', gCount, gTotal)}
      ${bar('讀解', rCount, rTotal)}
      ${bar('聽力', lCount, lTotal)}
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
      setStatus('✓ 進度已還原！', 'ok');
      updateStreakDisplay();
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
