<script setup lang="ts">
import { ref } from 'vue'
import type { Vocab } from '../domain/questions'
import type { Level } from '../domain/progress/state'
import { newAttemptId } from '../domain/learning/types'
import { useProgressStore } from '../stores/progress'
import { lookupKanji } from '../services/kanji'
const props = defineProps<{ item: Vocab; level: Level }>(),
  emit = defineEmits<{ answer: [correct: boolean] }>()
const store = useProgressStore(),
  flipped = ref(false),
  rated = ref(false),
  detail = ref(''),
  attemptId = newAttemptId()
let sequence = 0
function rate(correct: boolean) {
  if (!flipped.value || rated.value) return
  rated.value = true
  store.recordLearning({
    attemptId,
    ref: { level: props.level, kind: 'vocab', id: props.item.w },
    mode: 'flashcard',
    correct,
  })
  emit('answer', correct)
}
async function lookup(char: string) {
  const token = ++sequence
  detail.value = '查詢中…'
  try {
    const k = await lookupKanji(char)
    if (token !== sequence) return
    detail.value = `${char}（JLPT ${k.jlpt ? 'N' + k.jlpt : '未標示'}）\n音讀：${k.on_readings.join('、') || '無'}\n訓讀：${k.kun_readings.join('、') || '無'}\n字義：${k.meanings.join('、') || '無'}`
  } catch {
    if (token === sequence) detail.value = '查詢失敗，稍後再試'
  }
}
</script>
<template>
  <div
    class="flashcard"
    tabindex="0"
    aria-label="點卡片翻面"
    @click="flipped = !flipped"
    @keydown.enter.self="flipped = !flipped"
    @keydown.space.prevent.self="flipped = !flipped"
  >
    <template v-if="flipped"
      ><div class="fc-reading">{{ item.r }}</div>
      <div class="fc-front-word text-3xl">{{ item.w }}</div>
      <div class="fc-zh">{{ item.zh }}</div>
      <div class="fc-en">{{ item.en }}</div>
      <div class="kanji-chip-row">
        <button
          v-for="char in [...new Set(item.w.match(/[一-鿿㐀-䶿]/g) ?? [])]"
          :key="char"
          class="kanji-chip"
          @click.stop="lookup(char)"
        >
          {{ char }}
        </button>
      </div>
      <div v-if="detail" class="kanji-detail whitespace-pre-line" role="status">
        {{ detail }}
      </div></template
    >
    <template v-else
      ><div class="fc-front-word">{{ item.w }}</div>
      <div class="fc-hint">點卡片看讀音與釋義</div></template
    >
  </div>
  <div v-if="flipped" class="btn-row mt-3.5">
    <button
      class="btn bg-white text-vermilion border-vermilion"
      :disabled="rated"
      @click="rate(false)"
    >
      還不熟</button
    ><button class="btn bg-green border-green" :disabled="rated" @click="rate(true)">記住了</button>
  </div>
</template>
