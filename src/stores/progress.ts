import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { createProgressStorage } from '../services/progressStorage'
import { createProgressSession } from '../domain/progress/session'
import { encodeCode, cloneState, type Level, type ProgressState } from '../domain/progress/state'
import { recordResult, completeArticle, pruneDays } from '../domain/learning/reducer'
import { localDate } from '../domain/learning/calendar'
import {
  dayKey,
  type LearningInput,
  type ArticleCompletion,
  type StudyKind,
} from '../domain/learning/types'
import { refsFor, generateGroup, repairGroup } from '../domain/learning/plans'
import { questionBank } from '../services/questionBank'
export const useProgressStore = defineStore('progress', () => {
  const storage = createProgressStorage(),
    session = reactive(createProgressSession(storage)),
    storageAvailable = ref(storage.available),
    storageError = ref(storage.error)
  let revision = 0
  const taskStatus = reactive<Partial<Record<string, 'pending' | 'error'>>>({})
  function refreshStorage() {
    storageAvailable.value = storage.available
    storageError.value = storage.error
  }
  function commit(next: ProgressState) {
    if (next !== session.state) session.commit(next)
    refreshStorage()
  }
  function edit(fn: (s: ProgressState) => void) {
    const next = cloneState(session.state)
    fn(next)
    commit(next)
  }
  function recordLearning(input: LearningInput) {
    commit(recordResult(session.state, input))
  }
  function markVocab(level: Level, word: string, known: boolean) {
    edit((s) => {
      delete s[known ? 'vLearning' : 'vKnown'][level][word]
      Object.defineProperty(s[known ? 'vKnown' : 'vLearning'][level], word, {
        value: true,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    })
  }
  function startPlan(date: string, level: Level, kind: StudyKind) {
    if (kind !== 'reading' && kind !== 'listening') return
    edit((s) => {
      const p = s.plans[dayKey(date, level)]
      if (p && p.branch === kind) p.started = true
    })
  }
  async function buildPlan(
    branch: 'reading' | 'listening',
    date = localDate(),
    level = session.state.level,
  ) {
    const key = dayKey(date, level),
      existing = session.state.plans[key]
    if (!existing)
      edit((s) => {
        pruneDays(s, date)
        s.plans[key] = { date, level, branch, started: false, groups: {} }
      })
    else if (!existing.started && existing.branch !== branch)
      edit((s) => {
        s.plans[key].branch = branch
        delete s.plans[key].groups[existing.branch]
      })
    const selected = session.state.plans[key].branch,
      requestRevision = revision
    await Promise.all(
      (['vocab', 'grammar', selected] as StudyKind[]).map(async (kind) => {
        const requestKey = JSON.stringify([key, kind])
        if (session.state.plans[key]?.groups[kind] || taskStatus[requestKey] === 'pending') return
        taskStatus[requestKey] = 'pending'
        const result = await questionBank.load(kind, level)
        if (requestRevision !== revision) return
        if (result.failed) {
          taskStatus[requestKey] = 'error'
          return
        }
        delete taskStatus[requestKey]
        if (requestRevision !== revision) return
        // Capture origin; do not recreate a plan replaced by import/restore or another branch.
        const current = session.state.plans[key]
        if (
          !current ||
          (kind !== 'vocab' && kind !== 'grammar' && current.branch !== kind) ||
          current.groups[kind]
        )
          return
        edit((s) => {
          s.plans[key].groups[kind] = generateGroup(
            s,
            refsFor(kind, level, result.items),
            kind,
            date,
          )
        })
      }),
    )
  }
  async function repairPlan(date: string, level: Level, kind: StudyKind) {
    const key = dayKey(date, level),
      plan = session.state.plans[key],
      old = plan?.groups[kind]
    if (!old) return
    const requestRevision = revision
    const result = await questionBank.load(kind, level)
    if (requestRevision !== revision) return
    if (result.failed) throw Error('題庫載入失敗，原任務仍保留；請重試。')
    if (
      JSON.stringify(session.state.plans[key]?.groups[kind]?.targets) !==
      JSON.stringify(old.targets)
    )
      return
    edit((s) => {
      s.plans[key].groups[kind] = repairGroup(s, s.plans[key], kind, result.items)
    })
  }
  return {
    session,
    storageAvailable,
    storageError,
    taskStatus,
    recordLearning,
    markVocab,
    buildPlan,
    repairPlan,
    startPlan,
    completeReading: (input: ArticleCompletion) => commit(completeArticle(session.state, input)),
    setLevel: (level: Level) =>
      edit((s) => {
        s.level = level
      }),
    exportCode: () => encodeCode(session.state),
    exportRaw: () => storage.rawSource,
    importCode: (code: string) => {
      try {
        session.importCode(code)
        revision++
        for (const key of Object.keys(taskStatus)) delete taskStatus[key]
      } finally {
        refreshStorage()
      }
    },
    restore: (index?: number) => {
      try {
        const restored = session.restore(index)
        if (restored) {
          revision++
          for (const key of Object.keys(taskStatus)) delete taskStatus[key]
        }
        return restored
      } finally {
        refreshStorage()
      }
    },
    persist: () => {
      session.commit(cloneState(session.state))
      refreshStorage()
    },
  }
})
