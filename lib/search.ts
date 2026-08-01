import { readFile } from 'node:fs/promises'
import { embedText, MODEL, VECTORS_PATH } from './embeddings.ts'

export interface ChunkRecord {
  chunkId: string
  docId: string
  source: string
  chunkIndex: number
  text: string
  embedding: number[]
}

export interface SearchResult {
  chunkId: string
  docId: string
  source: string
  chunkIndex: number
  text: string
  score: number
}

export async function loadVectors(): Promise<ChunkRecord[]> {
  try {
    const records = JSON.parse(await readFile(VECTORS_PATH, 'utf-8')) as ChunkRecord[]
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error(`${VECTORS_PATH} está vacío o tiene un formato inválido.`)
    }
    return records
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`No se encontró ${VECTORS_PATH}. Ejecuta primero: npm run embed`)
    }
    throw err
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function searchVectors(
  query: string,
  { topK = 5, model = MODEL, apiKey }: { topK?: number; model?: string; apiKey?: string } = {},
): Promise<SearchResult[]> {
  const records = await loadVectors()
  const queryVector = await embedText(query, { model, apiKey })

  return records
    .map((record) => ({
      chunkId: record.chunkId,
      docId: record.docId,
      source: record.source,
      chunkIndex: record.chunkIndex,
      text: record.text,
      score: cosineSimilarity(queryVector, record.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
