import { it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChoiceQuestion from './ChoiceQuestion.vue'
it('keeps option order stable, reveals correct and wrong answers, and submits only once', async () => {
  const wrapper = mount(ChoiceQuestion, {
    props: { answer: 'right', distractors: ['wrong', 'other', 'fourth'], explanation: '解析' },
  })
  const before = wrapper.findAll('button').map((b) => b.text())
  const wrong = wrapper.findAll('button').find((b) => b.text().includes('wrong'))!
  await wrong.trigger('click')
  expect(wrapper.findAll('button').map((b) => b.text())).toEqual(before)
  expect(wrapper.find('.correct').text()).toContain('right')
  expect(wrapper.find('.wrong').text()).toContain('wrong')
  expect(wrapper.text()).toContain('解析')
  await wrong.trigger('click')
  expect(wrapper.emitted('answer')).toEqual([[false]])
})
