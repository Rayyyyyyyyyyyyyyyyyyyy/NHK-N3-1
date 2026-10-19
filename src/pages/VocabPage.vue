<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { computed, ref, watch } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import { useStudySession } from '../composables/useStudySession'
import { vocabQueue } from '../domain/learning/plans'
import { quizFor, type Vocab } from '../domain/questions'
import { itemKey } from '../domain/learning/types'
import LearningChoice from '../components/LearningChoice.vue'
import FlashcardExercise from '../components/FlashcardExercise.vue'
import BankStatus from '../components/BankStatus.vue'
import StudyStatus from '../components/StudyStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('vocab', level)
const { daily, due, invalid, noTargets, selected, missing, round, today, reset } = useStudySession(
  'vocab',
  items,
)
const mode = ref('flashcard'),
  deck = ref<Vocab[]>([]),
  index = ref(0),
  streak = ref(0),
  quiz = ref<ReturnType<typeof quizFor>>(),
  quizId = ref(0)
const current = computed(() => deck.value[index.value])
const dueCount = computed(
  () =>
    new Set(
      items.value
        .filter(
          (v) =>
            store.session.state.schedules[itemKey({ level, kind: 'vocab', id: v.w })]?.dueOn <=
            today.value,
        )
        .map((v) => v.w),
    ).size,
)
function nextQuiz() {
  const candidates = daily.value || due.value ? deck.value.slice(index.value) : items.value
  quiz.value = candidates.length
    ? quizFor(items.value, candidates[0] && (daily.value || due.value) ? candidates[0] : undefined)
    : undefined
  quizId.value++
}
function draw() {
  deck.value = daily.value
    ? selected.value
    : vocabQueue(items.value, store.session.state, level, today.value, due.value)
  index.value = 0
  streak.value = 0
  nextQuiz()
}
watch([selected, round], draw)
watch(mode, reset)
function next() {
  index.value++
  nextQuiz()
}
function quizAnswer(correct: boolean) {
  streak.value = correct ? streak.value + 1 : 0
}
function nextQuestion() {
  if (daily.value || due.value) index.value++
  nextQuiz()
}
</script>
<template>
  <h2 class="page-title">
    單字 <span class="text-sm text-indigo">{{ level.toUpperCase() }}</span>
  </h2>
  <p class="meta-row">
    <span
      >已掌握 <b>{{ Object.keys(store.session.state.vKnown[level]).length }}</b> ／
      {{ items.length }}　到期 {{ dueCount }}</span
    >
  </p>
  <div class="btn-row">
    <RouterLink class="btn btn-outline" to="/vocab?study=due">開始到期複習</RouterLink
    ><RouterLink v-if="due" class="btn btn-outline" to="/vocab">自由練習</RouterLink>
  </div>
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
  />
  <StudyStatus
    v-if="!loading && !failed"
    :daily="daily"
    :no-targets="noTargets"
    :invalid="invalid"
    :missing="missing"
    :empty="!deck.length"
  />
  <template v-if="!loading && !failed && items.length && !invalid">
    <template v-if="mode === 'flashcard'"
      ><template v-if="current"
        ><p class="meta-row">第 {{ index + 1 }} / {{ deck.length }} 張</p>
        <FlashcardExercise
          :key="`${round}:${index}:${mode}:${current.w}`"
          :item="current"
          :level="level"
          @answer="next"
      /></template>
      <div v-else class="card text-center">
        <p>
          {{
            noTargets || (missing && !deck.length)
              ? '目前無可練習目標，請返回今日任務。'
              : due && !deck.length
                ? '目前沒有到期單字。'
                : `這一輪 ${deck.length} 張都複習完了！`
          }}
        </p>
        <button v-if="!daily" class="btn" @click="draw">
          {{ due ? '開始下一輪到期複習' : '再抽 10 張' }}</button
        ><button v-else class="btn" @click="reset">更新剩餘任務</button>
      </div></template
    >
    <template v-else-if="quiz"
      ><p class="quiz-streak">本次 {{ streak }} 連勝</p>
      <div class="q-card">
        <p class="text-sm text-subtle">這個字怎麼唸？</p>
        <p class="text-3xl font-bold text-indigo-deep">{{ quiz.item.w }}</p>
        <LearningChoice
          :key="quizId"
          :item-ref="{ level, kind: 'vocab', id: quiz.item.w }"
          mode="pronunciation"
          :answer="quiz.item.r"
          :distractors="[]"
          :options="quiz.options"
          :explanation="`${quiz.item.w}（${quiz.item.r}）：${quiz.item.zh || quiz.item.en}`"
          @answer="quizAnswer"
          ><template #answered
            ><div class="btn-row mt-3">
              <button
                v-if="!store.session.state.vKnown[level][quiz.item.w]"
                class="btn btn-outline"
                @click="store.markVocab(level, quiz.item.w, true)"
              >
                標為已掌握</button
              ><button class="btn" @click="nextQuestion">下一題</button>
            </div></template
          ></LearningChoice
        >
      </div></template
    >
    <div v-else class="card">
      <p>
        {{
          noTargets || (missing && !deck.length)
            ? '目前無可練習目標，請返回今日任務。'
            : due
              ? '目前沒有到期項目，或本輪已完成。'
              : '本輪測驗已完成。'
        }}
      </p>
      <button class="btn" @click="daily ? reset() : draw()">更新剩餘任務／下一輪</button>
    </div>
  </template>
</template>
