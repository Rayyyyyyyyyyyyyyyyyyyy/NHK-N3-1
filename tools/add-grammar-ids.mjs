import { readFileSync, writeFileSync } from 'node:fs'
const sequencePath = 'tools/grammar-id-sequences.json'
const nextIds = JSON.parse(readFileSync(sequencePath, 'utf8'))
for (const level of ['n5', 'n4', 'n3', 'n2', 'n1']) {
  const path = `public/data/grammar-${level}.json`
  const data = JSON.parse(readFileSync(path, 'utf8'))
  // Keep a high-water mark so deleting a question never lets its ID be reused.
  let sequence = Math.max(
    nextIds[level],
    ...data.map((q) => (q.id ? Number(q.id.split('-').at(-1)) + 1 : 1)),
  )
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw Error(`Invalid ID sequence for ${level}`)
  for (const q of data) {
    if (!q.id) q.id = `g-${level}-${String(sequence++).padStart(3, '0')}`
  }
  nextIds[level] = sequence
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}
writeFileSync(sequencePath, JSON.stringify(nextIds, null, 2) + '\n')
