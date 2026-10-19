<script setup lang="ts">
import { computed } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import { useStudySession } from '../composables/useStudySession'
import ListeningExercise from '../components/ListeningExercise.vue'
import StudyStatus from '../components/StudyStatus.vue'
import BankStatus from '../components/BankStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('listening', level)
const { daily, invalid, noTargets, selected, missing, round } = useStudySession('listening', items)
const visibleItems = computed(() => (daily.value ? selected.value : items.value))
</script>
<template>
  <h2 class="page-title">
    聽力 <span class="text-sm text-indigo">{{ level.toUpperCase() }}</span>
  </h2>
  <p class="meta-row">
    <span
      >已作答 {{ store.session.state.lDone[level].length }} ／ {{ items.length }}　答對
      {{ store.session.state.lCorrect[level].length }}</span
    >
  </p>
  <StudyStatus
    v-if="!loading && !failed"
    :daily="daily"
    :no-targets="noTargets"
    :invalid="invalid"
    :missing="missing"
    :empty="!visibleItems.length"
  />
  <BankStatus
    :loading="loading"
    :failed="failed"
    :empty="!items.length"
    empty-text="此等級目前尚無聽力題。"
    @retry="retry"
  />
  <div class="listening-grid">
    <div
      v-for="(item, i) in invalid ? [] : visibleItems"
      :key="`${round}:${item.id}`"
      class="q-card"
    >
      <p class="meta-row">第 {{ i + 1 }} 題</p>
      <ListeningExercise :item="item" :level="level" :index="i" />
    </div>
  </div>
  <section class="card listening-resources">
    <p class="card-title">影片課程</p>
    <p class="text-sm text-subtle mt-0 mb-2.5">日本語の森 — N2文法課程播放清單</p>
    <div class="video-embed-wrap">
      <iframe
        src="https://www.youtube.com/embed/videoseries?list=PLINFE8v4DOhtU2L8_mKQzjMuZBHWPFp9S"
        title="日本語の森 N2文法課程"
        allow="
          accelerometer;
          autoplay;
          clipboard-write;
          encrypted-media;
          gyroscope;
          picture-in-picture;
        "
        allowfullscreen
        loading="lazy"
      ></iframe>
    </div>
    <a
      class="btn btn-outline btn-block mt-2.5"
      target="_blank"
      rel="noopener"
      href="https://www.youtube.com/channel/UCVx6RFaEAg46xfAsD2zz16w"
      >若影片無法播放，前往「日本語の森」頻道</a
    >
  </section>
</template>
