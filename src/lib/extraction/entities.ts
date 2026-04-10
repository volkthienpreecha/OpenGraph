import nlp from 'compromise'

export interface ExtractedEntity {
  name: string
  type: 'person' | 'organization' | 'email' | 'url'
  mentions: number
  contexts: string[]
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

/**
 * Collect up to `maxContexts` surrounding snippets for every occurrence of
 * `match` in `text`. Previously only the first occurrence was captured.
 */
function getAllContexts(text: string, match: string, windowSize = 120, maxContexts = 5): string[] {
  const contexts: string[] = []
  const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null && contexts.length < maxContexts) {
    const start = Math.max(0, m.index - windowSize / 2)
    const end = Math.min(text.length, m.index + match.length + windowSize / 2)
    contexts.push('…' + text.slice(start, end).replace(/\n+/g, ' ').trim() + '…')
  }
  return contexts.length > 0 ? contexts : ['']
}

function countOccurrences(text: string, term: string): number {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (text.match(new RegExp(escaped, 'gi')) || []).length
}

export function extractEntities(text: string): ExtractedEntity[] {
  const results = new Map<string, ExtractedEntity>()

  /**
   * Insert an entity exactly once. Subsequent calls for the same key are
   * ignored — `countOccurrences` already captures the correct total on the
   * first call, so incrementing again on duplicates would inflate the count.
   */
  function upsert(name: string, type: ExtractedEntity['type']) {
    const key = `${type}:${name.toLowerCase()}`
    if (!results.has(key)) {
      results.set(key, {
        name,
        type,
        mentions: countOccurrences(text, name),
        contexts: getAllContexts(text, name),
      })
    }
  }

  const doc = nlp(text)

  // Deduplicate NLP arrays before processing to prevent double-counting when
  // compromise returns the same surface form more than once.
  const people = [...new Set(doc.people().out('array') as string[])]
  for (const name of people) {
    const cleaned = name.trim()
    if (cleaned.length > 1 && cleaned.length < 80) upsert(cleaned, 'person')
  }

  const orgs = [...new Set(doc.organizations().out('array') as string[])]
  for (const org of orgs) {
    const cleaned = org.trim()
    if (cleaned.length > 1 && cleaned.length < 100) upsert(cleaned, 'organization')
  }

  // Deduplicate emails before upsert so `countOccurrences` isn't
  // supplemented by extra `mentions++` calls for repeated addresses.
  const emails = [...new Set((text.match(EMAIL_RE) || []).map(e => e.toLowerCase()))]
  for (const email of emails) {
    upsert(email, 'email')
  }

  // Deduplicate URLs at hostname level before upsert.
  const hostnames = new Set<string>()
  for (const url of text.match(URL_RE) || []) {
    try {
      hostnames.add(new URL(url).hostname)
    } catch {
      hostnames.add(url.slice(0, 100))
    }
  }
  for (const hostname of hostnames) {
    upsert(hostname, 'url')
  }

  return Array.from(results.values()).filter(e => e.mentions > 0)
}
