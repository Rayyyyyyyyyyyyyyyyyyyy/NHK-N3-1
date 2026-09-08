import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const levels = ['n5', 'n4', 'n3', 'n2', 'n1']
const read = (file) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8'))
function question(q) {
  assert.equal(typeof q.q, 'string')
  assert.equal(typeof q.answer, 'string')
  assert.equal(q.distractors.length, 3)
  assert.equal(new Set([q.answer, ...q.distractors]).size, 4)
  assert(q.distractors.every((x) => typeof x === 'string'))
  assert.equal(typeof q.explanation, 'string')
}
const reading = read('reading'),
  listening = read('listening'),
  counts = {}
for (const lv of levels) {
  const vocab = read(`vocab-${lv}`),
    grammar = read(`grammar-${lv}`)
  grammar.forEach((q) => {
    question(q)
    assert.match(q.id, new RegExp(`^g-${lv}-\\d{3,}$`))
  })
  assert.equal(new Set(grammar.map((q) => q.id)).size, grammar.length)
  counts[lv] = {
    vocab: vocab.length,
    grammar: grammar.length,
    reading: reading.filter((x) => x.level === lv).length,
    listening: listening.filter((x) => x.level === lv).length,
  }
}
reading.forEach((a) => a.questions.forEach(question))
listening.forEach(question)
if (process.argv.includes('--write-counts'))
  writeFileSync('public/data/counts.json', JSON.stringify(counts, null, 2) + '\n')
else
  assert.deepEqual(
    read('counts'),
    counts,
    'counts.json is stale; run node tools/check-data.mjs --write-counts',
  )
console.log('Question structures, stable grammar IDs and counts verified.')
