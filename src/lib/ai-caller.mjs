/**
 * Standalone AI caller — runs outside of Next.js Turbopack.
 * Usage: node ai-caller.mjs <provider> <apiKey> <inputFile> <outputFile>
 */
import https from 'node:https'
import { readFileSync, writeFileSync } from 'node:fs'

const [,, provider, apiKey, inputFile, outputFile] = process.argv
const { system: systemPrompt, user: userPrompt } = JSON.parse(readFileSync(inputFile, 'utf-8'))

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }, timeout: 180000 },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${text.substring(0, 500)}`))
          else resolve(text)
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout 180s')) })
    req.write(body)
    req.end()
  })
}

let content
if (provider === 'openai') {
  const raw = await httpsPost('api.openai.com', '/v1/chat/completions', {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }, JSON.stringify({
    model: 'gpt-4o-mini',
    max_tokens: 8192,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }))
  const data = JSON.parse(raw)
  content = data.choices[0].message.content
} else {
  const raw = await httpsPost('api.anthropic.com', '/v1/messages', {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }, JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  }))
  const data = JSON.parse(raw)
  content = data.content[0].text
}

writeFileSync(outputFile, content)
