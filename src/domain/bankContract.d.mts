import type { Banks, BankKind, Vocab } from './questions'
import type { Level } from './progress/state'

export function assertBank<K extends BankKind>(
  kind: K,
  items: unknown,
  level?: Level,
): asserts items is Banks[K][]
export function vocabCount(items: readonly Vocab[]): number
