import { readFile, writeFile } from 'node:fs/promises'
import { embedTexts, MODEL, CHUNKS_PATH, VECTORS_PATH } from '../lib/embeddings.ts'

const BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE ?? 32)
const BATCH_DELAY_MS = Number(process.env.EMBED_DELAY_MS ?? 1000)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      'Falta la variable OPENROUTER_API_KEY. Agrégala al archivo .env (OPENROUTER_API_KEY=sk-...) y vuelve a ejecutar npm run embed.',
    )
    process.exit(1)
  }

  const chunks = JSON.parse(await readFile(CHUNKS_PATH, 'utf-8'))

  const existing = new Map()
  try {
    const prev = JSON.parse(await readFile(VECTORS_PATH, 'utf-8'))
    for (const record of prev) existing.set(record.chunkId, record)
  } catch {
    // vectors.json aún no existe
  }

  const pending = chunks.filter((chunk) => !existing.has(chunk.chunkId))
  console.log(
    `Chunks totales: ${chunks.length} | ya embedidos: ${existing.size} | pendientes: ${pending.length} (modelo: ${MODEL})`,
  )

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    const embeddings = await embedTexts(batch.map((chunk) => chunk.text))

    batch.forEach((chunk, index) => {
      const embedding = embeddings[index]
      if (!embedding) {
        throw new Error(`Respuesta sin embedding para el índice ${index} (chunk ${chunk.chunkId})`)
      }
      existing.set(chunk.chunkId, {
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        source: chunk.source,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding,
      })
    })

    process.stdout.write(`\rProcesados ${Math.min(i + BATCH_SIZE, pending.length)}/${pending.length} chunks   `)
    if (i + BATCH_SIZE < pending.length) await sleep(BATCH_DELAY_MS)
  }
  process.stdout.write('\n')

  const records = chunks.map((chunk) => existing.get(chunk.chunkId))
  await writeFile(VECTORS_PATH, JSON.stringify(records, null, 2), 'utf-8')
  console.log(`Vectores guardados: ${records.length} -> ${VECTORS_PATH}`)
}

main().catch((err) => {
  console.error('Error al generar embeddings:', err.message)
  process.exit(1)
})
