// pdf-parse uses dynamic require internally — works in Node.js server context
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number; info: Record<string, unknown> }> {
  const data = await pdfParse(buffer)
  return {
    text: data.text as string,
    pages: data.numpages as number,
    info: (data.info ?? {}) as Record<string, unknown>,
  }
}
