import assert from 'node:assert/strict'
import { assertBank, vocabCount } from '../src/domain/bankContract.mjs'
const levels = ['n5', 'n4', 'n3', 'n2', 'n1']
export function checkData(banks, expectedCounts) {
  const { vocab, grammar, reading, listening } = banks,
    counts = {}
  assertBank('reading', reading)
  assertBank('listening', listening)
  for (const lv of levels) {
    assertBank('vocab', vocab[lv], lv)
    assertBank('grammar', grammar[lv], lv)
    counts[lv] = {
      vocab: vocabCount(vocab[lv]),
      grammar: grammar[lv].length,
      reading: reading.filter((x) => x.level === lv).length,
      listening: listening.filter((x) => x.level === lv).length,
    }
  }
  if (expectedCounts)
    assert.deepEqual(
      expectedCounts,
      counts,
      'counts.json is stale; run node tools/check-data.mjs --write-counts',
    )
  return counts
}
