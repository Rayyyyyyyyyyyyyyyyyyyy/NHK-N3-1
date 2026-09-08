<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import { drawDeck, quizFor, type Vocab } from '../domain/questions'
import { lookupKanji } from '../services/kanji'
import ChoiceQuestion from '../components/ChoiceQuestion.vue'
import BankStatus from '../components/BankStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('vocab', level)
const mode = ref('flashcard'),
  deck = ref<Vocab[]>([]),
  index = ref(0),
  flipped = ref(false),
  streak = ref(0),
  quiz = ref<ReturnType<typeof quizFor>>(),
  quizId = ref(0),
  detail = ref('')
const current = computed(() => deck.value[index.value])
function draw() {
  deck.value = drawDeck(
    items.value,
    store.session.state.vKnown[level],
    store.session.state.vLearning[level],
  )
  index.value = 0
  flipped.value = false
  detail.value = ''
}
function nextQuiz() {
  if (items.value.length) quiz.value = quizFor(items.value)
  quizId.value++
}
watch(items, () => {
  draw()
  nextQuiz()
})
function mark(known: boolean) {
  if (!current.value) return
  store.markVocab(level, current.value.w, known)
  index.value++
  flipped.value = false
  detail.value = ''
  lookupSequence++
}
let lookupSequence = 0
async function lookup(char: string) {
  const sequence = ++lookupSequence
  detail.value = '查詢中…'
  try {
    const k = await lookupKanji(char)
    if (sequence !== lookupSequence) return
    detail.value = `${char}（JLPT ${k.jlpt ? 'N' + k.jlpt : '未標示'}）\n音讀：${k.on_readings.join('、') || '無'}\n訓讀：${k.kun_readings.join('、') || '無'}\n字義：${k.meanings.join('、') || '無'}`
  } catch {
    if (sequence === lookupSequence) detail.value = '查詢失敗，稍後再試'
  }
}
</script>
<template>
  <h2 class="page-title">
    單字 <span class="text-sm text-indigo">{{ level.toUpperCase() }}</span>
  </h2>
  <p class="meta-row">
    <span
      >已掌握 <b>{{ Object.keys(store.session.state.vKnown[level]).length }}</b> ／
      {{ items.length }}</span
    >
  </p>
  <div class="mode-toggle">
    <button :class="{ active: mode === 'flashcard' }" @click="mode = 'flashcard'">翻卡記憶</button
    ><button :class="{ active: mode === 'quiz' }" @click="mode = 'quiz'">讀音測驗</button>
  </div>
  <BankStatus
    :loading="loading"
    :failed="failed"
    :empty="!items.length"
    empty-text="此等級目前尚無單字。"
    @retry="retry"
  /><template v-if="!loading && !failed && items.length"
    ><template v-if="mode === 'flashcard'"
      ><template v-if="current"
        ><p class="meta-row">
          <span>第 {{ index + 1 }} / {{ deck.length }} 張</span>
        </p>
        <div
          class="flashcard"
          tabindex="0"
          aria-label="點卡片翻面"
          @click="flipped = !flipped"
          @keydown.enter.self="flipped = !flipped"
          @keydown.space.prevent.self="flipped = !flipped"
        >
          <template v-if="flipped"
            ><div class="fc-reading">{{ current.r }}</div>
            <div class="fc-front-word back-word">{{ current.w }}</div>
            <div class="fc-zh">{{ current.zh }}</div>
            <div class="fc-en">{{ current.en }}</div>
            <div class="kanji-chip-row">
              <button
                v-for="char in [...new Set(current.w.match(/[一-鿿㐀-䶿]/g) ?? [])]"
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
          ><template v-else
            ><div class="fc-front-word">{{ current.w }}</div>
            <div class="fc-hint">點卡片看讀音與釋義</div></template
          >
        </div>
        <div v-if="flipped" class="btn-row mt-3.5">
          <button class="btn bg-white text-vermilion border-vermilion" @click="mark(false)">
            還不熟</button
          ><button class="btn bg-green border-green" @click="mark(true)">記住了</button>
        </div></template
      >
      <div v-else class="card text-center">
        <p>這一輪 {{ deck.length }} 張都複習完了！</p>
        <button class="btn" @click="draw">再抽 10 張</button>
      </div></template
    ><template v-else-if="quiz"
      ><p class="quiz-streak">本次 {{ streak }} 連勝</p>
      <div class="q-card">
        <p class="text-sm text-subtle mt-0 mb-1.5">這個字怎麼唸？</p>
        <p class="text-3xl font-bold text-indigo-deep mt-0 mb-3.5">{{ quiz.item.w }}</p>
        <ChoiceQuestion
          :key="quizId"
          :answer="quiz.item.r"
          :distractors="[]"
          :options="quiz.options"
          :explanation="`${quiz.item.w}（${quiz.item.r}）：${quiz.item.zh || quiz.item.en}`"
          @answer="streak = $event ? streak + 1 : 0"
          ><template #answered
            ><div class="btn-row mt-3">
              <button
                v-if="!store.session.state.vKnown[level][quiz.item.w]"
                class="btn btn-outline"
                @click="store.markVocab(level, quiz.item.w, true)"
              >
                標為已掌握</button
              ><button class="btn" @click="nextQuiz">下一題</button>
            </div></template
          ></ChoiceQuestion
        >
      </div></template
    ></template
  >
</template>
<style scoped>
.flashcard .back-word {
  font-size: 1.8rem;
}
</style>
