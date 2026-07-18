const PAGES = {
  home: renderHome,
  vocab: renderVocab,
  grammar: renderGrammar,
  reading: renderReading,
  listening: renderListening
};

let currentPage = 'home';

function updateStreakDisplay() {
  const el = document.getElementById('streak-count');
  if (el) el.textContent = Store.state.streak;
}

function updateNavActive(page) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
}

function updateLevelPills() {
  document.querySelectorAll('.level-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === Store.state.level);
  });
}

function resetPageStateForLevelChange() {
  if (typeof VocabPage !== 'undefined') {
    VocabPage.fcDeck = [];
    VocabPage.fcIndex = 0;
    VocabPage.fcFlipped = false;
    VocabPage.quizCurrent = null;
    VocabPage.quizStreak = 0;
  }
  if (typeof GrammarPage !== 'undefined') {
    GrammarPage.queue = [];
    GrammarPage.pointer = 0;
  }
  if (typeof ReadingPage !== 'undefined') {
    ReadingPage.view = 'list';
    ReadingPage.currentId = null;
    ReadingPage.answers = {};
    ReadingPage.optionsCache = null;
  }
  if (typeof ListeningPage !== 'undefined') {
    ListeningPage.answers = {};
    ListeningPage.optionsCache = {};
  }
}

async function navigate(page) {
  if (!PAGES[page]) page = 'home';
  if (currentPage === 'listening' && page !== 'listening') {
    stopListeningTTS();
  }
  currentPage = page;
  updateNavActive(page);
  const root = document.getElementById('app');
  root.innerHTML = '<p style="text-align:center;color:#8892a0;padding:40px 0;">載入中…</p>';
  try {
    await PAGES[page](root);
  } catch (e) {
    root.innerHTML = `<div class="card"><p style="color:var(--vermilion);">頁面載入失敗，請重新整理再試一次。</p></div>`;
  }
  window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
  Store.load();
  Store.touchStreak();
  updateStreakDisplay();
  updateLevelPills();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  document.querySelectorAll('.level-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.level === Store.state.level) return;
      if (currentPage === 'listening') stopListeningTTS();
      Store.setLevel(btn.dataset.level);
      updateLevelPills();
      resetPageStateForLevelChange();
      navigate(currentPage);
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentPage === 'listening') {
      stopListeningTTS();
    }
  });

  navigate('home');
});
