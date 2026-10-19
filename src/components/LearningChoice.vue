<script setup lang="ts">
import ChoiceQuestion from './ChoiceQuestion.vue'
import { useProgressStore } from '../stores/progress'
import { newAttemptId, type StudyItemRef, type StudyMode } from '../domain/learning/types'
const props = defineProps<{
  itemRef: StudyItemRef
  mode: StudyMode
  answer: string
  distractors: string[]
  explanation?: string
  options?: string[]
  attemptId?: string
}>()
const emit = defineEmits<{ answer: [correct: boolean] }>()
const store = useProgressStore(),
  attempt = props.attemptId ?? newAttemptId()
function submit(correct: boolean) {
  store.recordLearning({ attemptId: attempt, ref: props.itemRef, mode: props.mode, correct })
  emit('answer', correct)
}
</script>
<template>
  <ChoiceQuestion
    :answer="answer"
    :distractors="distractors"
    :explanation="explanation"
    :options="options"
    @answer="submit"
    ><template #answered="slot"><slot name="answered" v-bind="slot" /></template
  ></ChoiceQuestion>
</template>
