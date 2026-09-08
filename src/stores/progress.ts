import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { createProgressStorage } from '../services/progressStorage'
import { createProgressSession } from '../domain/progress/session'
import { encodeCode, touchStreak as updateStreak, type Level } from '../domain/progress/state'
export const useProgressStore = defineStore('progress', () => {
  const storage = createProgressStorage(),
    session = reactive(createProgressSession(storage)),
    storageAvailable = ref(true)
  function markVocab(level: Level, word: string, known: boolean) {
    delete session.state[known ? 'vLearning' : 'vKnown'][level][word]
    session.state[known ? 'vKnown' : 'vLearning'][level][word] = true
  }
  function markGrammar(level: Level, id: string, correct: boolean) {
    session.state.gDone[level] = session.state.gDone[level].filter((x) => x !== id)
    if (correct) session.state.gDone[level].push(id)
  }
  function markReading(level: Level, id: string) {
    if (!session.state.rDone[level].includes(id)) session.state.rDone[level].push(id)
  }
  function markListening(level: Level, id: string, correct: boolean) {
    if (!session.state.lDone[level].includes(id)) session.state.lDone[level].push(id)
    session.state.lCorrect[level] = session.state.lCorrect[level].filter((x) => x !== id)
    if (correct) session.state.lCorrect[level].push(id)
  }
  return {
    session,
    storageAvailable,
    markVocab,
    markGrammar,
    markReading,
    markListening,
    setLevel: (lv: Level) => {
      session.state.level = lv
    },
    touchStreak: () => updateStreak(session.state),
    exportCode: () => encodeCode(session.state),
    importCode: (code: string) => session.importCode(code),
    restore: (index?: number) => session.restore(index),
    persist: () => {
      storageAvailable.value = storage.save(session.state)
    },
  }
})
