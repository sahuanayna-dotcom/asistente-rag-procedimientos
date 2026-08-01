import { searchVectors } from '../../../lib/search'
import { generateAnswer } from '../../../lib/chat'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''

    if (!question) {
      return Response.json({ error: 'Falta el campo "question".' }, { status: 400 })
    }

    if (!apiKey) {
      return Response.json({ error: 'Falta el campo "apiKey".' }, { status: 400 })
    }

    const chunks = await searchVectors(question, { topK: 5, apiKey })

    if (chunks.length === 0) {
      return Response.json(
        { error: 'No se encontraron fragmentos relevantes en la documentación.' },
        { status: 404 },
      )
    }

    const answer = await generateAnswer({ question, chunks, apiKey })

    return Response.json({ answer })
  } catch (err) {
    console.error('Error en /api/chat:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido.'
    return Response.json({ error: message }, { status: 500 })
  }
}
