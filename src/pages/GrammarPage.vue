<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProgressStore } from '../stores/progress'
import { useQuestionBank } from '../composables/useQuestionBank'
import { grammarQueue, type Grammar } from '../domain/questions'
import ChoiceQuestion from '../components/ChoiceQuestion.vue'
import BankStatus from '../components/BankStatus.vue'
const store = useProgressStore(),
  level = store.session.state.level
const { items, loading, failed, retry } = useQuestionBank('grammar', level)
const queue = ref<Grammar[]>([]),
  pointer = ref(0),
  round = ref(0)
function newRound() {
  queue.value = grammarQueue(items.value, store.session.state.gDone[level])
  pointer.value = 0
  round.value++
}
watch(items, newRound)
const current = computed(() => queue.value[pointer.value])
function next() {
  pointer.value++
  if (pointer.value >= queue.value.length) newRound()
}
</script>
<template>
  <h2 class="page-title">
    文法 <span class="text-sm text-indigo">{{ level.toUpperCase() }}</span>
  </h2>
  <BankStatus
    :loading="loading"
    :failed="failed"
    :empty="!items.length"
    empty-text="此等級目前尚無文法題。"
    @retry="retry"
  /><template v-if="current && !loading && !failed"
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
      <ChoiceQuestion
        :key="`${round}:${current.id}`"
        :answer="current.answer"
        :distractors="current.distractors"
        :explanation="current.explanation"
        @answer="store.markGrammar(level, current.id, $event)"
        ><template #answered
          ><button class="btn btn-block mt-3" @click="next">下一題</button></template
        ></ChoiceQuestion
      >
    </div></template
  >
</template>
<style scoped>
.grammar-prompt {
  font-size: 1.05rem;
  line-height: 1.9;
}
</style>
