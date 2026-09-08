import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ListeningPage from './ListeningPage.vue'
import { questionBank } from '../services/questionBank'
const item = {
  id: 'l-test',
  level: 'n5' as const,
  script: '秘密の原文',
  q: '質問',
  answer: '正解',
  distractors: ['違う', '別', '誤り'],
  explanation: '解析',
}
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.spyOn(questionBank, 'load').mockResolvedValue({ items: [item], failed: false })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
it('degrades to the transcript when speech is unavailable', async () => {
  vi.stubGlobal('speechSynthesis', undefined)
  const w = mount(ListeningPage)
  await flushPromises()
  expect(w.text()).toContain('不支援語音合成')
  expect(w.text()).toContain(item.script)
  expect(w.find('.play-btn').exists()).toBe(false)
  w.unmount()
})
it('speaks Japanese at the selected rate, replaces playback, stops in background and on unmount', async () => {
  const engine = new EventTarget() as EventTarget & {
    getVoices: ReturnType<typeof vi.fn>
    speak: ReturnType<typeof vi.fn>
    cancel: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    resume: ReturnType<typeof vi.fn>
  }
  Object.assign(engine, {
    getVoices: vi.fn(() => [{ lang: 'ja-JP', name: 'Japanese' }]),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  })
  vi.stubGlobal('speechSynthesis', engine)
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      constructor(text: string) {
        this.text = text
      }
    },
  )
  const w = mount(ListeningPage)
  await flushPromises()
  expect(w.text()).not.toContain(item.script)
  await w.findAll('.speed-btn')[0].trigger('click')
  await w.find('.play-btn').trigger('click')
  await flushPromises()
  expect(engine.speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: item.script,
      lang: 'ja-JP',
      rate: 0.75,
      voice: expect.objectContaining({ lang: 'ja-JP' }),
    }),
  )
  const before = engine.cancel.mock.calls.length
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(engine.cancel.mock.calls.length).toBeGreaterThan(before)
  const after = engine.cancel.mock.calls.length
  w.unmount()
  expect(engine.cancel.mock.calls.length).toBeGreaterThan(after)
})
