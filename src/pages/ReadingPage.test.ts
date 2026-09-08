import { it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReadingPage from './ReadingPage.vue'
import { questionBank } from '../services/questionBank'
import { useProgressStore } from '../stores/progress'
const article = {
  id: 'r-test',
  level: 'n5' as const,
  title: '文章',
  type: '短文',
  text: '本文',
  notes: [{ term: '語', meaning: '字' }],
  questions: [
    { q: '一', answer: '正一', distractors: ['錯一', '錯二', '錯三'], explanation: '解析一' },
    { q: '二', answer: '正二', distractors: ['誤一', '誤二', '誤三'], explanation: '解析二' },
  ],
}
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.spyOn(questionBank, 'load').mockResolvedValue({ items: [article], failed: false })
})
it('only completes after all correct, immediately explains each answer, and redo preserves completion', async () => {
  const w = mount(ReadingPage)
  await flushPromises()
  await w.find('.reading-list-item').trigger('click')
  expect(w.text()).toContain('語＝字')
  await w
    .findAll('.option-btn')
    .find((b) => b.text().includes('正一'))!
    .trigger('click')
  expect(w.text()).toContain('解析一')
  expect(w.text()).not.toContain('本篇成績')
  await w
    .findAll('.option-btn')
    .find((b) => b.text().includes('正二'))!
    .trigger('click')
  expect(w.text()).toContain('本篇成績')
  expect(useProgressStore().session.state.rDone.n5).toEqual(['r-test'])
  await w
    .findAll('button')
    .find((b) => b.text() === '重做這篇')!
    .trigger('click')
  expect(w.findAll('.option-btn').every((b) => !b.attributes('disabled'))).toBe(true)
  expect(useProgressStore().session.state.rDone.n5).toEqual(['r-test'])
  w.unmount()
})
it('a wrong answer never marks a new article complete', async () => {
  const w = mount(ReadingPage)
  await flushPromises()
  await w.find('.reading-list-item').trigger('click')
  await w
    .findAll('.option-btn')
    .find((b) => b.text().includes('錯一'))!
    .trigger('click')
  await w
    .findAll('.option-btn')
    .find((b) => b.text().includes('正二'))!
    .trigger('click')
  expect(useProgressStore().session.state.rDone.n5).toEqual([])
  expect(w.text()).toContain('1 / 2')
  w.unmount()
})
