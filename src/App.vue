<script setup lang="ts">
import { useProgressStore } from './stores/progress'
import { LEVELS } from './domain/progress/state'
const progress = useProgressStore()
const links = [
  ['/', '🏠', '首頁'],
  ['/vocab', '📇', '單字'],
  ['/grammar', '✍️', '文法'],
  ['/reading', '📖', '讀解'],
  ['/listening', '🎧', '聽力'],
]
</script>
<template>
  <header class="dojo-banner">
    <div class="banner-kanji">道</div>
    <div class="banner-content">
      <p class="banner-eyebrow">Nihongo Dojo</p>
      <h1 class="banner-title">日本語道場 — N5 → N1</h1>
      <p class="banner-streak">
        連續學習 <span>{{ progress.session.state.streak }}</span> 天
      </p>
      <div class="level-pills">
        <button
          v-for="level in LEVELS"
          :key="level"
          class="level-pill"
          :class="{ active: progress.session.state.level === level }"
          :aria-pressed="progress.session.state.level === level"
          @click="progress.setLevel(level)"
        >
          {{ level.toUpperCase() }}
        </button>
      </div>
    </div>
  </header>
  <main class="app-main">
    <p v-if="!progress.storageAvailable" class="status-msg err" role="status">
      瀏覽器無法保存進度，目前仍可練習；請匯出進度碼備份。
    </p>
    <RouterView v-slot="{ Component, route }"
      ><component
        :is="Component"
        :key="route.path === '/' ? '/' : `${route.path}:${progress.session.state.level}`"
    /></RouterView>
  </main>
  <footer class="site-footer">
    單字資料：Jonathan Waller (tanos.co.uk) CC-BY／漢字資料：kanjiapi.dev<br />N5・N4
    文法點清單：Sigmabond01/jlpt-grammar-api (MIT)
  </footer>
  <nav class="bottom-nav" aria-label="主要導覽">
    <RouterLink
      v-for="[path, icon, label] in links"
      :key="path"
      :to="path"
      class="nav-btn"
      exact-active-class="active"
      ><span class="nav-icon">{{ icon }}</span
      ><span class="nav-label">{{ label }}</span></RouterLink
    >
  </nav>
</template>
