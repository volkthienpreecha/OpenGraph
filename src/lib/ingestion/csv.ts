/**
 * RFC 4180-compliant CSV parser.
 * Handles quoted fields that contain commas, newlines, and escaped double-quotes ("").
 */
function parseCSV(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < raw.length) {
    const ch = raw[i]

    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          // Escaped quote inside a quoted field
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field.trim())
        field = ''
      } else if (ch === '\r' || ch === '\n') {
        // Handle \r\n as a single line ending
        if (ch === '\r' && raw[i + 1] === '\n') i++
        row.push(field.trim())
        if (row.some(c => c.length > 0)) rows.push(row)
        row = []
        field = ''
        i++
        continue
      } else {
        field += ch
      }
    }
    i++
  }

  // Flush last field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim())
    if (row.some(c => c.length > 0)) rows.push(row)
  }

  return rows
}

export function extractCsvText(buffer: Buffer): { text: string; rows: string[][] } {
  const raw = buffer.toString('utf-8')
  const rows = parseCSV(raw)
  const text = rows.map(row => row.join(' ')).join('\n')
  return { text, rows }
}
