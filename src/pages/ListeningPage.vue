<script setup lang="ts">
import { ref, onBeforeUnmount, nextTick } from 'vue'
import { useSpeechSynthesis, useEventListener } from '@vueuse/core'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import ChoiceQuestion from '../components/ChoiceQuestion.vue'
import BankStatus from '../components/BankStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('listening', level)
const text = ref(''),
  speed = ref(0.9),
  voice = ref<SpeechSynthesisVoice>()
const speech = useSpeechSynthesis(text, {
  lang: 'ja-JP',
  rate: speed,
  get voice() {
    return voice.value
  },
})
function chooseVoice() {
  if (speech.isSupported.value)
    voice.value =
      window.speechSynthesis.getVoices().find((v) => v.lang === 'ja-JP') ??
      window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja'))
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window)
  useEventListener(window.speechSynthesis, 'voiceschanged', chooseVoice)
function stop() {
  if (speech.isSupported.value)
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* Browser may expose an unavailable speech service. */
    }
}
async function play(script: string) {
  stop()
  chooseVoice()
  text.value = script
  await nextTick()
  speech.speak()
}
useEventListener(document, 'visibilitychange', () => {
  if (document.hidden) stop()
})
onBeforeUnmount(stop)
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
  <BankStatus
    :loading="loading"
    :failed="failed"
    :empty="!items.length"
    empty-text="此等級目前尚無聽力題。"
    @retry="retry"
  />
  <div v-for="(item, i) in items" :key="item.id" class="q-card">
    <p class="meta-row">
      <span>第 {{ i + 1 }} 題</span>
    </p>
    <template v-if="speech.isSupported.value"
      ><button class="play-btn" :aria-label="`播放第 ${i + 1} 題`" @click="play(item.script)">
        ▶
      </button>
      <div class="speed-row">
        <button
          v-for="rate in [0.75, 0.9, 1.1]"
          :key="rate"
          class="speed-btn"
          :class="{ active: speed === rate }"
          :aria-pressed="speed === rate"
          @click="speed = rate"
        >
          {{ rate }}x
        </button>
      </div></template
    ><template v-else
      ><p class="tts-warning">此瀏覽器不支援語音合成，已直接顯示原文</p>
      <p class="reading-text">{{ item.script }}</p></template
    >
    <p class="font-bold mt-4 mb-0">{{ item.q }}</p>
    <ChoiceQuestion
      :answer="item.answer"
      :distractors="item.distractors"
      :explanation="item.explanation"
      @answer="store.markListening(level, item.id, $event)"
      ><template #answered
        ><div class="transcript-box"><b>逐字稿：</b>{{ item.script }}</div></template
      ></ChoiceQuestion
    >
  </div>
  <section class="card">
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
