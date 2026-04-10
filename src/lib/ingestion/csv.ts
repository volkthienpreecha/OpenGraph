export function extractCsvText(buffer: Buffer): { text: string; rows: string[][] } {
  const raw = buffer.toString('utf-8')
  const rows = raw.split('\n').map(line =>
    line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
  ).filter(row => row.some(cell => cell.length > 0))

  // Join all cell values as plain text for entity extraction
  const text = rows.map(row => row.join(' ')).join('\n')
  return { text, rows }
}
