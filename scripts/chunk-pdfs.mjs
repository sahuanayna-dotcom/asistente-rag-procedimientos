import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadDocs, destroyOcrWorker, DATA_DIR } from '../lib/pdf.ts'

const CHUNK_SIZE = 1500
const OVERLAP = 200

function splitIntoParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function splitLongParagraph(paragraph, maxSize, overlap) {
  const pieces = []
  if (paragraph.length <= maxSize) return [paragraph]

  let start = 0
  while (start < paragraph.length) {
    let end = start + maxSize
    if (end < paragraph.length) {
      const breakAt = paragraph.lastIndexOf(' ', end)
      if (breakAt > start + maxSize * 0.6) end = breakAt
    }
    pieces.push(paragraph.slice(start, end).trim())
    if (end >= paragraph.length) break
    start = end - overlap
  }

  return pieces.filter(Boolean)
}

function chunkDocument({ file, docId, text }) {
  const units = splitIntoParagraphs(text).flatMap((paragraph) =>
    splitLongParagraph(paragraph, CHUNK_SIZE, OVERLAP),
  )

  const chunks = []
  let current = ''

  for (const unit of units) {
    if (current && current.length + unit.length + 2 > CHUNK_SIZE) {
      chunks.push(current)
      current = ''
    }
    current = current ? `${current}\n\n${unit}` : unit
  }
  if (current) chunks.push(current)

  return chunks.map((chunkText, index) => ({
    chunkId: `${docId}-chunk-${index + 1}`,
    docId,
    source: file,
    chunkIndex: index,
    text: chunkText,
  }))
}

async function main() {
  const docs = await loadDocs(undefined, ({ file, page, total }) => {
    process.stdout.write(`\r${file}: OCR página ${page}/${total}   `)
  })
  process.stdout.write('\n')

  const chunks = docs.flatMap(chunkDocument)
  const outputPath = join(DATA_DIR, 'chunks.json')

  await writeFile(outputPath, JSON.stringify(chunks, null, 2), 'utf-8')

  for (const doc of docs) {
    const count = chunks.filter((chunk) => chunk.docId === doc.docId).length
    console.log(`${doc.file}: ${doc.text.length} caracteres -> ${count} chunks`)
  }
  console.log(`Total: ${chunks.length} chunks -> ${outputPath}`)
}

main()
  .catch((err) => {
    console.error('Error al generar los chunks:', err)
    process.exit(1)
  })
  .finally(destroyOcrWorker)
