import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { assignReadingIds } from './reading-ids.mjs'
const path = 'public/data/reading.json',
  sequencePath = 'tools/reading-id-sequence.json'
const articles = JSON.parse(readFileSync(path, 'utf8'))
const sequence = assignReadingIds(
  articles,
  existsSync(sequencePath) ? JSON.parse(readFileSync(sequencePath, 'utf8')) : 1,
)
writeFileSync(path, JSON.stringify(articles, null, 2) + '\n')
writeFileSync(sequencePath, JSON.stringify(sequence) + '\n')
