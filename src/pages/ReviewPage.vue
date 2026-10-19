<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useProgressStore } from '../stores/progress'
import { questionBank } from '../services/questionBank'
import { itemKey, type Mistake, type StudyKind } from '../domain/learning/types'
import {
  quizFor,
  type Vocab,
  type Question,
  type Reading,
  type Listening,
} from '../domain/questions'
import FlashcardExercise from '../components/FlashcardExercise.vue'
import LearningChoice from '../components/LearningChoice.vue'
import ListeningExercise from '../components/ListeningExercise.vue'
const store = useProgressStore(),
  filter = ref<StudyKind | 'all'>('all'),
  queue = shallowRef<Mistake[]>([]),
  pointer = ref(0),
  round = ref(0)
type Entry = {
  status: 'loading' | 'error' | 'unavailable' | 'ready'
  item?: Vocab | Question | Listening
  article?: Reading
  options?: string[]
}
const entries = ref<Record<string, Entry>>({}),
  level = computed(() => store.session.state.level)
const current = computed(() => queue.value[pointer.value]),
  entry = computed(() => (current.value ? entries.value[itemKey(current.value.ref)] : undefined))
const vocab = computed(() => entry.value?.item as Vocab | undefined),
  question = computed(() => entry.value?.item as Question | undefined),
  listening = computed(() => entry.value?.item as Listening | undefined)
let generation = 0
async function load(mistake: Mistake, token = generation) {
  const key = itemKey(mistake.ref)
  entries.value[key] = { status: 'loading' }
  const result = await questionBank.resolve(mistake.ref)
  if (token !== generation) return
  if (result.status !== 'ready') {
    entries.value[key] = { status: result.status }
    return
  }
  const next: Entry = {
    status: 'ready',
    item: result.item as Vocab | Question | Listening,
    article: result.article,
  }
  if (mistake.ref.kind === 'vocab' && mistake.lastWrongMode === 'pronunciation') {
    const bank = await questionBank.load('vocab', mistake.ref.level)
    if (token !== generation) return
    if (bank.failed) {
      entries.value[key] = { status: 'error' }
      return
    }
    next.options = quizFor(bank.items, result.item as Vocab).options
  }
  entries.value[key] = next
}
function start() {
  generation++
  round.value++
  pointer.value = 0
  entries.value = {}
  queue.value = Object.values(store.session.state.mistakes)
    .filter(
      (m) =>
        m.pending &&
        m.ref.level === level.value &&
        (filter.value === 'all' || m.ref.kind === filter.value),
    )
    .map((m) => JSON.parse(JSON.stringify(m)))
    .sort(
      (a, b) =>
        b.lastWrongAt.localeCompare(a.lastWrongAt) || itemKey(a.ref).localeCompare(itemKey(b.ref)),
    )
  for (const m of queue.value) void load(m)
}
watch([level, filter], start, { immediate: true })
const pending = computed(
  () =>
    Object.values(store.session.state.mistakes).filter(
      (m) =>
        m.pending &&
        m.ref.level === level.value &&
        (filter.value === 'all' || m.ref.kind === filter.value),
    ).length,
)
</script>
<template>
  <h2 class="page-title">錯題複習 · {{ level.toUpperCase() }}</h2>
  <p class="review-summary">目前待複習 {{ pending }} 題；本輪固定 {{ queue.length }} 題。</p>
  <div class="review-toolbar">
    <label class="review-filter" for="review-kind"
      >題型
      <select id="review-kind" v-model="filter" aria-label="錯題類型">
        <option value="all">全部</option>
        <option value="vocab">單字</option>
        <option value="grammar">文法</option>
        <option value="reading">讀解</option>
        <option value="listening">聽力</option>
      </select></label
    ><button class="btn btn-outline" @click="start">開始下一輪</button>
  </div>
  <div v-if="!queue.length" class="card">
    <p>目前沒有待複習錯題。</p>
    <RouterLink class="btn" to="/">返回練習入口</RouterLink>
  </div>
  <div v-else-if="!current" class="card">
    <p>本輪已結束；可開始下一輪查看剩餘錯題。</p>
    <button class="btn" @click="start">開始下一輪</button>
  </div>
  <section v-else class="q-card">
    <p class="meta-row">
      第 {{ pointer + 1 }} / {{ queue.length }} 題 · 累計錯誤
      {{ store.session.state.mistakes[itemKey(current.ref)]?.wrongCount ?? current.wrongCount }}
    </p>
    <p v-if="entry?.status === 'loading'" role="status">載入中…</p>
    <div v-else-if="entry?.status === 'error'" role="alert">
      <p>題庫請求失敗，紀錄仍保留。</p>
      <button class="btn" @click="load(current)">重試此題</button>
    </div>
    <p v-else-if="entry?.status === 'unavailable'" role="status">題目已不可用，錯題紀錄仍保留。</p>
    <template v-else-if="entry?.status === 'ready'">
      <FlashcardExercise
        v-if="current.lastWrongMode === 'flashcard' && vocab"
        :key="`${round}:${pointer}`"
        :item="vocab"
        :level="level"
      />
      <ListeningExercise
        v-else-if="current.ref.kind === 'listening' && listening"
        :key="`${round}:${pointer}`"
        :item="listening"
        :level="level"
      />
      <template v-else
        ><template v-if="entry.article"
          ><h3>{{ entry.article.title }}</h3>
          <p class="reading-text">{{ entry.article.text }}</p>
          <p class="reading-notes">
            <span v-for="note in entry.article.notes" :key="note.term"
              >{{ note.term }}＝{{ note.meaning }}　</span
            >
          </p>
          <p>本頁只複習子題，整篇掌握請回讀解頁完成。</p></template
        >
        <p class="font-bold">
          {{
            current.lastWrongMode === 'pronunciation' ? `${vocab?.w}：這個字怎麼唸？` : question?.q
          }}
        </p>
        <LearningChoice
          :key="`${round}:${pointer}`"
          :item-ref="current.ref"
          :mode="current.lastWrongMode"
          :answer="current.lastWrongMode === 'pronunciation' ? vocab!.r : question!.answer"
          :distractors="current.lastWrongMode === 'pronunciation' ? [] : question!.distractors"
          :options="entry.options"
          :explanation="
            current.lastWrongMode === 'pronunciation'
              ? `${vocab!.w}（${vocab!.r}）：${vocab!.zh || vocab!.en}`
              : question!.explanation
          "
      /></template> </template
    ><button class="btn btn-block mt-3" @click="pointer++">下一題</button>
  </section>
  <RouterLink class="back-link" to="/">← 返回首頁</RouterLink>
</template>
