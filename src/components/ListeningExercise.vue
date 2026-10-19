<script setup lang="ts">
import { computed } from 'vue'
import type { Listening } from '../domain/questions'
import type { Level } from '../domain/progress/state'
import { useJapaneseSpeech } from '../composables/useJapaneseSpeech'
import LearningChoice from './LearningChoice.vue'
const props = defineProps<{ item: Listening; level: Level; index?: number }>()
const { speech, speed, state, progress, indeterminate, isActive, toggle, stop } =
  useJapaneseSpeech()
const statusText = computed(
  () =>
    ({
      idle: '準備播放',
      loading: '準備播放中…',
      playing: '播放中',
      paused: '已暫停',
      ended: '播放完成',
      stopped: '已停止',
      error: '播放失敗',
    })[state.value],
)
const playLabel = computed(
  () =>
    `${state.value === 'playing' ? '暫停' : state.value === 'paused' ? '繼續' : '播放'}第 ${(props.index ?? 0) + 1} 題`,
)
</script>
<template>
  <div v-if="speech.isSupported.value" class="speech-player">
    <div class="speech-controls">
      <button
        class="play-btn"
        :aria-label="playLabel"
        :disabled="state === 'loading'"
        @click="toggle(item.script)"
      >
        {{ state === 'playing' ? 'Ⅱ' : '▶' }}
      </button>
      <button
        class="speech-stop"
        :disabled="!isActive"
        :aria-label="`停止第 ${(index ?? 0) + 1} 題`"
        @click="stop"
      >
        停止
      </button>
    </div>
    <div
      class="speech-progress"
      role="progressbar"
      aria-label="朗讀進度"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="indeterminate ? undefined : progress"
      :aria-valuetext="indeterminate ? statusText : `${statusText} ${progress}%`"
    >
      <div
        class="speech-progress-fill"
        :class="{ 'is-indeterminate': indeterminate, 'is-paused': state === 'paused' }"
        :style="indeterminate ? undefined : { width: `${progress}%` }"
      ></div>
    </div>
    <div class="speech-progress-caption">
      <span role="status">{{ statusText }}</span
      ><span v-if="!indeterminate">{{ progress }}%</span>
    </div>
    <div class="speed-row" role="group" aria-label="朗讀語速">
      <button
        v-for="rate in [0.75, 0.9, 1.1]"
        :key="rate"
        class="speed-btn"
        :class="{ active: speed === rate }"
        :aria-pressed="speed === rate"
        :disabled="isActive"
        @click="speed = rate"
      >
        {{ rate }}x
      </button>
    </div>
    <div v-if="state === 'error'" role="alert">
      <p class="tts-warning">語音播放失敗，可重新播放；已顯示原文。</p>
      <p class="reading-text">{{ item.script }}</p>
    </div>
  </div>
  <template v-else
    ><p class="tts-warning">此瀏覽器不支援語音合成，已直接顯示原文</p>
    <p class="reading-text">{{ item.script }}</p></template
  >
  <p class="listening-prompt">{{ item.q }}</p>
  <LearningChoice
    :item-ref="{ level, kind: 'listening', id: item.id }"
    mode="listening"
    :answer="item.answer"
    :distractors="item.distractors"
    :explanation="item.explanation"
    ><template #answered
      ><div class="transcript-box"><b>逐字稿：</b>{{ item.script }}</div></template
    ></LearningChoice
  >
</template>
