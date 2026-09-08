import { it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from './progress'
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
  s.markGrammar('n3', 'g-n3-001', true)
  s.markGrammar('n3', 'g-n3-001', false)
  expect(s.session.state.gDone.n3).toEqual([])
  s.markReading('n3', 'r1')
  s.markReading('n3', 'r1')
  expect(s.session.state.rDone.n3).toEqual(['r1'])
  s.markListening('n3', 'l1', true)
  s.markListening('n3', 'l1', false)
  expect(s.session.state.lDone.n3).toEqual(['l1'])
  expect(s.session.state.lCorrect.n3).toEqual([])
  expect(s.session.state.rDone.n5).toEqual([])
})
it('the app subscription persists mutations and reopens the selected level', () => {
  const s = useProgressStore()
  s.$subscribe(() => s.persist(), { flush: 'sync' })
  s.setLevel('n2')
  s.markVocab('n2', '水', true)
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).vKnown.n2.水).toBe(true)
  setActivePinia(createPinia())
  expect(useProgressStore().session.state.level).toBe('n2')
})
