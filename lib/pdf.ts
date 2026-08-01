import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFParse } from 'pdf-parse'
import { createWorker } from 'tesseract.js'

export const DATA_DIR = join(process.cwd(), 'data')
export const EXTRACTED_PATH = join(DATA_DIR, 'extracted.json')
export const OCR_LANG = 'spa'

export interface ExtractedDoc {
  file: string
  docId: string
  text: string
}

export interface OcrProgress {
  file: string
  page: number
  total: number
}

let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null

async function getOcrWorker() {
  if (!ocrWorker) ocrWorker = await createWorker(OCR_LANG)
  return ocrWorker
}

export async function destroyOcrWorker() {
  if (ocrWorker) {
    await ocrWorker.terminate()
    ocrWorker = null
  }
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function ocrPageImage(imageBuffer: Buffer): Promise<string> {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(imageBuffer, {}, { text: true })
  return data.text
}

async function extractPdf(
  file: string,
  dir: string,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  const buffer = await readFile(join(dir, file))
  const parser = new PDFParse({ data: buffer })

  const { total: pageCount } = await parser.getInfo()

  const pagesText: string[] = []
  for (let page = 1; page <= pageCount; page++) {
    const result = await parser.getImage({
      partial: [page],
      imageDataUrl: false,
      imageBuffer: true,
    })
    const images = result.pages[0]?.images ?? []
    const pageText = images.length > 0 ? await ocrPageImage(Buffer.from(images[0].data)) : ''
    pagesText.push(`-- ${page} of ${pageCount} --\n\n${normalizeText(pageText)}`)
    if (onProgress) onProgress({ file, page, total: pageCount })
  }

  await parser.destroy()
  return pagesText.join('\n\n')
}

export async function extractPdfs(
  dir: string = DATA_DIR,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ExtractedDoc[]> {
  const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.pdf'))
  const docs: ExtractedDoc[] = []

  for (const file of files) {
    const text = await extractPdf(file, dir, onProgress)
    docs.push({ file, docId: file.replace(/\.pdf$/i, ''), text })
  }

  return docs
}

export async function loadDocs(
  dir: string = DATA_DIR,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ExtractedDoc[]> {
  try {
    return JSON.parse(await readFile(EXTRACTED_PATH, 'utf-8')) as ExtractedDoc[]
  } catch {
    const docs = await extractPdfs(dir, onProgress)
    await writeFile(EXTRACTED_PATH, JSON.stringify(docs, null, 2), 'utf-8')
    return docs
  }
}
