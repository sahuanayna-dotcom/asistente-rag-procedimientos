import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), 'data')
export const CHUNKS_PATH = join(DATA_DIR, 'chunks.json')
export const VECTORS_PATH = join(DATA_DIR, 'vectors.json')

const API_URL = process.env.EMBED_API_URL || 'https://openrouter.ai/api/v1/embeddings'
const MAX_RETRIES = 5

export const MODEL = process.env.EMBED_MODEL || 'openai/text-embedding-3-small'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function requireApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error('Falta la variable OPENROUTER_API_KEY. Configúrala en el archivo .env.')
  }
  return key
}

export async function embedTexts(
  inputs: string[],
  { model = MODEL, apiKey }: { model?: string; apiKey?: string } = {},
): Promise<number[][]> {
  if (inputs.length === 0) return []

  const key = apiKey || requireApiKey()
  const body = { model, input: inputs }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'proyecto-final',
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const json = (await res.json()) as {
        data: Array<{ index: number; embedding: number[] }>
      }
      return json.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding)
    }

    const retrySeconds = Number(res.headers.get('retry-after'))
    const waitMs =
      Number.isFinite(retrySeconds) && retrySeconds > 0
        ? retrySeconds * 1000
        : Math.min(2 ** attempt, 16) * 1000

    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`Error de OpenRouter (HTTP ${res.status}): ${await res.text()}`)
    }

    console.log(`  HTTP ${res.status}: reintentando en ${Math.round(waitMs / 1000)}s (intento ${attempt}/${MAX_RETRIES})...`)
    await sleep(waitMs)
  }

  throw new Error('No se pudo obtener un embedding.')
}

export async function embedText(
  text: string,
  options?: { model?: string; apiKey?: string },
): Promise<number[]> {
  const [vector] = await embedTexts([text], options)
  return vector
}
