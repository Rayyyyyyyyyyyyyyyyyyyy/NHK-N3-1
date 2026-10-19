import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { defineComponent, ref, onMounted } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from './App.vue'
import { useProgressStore } from './stores/progress'
const mounted = vi.fn()
const Lesson = defineComponent({
  setup() {
    const answered = ref(false)
    onMounted(mounted)
    return { answered }
  },
  template:
    '<section data-test="lesson"><h2>練習頁</h2><button @click="answered=true">提交答案</button><p v-if="answered">本題解析</p></section>',
})
const initialWidth = window.innerWidth
let wrapper: VueWrapper | undefined
beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  mounted.mockClear()
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  Object.defineProperty(window, 'innerWidth', { value: initialWidth, configurable: true })
  vi.restoreAllMocks()
})
async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...['/', '/vocab', '/grammar', '/reading', '/listening', '/review'].map((path) => ({
        path,
        component: Lesson,
      })),
    ],
  })
  await router.push('/grammar')
  await router.isReady()
  wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}
it('provides desktop and mobile navigation around exactly one learning page and one level setting', async () => {
  const { wrapper } = await setup()
  expect(wrapper.findAll('main')).toHaveLength(1)
  expect(wrapper.findAll('[data-test="lesson"]')).toHaveLength(1)
  expect(wrapper.findAll('.level-pill')).toHaveLength(5)
  expect(wrapper.findAll('.bottom-nav a')).toHaveLength(5)
  expect(wrapper.findAll('.sidebar-nav a')).toHaveLength(5)
  expect(wrapper.find('.sidebar-nav a.active').text()).toBe('文法')
  expect(wrapper.find('.bottom-nav a.active').text()).toBe('文法')
  expect(wrapper.find('.skip-link').attributes('href')).toBe('#main-content')
  expect(wrapper.find('main').attributes('tabindex')).toBe('-1')
  expect(useProgressStore().session.state.results).toHaveLength(0)
})
it('resizing does not mount a second exercise or lose a submitted answer', async () => {
  const { wrapper } = await setup()
  await wrapper.find('[data-test="lesson"] button').trigger('click')
  expect(wrapper.text()).toContain('本題解析')
  const original = wrapper.find('[data-test="lesson"]').element
  for (const width of [390, 768, 1024, 1440, 390]) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
    window.dispatchEvent(new Event('resize'))
    await flushPromises()
    expect(wrapper.find('[data-test="lesson"]').element).toBe(original)
    expect(wrapper.text()).toContain('本題解析')
  }
  expect(mounted).toHaveBeenCalledTimes(1)
})
it('level switching and review navigation still use the same store and router', async () => {
  const { wrapper, router } = await setup()
  await wrapper
    .findAll('.level-pill')
    .find((b) => b.text() === 'N3')!
    .trigger('click')
  expect(useProgressStore().session.state.level).toBe('n3')
  expect(mounted).toHaveBeenCalledTimes(2)
  expect(wrapper.find('[data-test="lesson"]').text()).not.toContain('本題解析')
  await router.push('/review')
  await flushPromises()
  expect(wrapper.find('.sidebar-link.active').text()).toContain('錯題複習')
  expect(wrapper.findAll('.bottom-nav a.active')).toHaveLength(0)
  expect(wrapper.findAll('[data-test="lesson"]')).toHaveLength(1)
})
