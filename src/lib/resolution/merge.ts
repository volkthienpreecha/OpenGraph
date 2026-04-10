import type { Entity, MergeCandidate } from '@/types'

/** Jaro–Winkler similarity [0, 1] */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const s1l = s1.length, s2l = s2.length
  const matchDist = Math.max(Math.floor(Math.max(s1l, s2l) / 2) - 1, 0)
  const s1m = new Array(s1l).fill(false)
  const s2m = new Array(s2l).fill(false)
  let matches = 0, transpositions = 0

  for (let i = 0; i < s1l; i++) {
    const lo = Math.max(0, i - matchDist)
    const hi = Math.min(i + matchDist + 1, s2l)
    for (let j = lo; j < hi; j++) {
      if (s2m[j] || s1[i] !== s2[j]) continue
      s1m[i] = s2m[j] = true
      matches++
      break
    }
  }
  if (!matches) return 0

  let k = 0
  for (let i = 0; i < s1l; i++) {
    if (!s1m[i]) continue
    while (!s2m[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro = (matches / s1l + matches / s2l + (matches - transpositions / 2) / matches) / 3
  const prefix = [...s1].findIndex((c, i) => c !== s2[i])
  const p = prefix === -1 ? Math.min(s1l, 4) : Math.min(prefix, 4)
  return jaro + p * 0.1 * (1 - jaro)
}

export function findMergeCandidates(entities: Entity[], threshold = 0.88): MergeCandidate[] {
  const candidates: MergeCandidate[] = []
  const active = entities.filter(e => e.mergedInto === null)

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j]
      if (a.type !== b.type) continue

      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()

      // Strong signal: one name contains the other
      const containment = nameA.includes(nameB) || nameB.includes(nameA)
      const sim = jaroWinkler(nameA, nameB)

      // Email = strong identifier — direct match
      if (a.type === 'email' && nameA === nameB) {
        candidates.push({ entity1: a, entity2: b, similarity: 1, reason: 'exact email match' })
        continue
      }

      if (sim >= threshold || (containment && Math.min(nameA.length, nameB.length) >= 4)) {
        candidates.push({
          entity1: a,
          entity2: b,
          similarity: sim,
          reason: containment ? 'name containment' : `${Math.round(sim * 100)}% name similarity`,
        })
      }
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 50)
}
