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

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentPage === 'listening') {
      stopListeningTTS();
    }
  });

  navigate('home');
});
