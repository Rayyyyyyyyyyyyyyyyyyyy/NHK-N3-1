import { it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from './progress'
import { newAttemptId } from '../domain/learning/types'
import { STORAGE_KEY } from '../services/progressStorage'
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})
it('marks vocabulary exclusively, grammar by stable ID, reading and listening independently', () => {
  const s = useProgressStore()
  s.markVocab('n3', '水', true)
  s.markVocab('n3', '水', false)
  expect(s.session.state.vKnown.n3.水).toBeUndefined()
  expect(s.session.state.vLearning.n3.水).toBe(true)
  for (const correct of [true, false])
    s.recordLearning({
      attemptId: newAttemptId(),
      ref: { level: 'n3', kind: 'grammar', id: 'g-n3-001' },
      mode: 'grammar',
      correct,
    })
  expect(s.session.state.gDone.n3).toEqual([])
  const article = 'article',
    qid = 'rq-1',
    resultId = JSON.stringify([article, qid])
  s.recordLearning({
    attemptId: resultId,
    ref: { level: 'n3', kind: 'reading', id: qid, articleId: 'r1' },
    mode: 'reading',
    correct: true,
  })
  for (let i = 0; i < 2; i++)
    s.completeReading({
      attemptId: article,
      level: 'n3',
      articleId: 'r1',
      questionIds: [qid],
      resultIds: [resultId],
    })
  expect(s.session.state.rDone.n3).toEqual(['r1'])
  for (const correct of [true, false])
    s.recordLearning({
      attemptId: newAttemptId(),
      ref: { level: 'n3', kind: 'listening', id: 'l1' },
      mode: 'listening',
      correct,
    })
  expect(s.session.state.lDone.n3).toEqual(['l1'])
  expect(s.session.state.lCorrect.n3).toEqual([])
  expect(s.session.state.rDone.n5).toEqual([])
})
it('explicit commits persist mutations and reopens the selected level', () => {
  const s = useProgressStore()
  s.setLevel('n2')
  s.markVocab('n2', '水', true)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.vKnown.n2.水).toBe(true)
  setActivePinia(createPinia())
  expect(useProgressStore().session.state.level).toBe('n2')
})
