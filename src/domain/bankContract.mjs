const levels = ['n5', 'n4', 'n3', 'n2', 'n1']
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v) => typeof v === 'string' && v.trim().length > 0
function check(condition, message) {
  if (!condition) throw Error(message)
}
function unique(ids, label) {
  check(new Set(ids).size === ids.length, `${label}: duplicate ID`)
}
function question(q) {
  for (const key of ['q', 'answer', 'explanation'])
    check(text(q[key]), `${key}: expected nonempty string`)
  check(Array.isArray(q.distractors) && q.distractors.length === 3, 'three distractors required')
  check(q.distractors.every(text), 'distractor: expected nonempty string')
  check(new Set([q.answer, ...q.distractors]).size === 4, 'four unique options required')
}
export function assertBank(kind, items, level) {
  check(['vocab', 'grammar', 'reading', 'listening'].includes(kind), 'unknown bank kind')
  check(Array.isArray(items), `${kind}: expected array`)
  for (const item of items) {
    check(object(item), `${kind}: expected item object`)
    if (kind === 'vocab') {
      check(text(item.w) && text(item.r), 'word and reading: expected nonempty string')
      check(
        typeof item.zh === 'string' && typeof item.en === 'string',
        'vocabulary translations must be strings',
      )
      check(item.zh.trim() || item.en.trim(), 'at least one translation required')
      continue
    }
    check(text(item.id), `${kind}: expected nonempty ID`)
    if (kind === 'grammar') {
      check(
        levels.includes(level) && new RegExp(`^g-${level}-\\d{3,}$`).test(item.id),
        'invalid grammar ID or level',
      )
      question(item)
      continue
    }
    check(levels.includes(item.level), `invalid ${kind} level`)
    if (kind === 'listening') {
      check(text(item.script), 'script: expected nonempty string')
      question(item)
      continue
    }
    for (const key of ['title', 'type', 'text'])
      check(text(item[key]), `${key}: expected nonempty string`)
    check(Array.isArray(item.notes), 'notes required')
    for (const note of item.notes)
      check(object(note) && text(note.term) && text(note.meaning), 'invalid reading note')
    check(Array.isArray(item.questions) && item.questions.length > 0, 'article must have questions')
    for (const q of item.questions) {
      check(object(q) && text(q.id), 'subquestion: expected nonempty ID')
      question(q)
    }
  }
  if (kind !== 'vocab')
    unique(
      items.map((x) => x.id),
      kind,
    )
  if (kind === 'reading')
    unique(
      items.flatMap((x) => x.questions.map((q) => q.id)),
      'reading subquestion',
    )
}
export const vocabCount = (items) => new Set(items.map((v) => v.w)).size
