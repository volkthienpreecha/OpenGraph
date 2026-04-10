export function extractTextContent(buffer: Buffer, type: 'txt' | 'md'): { text: string } {
  const text = buffer.toString('utf-8')
  if (type === 'md') {
    // Strip markdown syntax for cleaner entity extraction
    const stripped = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/>\s/g, '')
    return { text: stripped }
  }
  return { text }
}
