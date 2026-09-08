import { it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomePage from './HomePage.vue'
import { questionBank } from '../services/questionBank'
import { mapLevels, defaultState, encodeCode } from '../domain/progress/state'
import { useProgressStore } from '../stores/progress'
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.spyOn(questionBank, 'counts').mockResolvedValue(
    mapLevels(() => ({ vocab: null, grammar: null, reading: null, listening: null })),
  )
})
it('keeps five level blocks and export available when all counts are unknown, never suggesting advancement', async () => {
  const s = useProgressStore()
  s.session.state.vKnown.n5 = Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => [String(i), true as const]),
  )
  const w = mount(HomePage)
  await flushPromises()
  expect(w.findAll('.level-progress-block')).toHaveLength(5)
  expect(w.text()).toContain('未知')
  expect(w.text()).not.toContain('基礎穩固')
  await w
    .findAll('button')
    .find((b) => b.text() === '匯出進度碼')!
    .trigger('click')
  expect((w.find('textarea').element as HTMLTextAreaElement).value).toBeTruthy()
  w.unmount()
})
it('rejects invalid imports without mutation and provides both latest undo and earlier snapshots', async () => {
  const s = useProgressStore()
  s.markVocab('n5', 'A', true)
  const w = mount(HomePage)
  await flushPromises()
  const submit = () =>
    w
      .findAll('button')
      .find((b) => b.text() === '還原進度')!
      .trigger('click')
  await w.find('textarea').setValue('invalid')
  await submit()
  expect(s.session.state.vKnown.n5.A).toBe(true)
  const incoming = defaultState()
  incoming.vKnown.n5.B = true
  await w.find('textarea').setValue(encodeCode(incoming))
  await submit()
  expect(s.session.state.vKnown.n5.B).toBe(true)
  await w
    .findAll('button')
    .find((b) => b.text().includes('撤銷／'))!
    .trigger('click')
  expect(s.session.state.vKnown.n5.A).toBe(true)
  await w
    .findAll('button')
    .find((b) => b.text().includes('撤銷／'))!
    .trigger('click')
  expect(s.session.state.vKnown.n5.B).toBe(true)
  expect(w.findAll('select option').length).toBeGreaterThan(2)
  w.unmount()
})
