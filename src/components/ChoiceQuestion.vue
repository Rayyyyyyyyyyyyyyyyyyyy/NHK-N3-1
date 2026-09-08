<script setup lang="ts">
import { ref } from 'vue'
import { shuffle } from '../domain/questions'
// All four practice pages use the same single-submit, reveal-correct-answer contract.
const props = defineProps<{
  answer: string
  distractors: string[]
  explanation?: string
  options?: string[]
}>()
const emit = defineEmits<{ answer: [correct: boolean] }>()
const options = props.options ?? shuffle([props.answer, ...props.distractors])
const chosen = ref<string | null>(null)
function choose(option: string) {
  if (chosen.value !== null) return
  chosen.value = option
  emit('answer', option === props.answer)
}
</script>
<template>
  <div class="option-list">
    <button
      v-for="(option, i) in options"
      :key="option"
      class="option-btn"
      :class="{
        correct: chosen !== null && option === answer,
        wrong: chosen === option && option !== answer,
      }"
      :disabled="chosen !== null"
      @click="choose(option)"
    >
      <span class="option-letter">{{ 'ABCD'[i] }}</span
      ><span>{{ option }}</span>
    </button>
  </div>
  <div v-if="chosen !== null" aria-live="polite">
    <div v-if="explanation" class="explanation">{{ explanation }}</div>
    <slot name="answered" :correct="chosen === answer" />
  </div>
</template>
