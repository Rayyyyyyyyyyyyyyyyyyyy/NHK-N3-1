import assert from 'node:assert/strict'
const levels = ['n5', 'n4', 'n3', 'n2', 'n1']
const text = (v, label) =>
  assert(typeof v === 'string' && v.trim().length > 0, `${label}: expected nonempty string`)
function question(q) {
  text(q.q, 'q')
  text(q.answer, 'answer')
  assert(Array.isArray(q.distractors) && q.distractors.length === 3, 'three distractors required')
  q.distractors.forEach((v) => text(v, 'distractor'))
  assert.equal(new Set([q.answer, ...q.distractors]).size, 4, 'four unique options required')
  text(q.explanation, 'explanation')
}
function unique(items, label) {
  assert.equal(new Set(items).size, items.length, `${label}: duplicate ID`)
}
export function checkData(banks, expectedCounts) {
  const { vocab, grammar, reading, listening } = banks,
    counts = {}
  assert(Array.isArray(reading) && Array.isArray(listening), 'reading/listening must be arrays')
  for (const lv of levels) {
    assert(Array.isArray(vocab[lv]) && Array.isArray(grammar[lv]), `${lv}: missing banks`)
    for (const v of vocab[lv]) {
      text(v.w, 'word')
      text(v.r, 'reading')
      assert(
        typeof v.zh === 'string' && typeof v.en === 'string',
        'vocabulary translations must be strings',
      )
      assert(v.zh.trim() || v.en.trim(), 'at least one translation required')
    }
    for (const q of grammar[lv]) {
      question(q)
      assert.match(q.id, new RegExp(`^g-${lv}-\\d{3,}$`))
    }
    unique(
      grammar[lv].map((q) => q.id),
      `${lv} grammar`,
    )
    counts[lv] = {
      vocab: vocab[lv].length,
      grammar: grammar[lv].length,
      reading: reading.filter((x) => x.level === lv).length,
      listening: listening.filter((x) => x.level === lv).length,
    }
  }
  for (const a of reading) {
    text(a.id, 'article ID')
    assert(levels.includes(a.level), 'invalid reading level')
    for (const k of ['title', 'type', 'text']) text(a[k], k)
    assert(Array.isArray(a.notes), 'notes required')
    for (const n of a.notes) {
      text(n.term, 'note term')
      text(n.meaning, 'note meaning')
    }
    assert(Array.isArray(a.questions) && a.questions.length > 0, 'article must have questions')
    for (const q of a.questions) {
      text(q.id, 'subquestion ID')
      question(q)
    }
  }
  for (const q of listening) {
    text(q.id, 'listening ID')
    assert(levels.includes(q.level), 'invalid listening level')
    text(q.script, 'script')
    question(q)
  }
  unique(
    reading.map((x) => x.id),
    'reading',
  )
  unique(
    reading.flatMap((x) => x.questions.map((q) => q.id)),
    'reading subquestion',
  )
  unique(
    listening.map((x) => x.id),
    'listening',
  )
  if (expectedCounts)
    assert.deepEqual(
      expectedCounts,
      counts,
      'counts.json is stale; run node tools/check-data.mjs --write-counts',
    )
  return counts
}
