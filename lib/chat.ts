export const CHAT_API_URL =
  process.env.CHAT_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
export const CHAT_MODEL = process.env.CHAT_MODEL || 'openai/gpt-4o-mini'

const MAX_RETRIES = 5

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface RagChunk {
  source: string
  text: string
}

export function buildRagPrompt(question: string, chunks: RagChunk[]): ChatMessage[] {
  const context = chunks
    .map(
      (chunk, index) =>
        `[Fragmento ${index + 1}]\nFuente: ${chunk.source}\n${chunk.text}`,
    )
    .join('\n\n---\n\n')

  return [
    {
      role: 'system',
      content:
        'Eres un asistente que responde únicamente con base en los fragmentos de documentación proporcionados. ' +
        'Reglas:\n' +
        '1. Responde en español.\n' +
        '2. Usa exclusivamente la información contenida en los fragmentos.\n' +
        '3. Si la información necesaria para responder no aparece en los fragmentos, responde exactamente: "No puedo responder con la documentación disponible."\n' +
        '4. No inventes datos, cifras ni procedimientos.\n' +
        '5. Sé breve y directo; menciona la fuente (nombre del documento) solo cuando sea pertinente.',
    },
    {
      role: 'user',
      content: `Fragmentos recuperados:\n\n${context}\n\n---\n\nPregunta: ${question}`,
    },
  ]
}

export async function chatCompletion({
  messages,
  model = CHAT_MODEL,
  apiKey,
}: {
  messages: ChatMessage[]
  model?: string
  apiKey: string
}): Promise<string> {
  if (!apiKey) throw new Error('Falta la API Key de OpenRouter.')

  const body = { model, messages }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'proyecto-final',
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>
      }
      const content = json.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        throw new Error('La respuesta del modelo no contiene texto válido.')
      }
      return content.trim()
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

    console.error(`  HTTP ${res.status}: reintentando en ${Math.round(waitMs / 1000)}s (intento ${attempt}/${MAX_RETRIES})...`)
    await sleep(waitMs)
  }

  throw new Error('No se pudo completar la petición al modelo.')
}

export async function generateAnswer({
  question,
  chunks,
  apiKey,
  model = CHAT_MODEL,
}: {
  question: string
  chunks: RagChunk[]
  apiKey: string
  model?: string
}): Promise<string> {
  const messages = buildRagPrompt(question, chunks)
  return chatCompletion({ messages, model, apiKey })
}
