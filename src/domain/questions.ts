import type { Level } from './progress/state'
export interface Vocab {
  w: string
  r: string
  zh: string
  en: string
}
export interface Question {
  q: string
  answer: string
  distractors: string[]
  explanation: string
}
export interface Grammar extends Question {
  id: string
}
export interface Reading {
  id: string
  level: Level
  title: string
  type: string
  text: string
  notes: { term: string; meaning: string }[]
  questions: Question[]
}
export interface Listening extends Question {
  id: string
  level: Level
  script: string
}
export interface Banks {
  vocab: Vocab
  grammar: Grammar
  reading: Reading
  listening: Listening
}
export type BankKind = keyof Banks
export const BANK_KINDS: BankKind[] = ['vocab', 'grammar', 'reading', 'listening']
export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export function drawDeck(
  vocab: Vocab[],
  known: Record<string, true>,
  learning: Record<string, true>,
): Vocab[] {
  const unique = [...new Map(vocab.map((v) => [v.w, v])).values()]
  return [
    ...shuffle(unique.filter((v) => learning[v.w])),
    ...shuffle(unique.filter((v) => !learning[v.w] && !known[v.w])),
    ...shuffle(unique.filter((v) => known[v.w] && !learning[v.w])),
  ].slice(0, 10)
}
export function grammarQueue(items: Grammar[], done: string[]): Grammar[] {
  return [
    ...shuffle(items.filter((q) => !done.includes(q.id))),
    ...shuffle(items.filter((q) => done.includes(q.id))),
  ]
}
export function quizFor(items: Vocab[]) {
  const item = items[Math.floor(Math.random() * items.length)]
  const others = [...new Set(shuffle(items.filter((v) => v.r !== item.r)).map((v) => v.r))].slice(
    0,
    3,
  )
  return { item, options: shuffle([item.r, ...others]) }
}
