import { searchVectors } from '../lib/search.ts'

function parseArgs(argv) {
  const args = argv.slice(2)
  const topKIndex = args.indexOf('--top-k')

  let topK = 5
  if (topKIndex !== -1 && args[topKIndex + 1]) {
    topK = Number(args[topKIndex + 1])
    args.splice(topKIndex, 2)
  }

  return { query: args.join(' ').trim(), topK }
}

async function main() {
  const { query, topK } = parseArgs(process.argv)

  if (!query) {
    console.error('Uso: node scripts/search.mjs "tu consulta" [--top-k N]')
    process.exit(1)
  }

  const results = await searchVectors(query, { topK })

  console.log(`Consulta: "${query}"`)
  console.log(`Top ${results.length} resultados:\n`)

  results.forEach((result, index) => {
    console.log(`${index + 1}. [${result.score.toFixed(4)}] ${result.chunkId} (${result.source}, chunk ${result.chunkIndex})`)
    console.log(`   ${result.text.slice(0, 220).replace(/\n/g, ' ')}...`)
    console.log('')
  })
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
