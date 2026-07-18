const ListeningPage = {
  items: [],
  speed: 0.9,
  answers: {},
  optionsCache: {},
  ttsSupported: typeof window !== 'undefined' && 'speechSynthesis' in window
};

const YT_PLAYLIST_ID = 'PLINFE8v4DOhtU2L8_mKQzjMuZBHWPFp9S';
const NIHONGONOMORI_CHANNEL_URL = 'https://www.youtube.com/channel/UCVx6RFaEAg46xfAsD2zz16w';

function stopListeningTTS() {
  if (ListeningPage.ttsSupported) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
}

function pickJapaneseVoice() {
  if (!ListeningPage.ttsSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'ja-JP') || voices.find(v => v.lang && v.lang.startsWith('ja')) || null;
}

function speakText(text) {
  if (!ListeningPage.ttsSupported) return;
  stopListeningTTS();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = ListeningPage.speed;
  const voice = pickJapaneseVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

async function renderListening(root) {
  const items = await DataStore.loadListening();
  ListeningPage.items = items;

  root.innerHTML = `
    <h2 class="page-title">聽力</h2>
    <p class="meta-row"><span>已作答 ${Store.state.lDone.length} ／ ${items.length}　答對 ${Store.state.lCorrect.length}</span></p>
    <div id="listening-list"></div>

    <section class="card">
      <p class="card-title">影片課程</p>
      <p style="font-size:0.82rem;color:#5b6470;margin:0 0 10px;">日本語の森 — N2文法課程播放清單</p>
      <div class="video-embed-wrap">
        <iframe src="https://www.youtube.com/embed/videoseries?list=${YT_PLAYLIST_ID}" title="日本語の森 N2文法課程" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <a class="btn btn-outline btn-block" style="margin-top:10px;" target="_blank" rel="noopener" href="${NIHONGONOMORI_CHANNEL_URL}">若影片無法播放，前往「日本語の森」頻道</a>
    </section>
  `;

  if (ListeningPage.ttsSupported) {
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }

  const listWrap = root.querySelector('#listening-list');
  items.forEach((item, idx) => {
    if (!ListeningPage.optionsCache[item.id]) {
      ListeningPage.optionsCache[item.id] = shuffle([item.answer, ...item.distractors]);
    }
    const options = ListeningPage.optionsCache[item.id];
    const letters = ['A', 'B', 'C', 'D'];
    const answered = ListeningPage.answers[item.id] !== undefined;

    const card = document.createElement('div');
    card.className = 'q-card';
    card.innerHTML = `
      <p class="meta-row"><span>第 ${idx + 1} 題</span></p>
      ${ListeningPage.ttsSupported ? `
        <button class="play-btn" data-id="${item.id}">▶</button>
        <div class="speed-row">
          <button class="speed-btn" data-speed="0.75">0.75x</button>
          <button class="speed-btn active" data-speed="0.9">0.9x</button>
          <button class="speed-btn" data-speed="1.1">1.1x</button>
        </div>
      ` : `<p class="tts-warning">此瀏覽器不支援語音合成，已直接顯示原文</p><p class="reading-text">${escapeHtml(item.script)}</p>`}
      <p style="font-weight:700;margin:16px 0 0;">${escapeHtml(item.q)}</p>
      <div class="option-list">
        ${options.map((opt, i) => `
          <button class="option-btn" data-qid="${item.id}" data-idx="${i}" ${answered ? 'disabled' : ''}>
            <span class="option-letter">${letters[i]}</span>
            <span>${escapeHtml(opt)}</span>
          </button>`).join('')}
      </div>
      <div class="l-result"></div>
    `;
    listWrap.appendChild(card);

    if (ListeningPage.ttsSupported) {
      const playBtn = card.querySelector('.play-btn');
      playBtn.addEventListener('click', () => speakText(item.script));
      card.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          ListeningPage.speed = Number(btn.dataset.speed);
        });
      });
    }

    if (answered) {
      showListeningResult(card, item, options, ListeningPage.answers[item.id]);
    }

    card.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (ListeningPage.answers[item.id] !== undefined) return;
        const idxChosen = Number(btn.dataset.idx);
        const chosen = options[idxChosen];
        const isCorrect = chosen === item.answer;
        ListeningPage.answers[item.id] = isCorrect;
        Store.markListeningAnswered(item.id, isCorrect);

        card.querySelectorAll('.option-btn').forEach(b => {
          b.disabled = true;
          if (b.querySelector('span:last-child').textContent === item.answer) b.classList.add('correct');
          else if (Number(b.dataset.idx) === idxChosen && !isCorrect) b.classList.add('wrong');
        });

        showListeningResult(card, item, options, isCorrect);
        root.querySelector('.meta-row').innerHTML = `<span>已作答 ${Store.state.lDone.length} ／ ${items.length}　答對 ${Store.state.lCorrect.length}</span>`;
      });
    });
  });
}

function showListeningResult(card, item, options, isCorrect) {
  const box = card.querySelector('.l-result');
  if (box.dataset.rendered === '1') return;
  box.dataset.rendered = '1';
  box.innerHTML = `
    <div class="transcript-box"><b>逐字稿：</b>${escapeHtml(item.script)}</div>
    <div class="explanation">${escapeHtml(item.explanation)}</div>
  `;
}
