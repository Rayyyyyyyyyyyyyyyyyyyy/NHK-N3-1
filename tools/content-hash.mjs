import { createHash } from 'node:crypto'
export const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value
export const digest = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
export const byId = (a, b) => a.id.localeCompare(b.id)
export const readingContent = (articles) =>
  articles
    .map((a) => ({
      ...a,
      questions: a.questions
        .map(({ id, ...q }) => q)
        .sort((a, b) => JSON.stringify(canonical(a)).localeCompare(JSON.stringify(canonical(b)))),
    }))
    .sort(byId)
