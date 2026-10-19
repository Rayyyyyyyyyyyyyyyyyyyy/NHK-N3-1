<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNow } from '@vueuse/core'
import { localDate } from './domain/learning/calendar'
import { useProgressStore } from './stores/progress'
import { LEVELS } from './domain/progress/state'
import NavIcon from './components/NavIcon.vue'
const now = useNow({ interval: 1000 }),
  progress = useProgressStore(),
  route = useRoute()
const links = [
  { path: '/', icon: 'home', label: '首頁' },
  { path: '/vocab', icon: 'vocab', label: '單字' },
  { path: '/grammar', icon: 'grammar', label: '文法' },
  { path: '/reading', icon: 'reading', label: '讀解' },
  { path: '/listening', icon: 'listening', label: '聽力' },
] as const
const pending = computed(
  () =>
    Object.values(progress.session.state.mistakes).filter(
      (m) => m.pending && m.ref.level === progress.session.state.level,
    ).length,
)
</script>
<template>
  <a href="#main-content" class="skip-link">跳到學習內容</a>
  <aside class="desktop-sidebar" aria-label="桌面學習選單">
    <RouterLink to="/" class="sidebar-brand"
      ><span class="brand-seal" aria-hidden="true">道</span
      ><span><strong>日本語道場</strong><small>NIHONGO DOJO</small></span></RouterLink
    >
    <p class="sidebar-section-label">學習空間</p>
    <nav class="sidebar-nav" aria-label="桌面主要導覽">
      <RouterLink
        v-for="link in links"
        :key="link.path"
        :to="link.path"
        exact-active-class="active"
        class="sidebar-link"
        ><NavIcon :name="link.icon" /><span>{{ link.label }}</span
        ><span v-if="link.path === '/'" class="nav-home-dot" aria-hidden="true"></span
      ></RouterLink>
    </nav>
    <div class="sidebar-divider"></div>
    <p class="sidebar-section-label">溫故知新</p>
    <RouterLink to="/review" class="sidebar-link" exact-active-class="active"
      ><NavIcon name="review" /><span>錯題複習</span
      ><span class="nav-count">{{ pending }}</span></RouterLink
    >
    <div class="sidebar-note">
      <span class="sidebar-note-mark" aria-hidden="true">日々</span>
      <p>每天一點，累積成進步。</p>
      <small>學習進度保存在此裝置</small>
    </div>
  </aside>
  <div class="app-workspace">
    <header class="dojo-banner">
      <div class="banner-kanji" aria-hidden="true">道</div>
      <div class="banner-content">
        <div class="mobile-brand">
          <p class="banner-eyebrow">Nihongo Dojo</p>
          <h1 class="banner-title">日本語道場 <span>— N5 → N1</span></h1>
        </div>
        <div class="level-setting">
          <p class="desktop-setting-label">目前修煉等級</p>
          <div class="level-pills" role="group" aria-label="修煉等級">
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
        <p class="banner-streak">
          <span class="streak-symbol" aria-hidden="true">日</span
          ><span class="streak-copy"
            >連續學習 <strong>{{ progress.session.state.streak }}</strong> 天</span
          >
        </p>
      </div>
    </header>
    <main
      id="main-content"
      class="app-main"
      tabindex="-1"
      :class="
        route.path === '/' ? 'app-main-home' : `app-main-study app-main-${route.path.slice(1)}`
      "
    >
      <p v-if="!progress.storageAvailable" class="status-msg err storage-notice" role="status">
        {{ progress.storageError || '瀏覽器無法保存進度，目前仍可練習；請匯出進度碼備份。' }}
        <RouterLink v-if="route.path !== '/'" to="/" class="storage-recovery-link"
          >前往首頁匯出備份 →</RouterLink
        >
      </p>
      <div
        class="page-content"
        :class="{ 'page-content-focused': ['/vocab', '/grammar', '/review'].includes(route.path) }"
      >
        <RouterView v-slot="{ Component, route: currentRoute }"
          ><component
            :is="Component"
            :key="
              currentRoute.path === '/'
                ? '/'
                : `${currentRoute.fullPath}:${progress.session.state.level}:${localDate(now)}`
            "
        /></RouterView>
      </div>
    </main>
    <footer class="site-footer">
      單字資料：Jonathan Waller (tanos.co.uk) CC-BY／漢字資料：kanjiapi.dev<br />N5・N4
      文法點清單：Sigmabond01/jlpt-grammar-api (MIT)
    </footer>
  </div>
  <nav class="bottom-nav" aria-label="主要導覽">
    <RouterLink
      v-for="link in links"
      :key="link.path"
      :to="link.path"
      class="nav-btn"
      exact-active-class="active"
      ><NavIcon :name="link.icon" /><span class="nav-label">{{ link.label }}</span></RouterLink
    >
  </nav>
</template>
