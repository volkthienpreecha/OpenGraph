import { PDFParse } from 'pdf-parse'

export async function extractPdfText(buffer: Buffer): Promise<{
  text: string
  pages: number
  info: Record<string, unknown>
}> {
  const parser = new PDFParse({ data: buffer })
  const [textResult, infoResult] = await Promise.all([
    parser.getText(),
    parser.getInfo().catch(() => null),
  ])
  await parser.destroy()

  return {
    text: textResult.text,
    pages: textResult.total,
    info: (infoResult?.info ?? {}) as Record<string, unknown>,
  }
}
