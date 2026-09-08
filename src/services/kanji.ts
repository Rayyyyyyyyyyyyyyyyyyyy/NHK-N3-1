export interface Kanji {
  on_readings: string[]
  kun_readings: string[]
  meanings: string[]
  jlpt: number | null
}
const cache = new Map<string, Kanji>()
export async function lookupKanji(char: string): Promise<Kanji> {
  if (cache.has(char)) return cache.get(char)!
  const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`)
  if (!res.ok) throw Error('查詢失敗，稍後再試')
  const data = await res.json()
  if (
    !['on_readings', 'kun_readings', 'meanings'].every(
      (k) => Array.isArray(data[k]) && data[k].every((v: unknown) => typeof v === 'string'),
    )
  )
    throw Error('查詢資料格式錯誤')
  cache.set(char, data)
  return data
}
