<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import ChoiceQuestion from '../components/ChoiceQuestion.vue'
import BankStatus from '../components/BankStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('reading', level)
const currentId = ref<string | null>(null),
  selections = ref<Record<number, boolean>>({}),
  attempt = ref(0)
const article = computed(() => items.value.find((a) => a.id === currentId.value))
const complete = computed(
  () =>
    !!article.value &&
    article.value.questions.length > 0 &&
    Object.keys(selections.value).length === article.value.questions.length,
)
const correctCount = computed(() => Object.values(selections.value).filter(Boolean).length)
function open(id: string) {
  currentId.value = id
  redo()
}
function redo() {
  selections.value = {}
  attempt.value++
}
function answer(index: number, correct: boolean) {
  if (selections.value[index] !== undefined) return
  selections.value[index] = correct
  if (complete.value && article.value && correctCount.value === article.value.questions.length)
    store.markReading(level, article.value.id)
}
</script>
<template>
  <template v-if="article"
    ><button class="back-link border-0 bg-transparent p-0 cursor-pointer" @click="currentId = null">
      ← 返回讀解列表
    </button>
    <h2 class="page-title mt-0">{{ article.title }}</h2>
    <div class="card">
      <p class="reading-text">{{ article.text }}</p>
      <div class="reading-notes">
        📌 單字備註：<template v-for="(note, i) in article.notes" :key="note.term"
          ><template v-if="i">　／　</template><b>{{ note.term }}</b
          >＝{{ note.meaning }}</template
        >
      </div>
    </div>
    <div v-for="(q, i) in article.questions" :key="`${article.id}:${attempt}:${i}`" class="q-card">
      <p class="font-bold mt-0 mb-2.5">問題 {{ i + 1 }}：{{ q.q }}</p>
      <ChoiceQuestion
        :answer="q.answer"
        :distractors="q.distractors"
        :explanation="q.explanation"
        @answer="answer(i, $event)"
      />
    </div>
    <div v-if="complete" class="card text-center" role="status">
      <p>
        本篇成績：<b>{{ correctCount }} / {{ article.questions.length }}</b>
        {{ correctCount === article.questions.length ? '🎉 全對！' : '' }}
      </p>
      <button class="btn" @click="redo">重做這篇</button>
    </div></template
  ><template v-else
    ><h2 class="page-title">
      讀解 <span class="text-sm text-indigo">{{ level.toUpperCase() }}</span>
    </h2>
    <BankStatus
      :loading="loading"
      :failed="failed"
      :empty="!items.length"
      empty-text="此等級目前尚無文章。"
      @retry="retry"
    />
    <div v-if="items.length" class="card py-1 px-4">
      <button
        v-for="a in items"
        :key="a.id"
        class="reading-list-item w-full bg-transparent border-0 text-left cursor-pointer"
        @click="open(a.id)"
      >
        <span
          ><span class="rli-title">{{ a.title }}</span
          ><br /><span class="rli-type">{{ a.type }}</span></span
        ><span class="rli-check">{{
          store.session.state.rDone[level].includes(a.id) ? '✓' : ''
        }}</span>
      </button>
    </div>
    <section class="card ext-link-card">
      <p class="card-title">延伸練習</p>
      <a
        class="btn btn-outline btn-block"
        target="_blank"
        rel="noopener"
        href="https://www3.nhk.or.jp/nhkworld/zt/shows/ljfn/"
        >NHK 從新聞學日語</a
      ><a
        class="btn btn-outline btn-block mt-2"
        target="_blank"
        rel="noopener"
        href="https://www3.nhk.or.jp/news/easy/"
        >NHK NEWS WEB EASY</a
      >
      <p class="text-xs text-subtle mt-2.5 mb-0">NHK 內容有版權且禁止內嵌，故以連結開啟。</p>
    </section></template
  >
</template>
