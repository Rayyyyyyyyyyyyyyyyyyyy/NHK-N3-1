import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ListeningExercise from './ListeningExercise.vue'
import { useProgressStore } from '../stores/progress'

class Utterance {
  text: string
  onstart?: () => void
  onpause?: () => void
  onresume?: () => void
  onend?: () => void
  onerror?: () => void
  onboundary?: (event: { charIndex: number }) => void
  constructor(text: string) {
    this.text = text
  }
}
const item = {
  id: 'l-progress',
  level: 'n5' as const,
  script: 'あいうえおかきくけこ',
  q: '何ですか。',
  answer: '正',
  distractors: ['誤一', '誤二', '誤三'],
  explanation: '解説',
}
let engine: {
  getVoices: ReturnType<typeof vi.fn>
  speak: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
}
let wrappers: VueWrapper[] = []
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  engine = {
    getVoices: vi.fn(() => [{ lang: 'ja-JP', name: 'Japanese' }]),
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  }
  vi.stubGlobal('speechSynthesis', engine)
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
})
afterEach(() => {
  for (const w of wrappers) w.unmount()
  wrappers = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
async function setup(id = item.id) {
  const w = mount(ListeningExercise, { props: { item: { ...item, id }, level: 'n5' } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const spoken = () => engine.speak.mock.calls.at(-1)![0] as Utterance
const value = (w: VueWrapper) => w.find('[role="progressbar"]').attributes('aria-valuenow')
it('reports real boundary progress and completes only on end without recording learning', async () => {
  const w = await setup()
  expect(value(w)).toBe('0')
  await w.find('.play-btn').trigger('click')
  expect(value(w)).toBeUndefined()
  expect(engine.cancel.mock.invocationCallOrder[0]).toBeLessThan(
    engine.speak.mock.invocationCallOrder[0],
  )
  const u = spoken()
  u.onstart!()
  u.onboundary!({ charIndex: 5 })
  await flushPromises()
  expect(value(w)).toBe('50')
  expect(w.text()).toContain('50%')
  u.onboundary!({ charIndex: 10 })
  await flushPromises()
  expect(value(w)).toBe('99')
  u.onend!()
  await flushPromises()
  expect(value(w)).toBe('100')
  expect(w.text()).toContain('播放完成')
  expect(useProgressStore().session.state.results).toHaveLength(0)
})
it('keeps engines without boundary events indeterminate rather than inventing a duration', async () => {
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  spoken().onstart!()
  await flushPromises()
  expect(value(w)).toBeUndefined()
  expect(w.find('.speech-progress-fill').classes()).toContain('is-indeterminate')
  expect(w.find('.speech-progress-caption').text()).toBe('播放中')
  spoken().onend!()
  await flushPromises()
  expect(value(w)).toBe('100')
})
it('pause/resume preserves progress and the same utterance; stop clears progress', async () => {
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  const u = spoken()
  u.onstart!()
  u.onboundary!({ charIndex: 4 })
  await flushPromises()
  expect(w.find('.speed-btn').attributes('disabled')).toBeDefined()
  await w.find('.play-btn').trigger('click')
  expect(engine.pause).toHaveBeenCalledOnce()
  expect(w.text()).toContain('已暫停')
  expect(value(w)).toBe('40')
  await w.find('.play-btn').trigger('click')
  expect(engine.resume).toHaveBeenCalledOnce()
  expect(engine.speak).toHaveBeenCalledOnce()
  await w.find('.speech-stop').trigger('click')
  expect(value(w)).toBe('0')
  expect(w.text()).toContain('已停止')
  expect(w.find('.speed-btn').attributes('disabled')).toBeUndefined()
})
it('replay creates a fresh utterance and ignores stale end, error and boundary events', async () => {
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  const old = spoken()
  old.onstart!()
  old.onboundary!({ charIndex: 8 })
  await flushPromises()
  await w.find('.speech-stop').trigger('click')
  await w.find('.play-btn').trigger('click')
  const latest = spoken()
  expect(latest).not.toBe(old)
  latest.onstart!()
  latest.onboundary!({ charIndex: 2 })
  old.onend!()
  old.onerror!()
  old.onboundary!({ charIndex: 9 })
  await flushPromises()
  expect(value(w)).toBe('20')
  expect(w.text()).toContain('播放中')
  expect(w.text()).not.toContain('播放失敗')
})
it('starting another card stops the first; unmounting an inactive card does not cancel the current voice', async () => {
  const a = await setup('a'),
    b = await setup('b')
  await a.find('.play-btn').trigger('click')
  const old = spoken()
  old.onstart!()
  old.onboundary!({ charIndex: 5 })
  await flushPromises()
  await b.find('.play-btn').trigger('click')
  const latest = spoken()
  latest.onstart!()
  await flushPromises()
  expect(value(a)).toBe('0')
  expect(a.text()).toContain('已停止')
  const canceled = engine.cancel.mock.calls.length
  a.unmount()
  wrappers = wrappers.filter((w) => w !== a)
  expect(engine.cancel).toHaveBeenCalledTimes(canceled)
  latest.onboundary!({ charIndex: 3 })
  old.onend!()
  await flushPromises()
  expect(value(b)).toBe('30')
  b.unmount()
  wrappers = wrappers.filter((w) => w !== b)
  expect(engine.cancel.mock.calls.length).toBeGreaterThan(canceled)
})
it('provider errors reveal the transcript and can be retried without adding activity', async () => {
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  spoken().onerror!()
  await flushPromises()
  expect(w.find('[role="alert"]').text()).toContain('語音播放失敗')
  expect(w.text()).toContain(item.script)
  expect(value(w)).toBe('0')
  await w.find('.play-btn').trigger('click')
  spoken().onstart!()
  await flushPromises()
  expect(w.find('[role="alert"]').exists()).toBe(false)
  expect(useProgressStore().session.state.results).toHaveLength(0)
})
it('synchronous provider errors are recoverable', async () => {
  engine.speak.mockImplementationOnce(() => {
    throw Error('unavailable')
  })
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  expect(w.text()).toContain('語音播放失敗')
  expect(value(w)).toBe('0')
  await w.find('.play-btn').trigger('click')
  expect(engine.speak).toHaveBeenCalledTimes(2)
})
it('background stop resets progress and ignores late completion', async () => {
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  const u = spoken()
  u.onstart!()
  u.onboundary!({ charIndex: 6 })
  await flushPromises()
  const beforeStop = engine.cancel.mock.calls.length
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  document.dispatchEvent(new Event('visibilitychange'))
  u.onend!()
  await flushPromises()
  expect(value(w)).toBe('0')
  expect(w.text()).toContain('已停止')
  expect(engine.cancel).toHaveBeenCalledTimes(beforeStop + 1)
})
it('clears an engine left paused before starting a new voice', async () => {
  Object.assign(engine, { paused: true })
  const w = await setup()
  await w.find('.play-btn').trigger('click')
  expect(engine.resume).toHaveBeenCalledOnce()
  expect(engine.speak).toHaveBeenCalledOnce()
  spoken().onstart!()
  await flushPromises()
  expect(w.text()).toContain('播放中')
})
