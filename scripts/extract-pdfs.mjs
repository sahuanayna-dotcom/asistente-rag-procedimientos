import { writeFile } from 'node:fs/promises'
import { extractPdfs, destroyOcrWorker, EXTRACTED_PATH } from '../lib/pdf.ts'

async function main() {
  const docs = await extractPdfs(undefined, ({ file, page, total }) => {
    process.stdout.write(`\r${file}: OCR página ${page}/${total}   `)
  })
  process.stdout.write('\n')

  await writeFile(EXTRACTED_PATH, JSON.stringify(docs, null, 2), 'utf-8')

  const total = docs.reduce((acc, doc) => acc + doc.text.length, 0)
  for (const doc of docs) console.log(`${doc.file}: ${doc.text.length} caracteres`)
  console.log(`Total: ${docs.length} PDFs, ${total} caracteres extraídos -> ${EXTRACTED_PATH}`)
}

main()
  .catch((err) => {
    console.error('\nError al extraer el texto:', err)
    process.exit(1)
  })
  .finally(destroyOcrWorker)
