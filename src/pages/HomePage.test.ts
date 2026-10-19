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
  const w = mount(HomePage, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
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
  const w = mount(HomePage, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
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
it('prioritizes one daily plan and keeps secondary information in semantic disclosure sections', async () => {
  const w = mount(HomePage, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
  expect(w.findAll('.today-tasks')).toHaveLength(1)
  expect(w.find('.home-primary > :first-child').classes()).toContain('today-tasks')
  expect(w.find('.home-secondary .current-progress-card').text()).toContain('N5')
  expect(
    w.find('.home-dashboard').element.compareDocumentPosition(w.find('.all-levels').element) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  for (const selector of ['.all-levels', '.backup-card', '.study-roadmap']) {
    expect(w.find(selector).element.tagName).toBe('DETAILS')
    expect(w.find(`${selector} > summary`).exists()).toBe(true)
    expect(w.find(selector).attributes('open')).toBeUndefined()
  }
  w.find('.backup-card').element.setAttribute('open', '')
  await w
    .findAll('button')
    .find((b) => b.text() === '匯出進度碼')!
    .trigger('click')
  expect((w.find('textarea').element as HTMLTextAreaElement).value).toBeTruthy()
  w.unmount()
})
it('opens backup recovery when storage is unavailable so export is not hidden by the new layout', async () => {
  localStorage.setItem('nihongo_dojo_v5', 'broken')
  const w = mount(HomePage, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
  expect(w.find('.backup-card').attributes('open')).toBeDefined()
  await w
    .findAll('button')
    .find((b) => b.text() === '匯出進度碼')!
    .trigger('click')
  expect((w.find('textarea').element as HTMLTextAreaElement).value).toBeTruthy()
  expect(localStorage.getItem('nihongo_dojo_v5')).toBe('broken')
  w.unmount()
})
