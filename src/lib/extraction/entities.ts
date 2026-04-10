import nlp from 'compromise'

export interface ExtractedEntity {
  name: string
  type: 'person' | 'organization' | 'email' | 'url'
  mentions: number
  contexts: string[]
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

function getContext(text: string, match: string, windowSize = 120): string {
  const idx = text.indexOf(match)
  if (idx === -1) return ''
  const start = Math.max(0, idx - windowSize / 2)
  const end = Math.min(text.length, idx + match.length + windowSize / 2)
  return '…' + text.slice(start, end).replace(/\n+/g, ' ').trim() + '…'
}

function countOccurrences(text: string, term: string): number {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (text.match(new RegExp(escaped, 'gi')) || []).length
}

export function extractEntities(text: string): ExtractedEntity[] {
  const results = new Map<string, ExtractedEntity>()

  function upsert(name: string, type: ExtractedEntity['type']) {
    const key = `${type}:${name.toLowerCase()}`
    if (results.has(key)) {
      const existing = results.get(key)!
      existing.mentions++
    } else {
      results.set(key, {
        name,
        type,
        mentions: countOccurrences(text, name),
        contexts: [getContext(text, name)],
      })
    }
  }

  // NLP: people + organizations
  const doc = nlp(text)

  // People
  const people = doc.people().out('array') as string[]
  for (const name of people) {
    const cleaned = name.trim()
    if (cleaned.length > 1 && cleaned.length < 80) {
      upsert(cleaned, 'person')
    }
  }

  // Organizations
  const orgs = doc.organizations().out('array') as string[]
  for (const org of orgs) {
    const cleaned = org.trim()
    if (cleaned.length > 1 && cleaned.length < 100) {
      upsert(cleaned, 'organization')
    }
  }

  // Emails via regex
  const emails = text.match(EMAIL_RE) || []
  for (const email of emails) {
    upsert(email.toLowerCase(), 'email')
  }

  // URLs via regex
  const urls = text.match(URL_RE) || []
  for (const url of urls) {
    // Deduplicate to domain level for display, keep full URL in metadata
    try {
      const parsed = new URL(url)
      upsert(parsed.hostname, 'url')
    } catch {
      upsert(url.slice(0, 100), 'url')
    }
  }

  return Array.from(results.values()).filter(e => e.mentions > 0)
}
