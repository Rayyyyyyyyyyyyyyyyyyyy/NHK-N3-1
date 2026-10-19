import { readFileSync, writeFileSync } from 'node:fs'
import { checkData } from './data-contract.mjs'
const read = (name) => JSON.parse(readFileSync(`public/data/${name}.json`, 'utf8'))
const levels = ['n5', 'n4', 'n3', 'n2', 'n1']
const banks = {
  vocab: Object.fromEntries(levels.map((lv) => [lv, read(`vocab-${lv}`)])),
  grammar: Object.fromEntries(levels.map((lv) => [lv, read(`grammar-${lv}`)])),
  reading: read('reading'),
  listening: read('listening'),
}
const write = process.argv.includes('--write-counts'),
  counts = checkData(banks, write ? undefined : read('counts'))
if (write) writeFileSync('public/data/counts.json', JSON.stringify(counts, null, 2) + '\n')
console.log(
  'Four bank structures, levels, stable IDs, unique options and counts verified. Language quality requires separate review.',
)
