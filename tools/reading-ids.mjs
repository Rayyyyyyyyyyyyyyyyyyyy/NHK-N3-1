export function assignReadingIds(articles, highWater = 1) {
  let sequence = Math.max(
    highWater,
    1,
    ...articles.flatMap((a) =>
      a.questions.map((q) => (q.id ? Number(q.id.split('-').at(-1)) + 1 : 1)),
    ),
  )
  if (!Number.isSafeInteger(sequence)) throw Error('Invalid reading ID sequence')
  for (const article of articles)
    for (const q of article.questions) if (!q.id) q.id = `rq-${String(sequence++).padStart(4, '0')}`
  return sequence
}
