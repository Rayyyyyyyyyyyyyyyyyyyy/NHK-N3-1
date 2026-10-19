<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import { grammarQueue, type Grammar } from '../domain/questions'
import LearningChoice from '../components/LearningChoice.vue'
import StudyStatus from '../components/StudyStatus.vue'
import { useStudySession } from '../composables/useStudySession'
import BankStatus from '../components/BankStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('grammar', level)
const {
  daily,
  invalid,
  noTargets,
  selected,
  missing,
  round: studyRound,
} = useStudySession('grammar', items)
const queue = ref<Grammar[]>([]),
  pointer = ref(0),
  round = ref(0)
function newRound() {
  queue.value = daily.value
    ? selected.value
    : grammarQueue(items.value, store.session.state.gDone[level])
  pointer.value = 0
  round.value++
}
watch([selected, studyRound], newRound)
const current = computed(() => queue.value[pointer.value])
function next() {
  pointer.value++
  if (!daily.value && pointer.value >= queue.value.length) newRound()
}
</script>
<template>
  <h2 class="page-title">
    文法 <span class="text-sm text-indigo">{{ level.toUpperCase() }}</span>
  </h2>
  <StudyStatus
    v-if="!loading && !failed"
    :daily="daily"
    :no-targets="noTargets"
    :invalid="invalid"
    :missing="missing"
    :empty="!queue.length"
  />
  <BankStatus
    :loading="loading"
    :failed="failed"
    :empty="!items.length"
    empty-text="此等級目前尚無文法題。"
    @retry="retry"
  /><template v-if="current && !loading && !failed && !invalid"
    ><p class="meta-row">
      <span>第 {{ pointer + 1 }} 題 ／ {{ queue.length }}</span
      ><span>已掌握 {{ store.session.state.gDone[level].length }} / {{ items.length }}</span>
    </p>
    <div class="q-card">
      <p class="grammar-prompt">
        <template v-for="(part, i) in current.q.split('＿＿')" :key="i"
          ><span v-if="i" class="blank">＿＿</span>{{ part }}</template
        >
      </p>
      <LearningChoice
        :key="`${round}:${current.id}`"
        :item-ref="{ level, kind: 'grammar', id: current.id }"
        mode="grammar"
        :answer="current.answer"
        :distractors="current.distractors"
        :explanation="current.explanation"
        ><template #answered
          ><button class="btn btn-block mt-3" @click="next">下一題</button></template
        ></LearningChoice
      >
    </div></template
  >
  <div v-if="daily && !invalid && queue.length && !current" class="card">
    {{
      missing
        ? '有效目標已做完，尚有不可用目標，請返回首頁修復。'
        : noTargets
          ? '此組目前無可用題目。'
          : '本組目標已做完，返回首頁查看今日任務。'
    }}
  </div>
</template>
<style scoped lang="scss">
.grammar-prompt {
  font-size: 1.05rem;
  line-height: 1.9;
}
</style>
