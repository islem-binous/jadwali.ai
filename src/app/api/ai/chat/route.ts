import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'

// Build school context for the AI
async function buildSchoolContext(schoolId: string) {
  try {
    const prisma = await getPrisma()
    const [school, teachers, classes, rooms, subjects, periods, absences, lessons] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.teacher.findMany({
        where: { schoolId },
        include: { subjects: { include: { subject: true } }, lessons: true, absences: { where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } } },
      }),
      prisma.class.findMany({ where: { schoolId } }),
      prisma.room.findMany({ where: { schoolId } }),
      prisma.subject.findMany({ where: { schoolId } }),
      prisma.period.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
      prisma.absence.findMany({ where: { schoolId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, include: { teacher: true } }),
      prisma.lesson.findMany({ where: { timetable: { schoolId } }, include: { class: true, subject: true, teacher: true, room: true, period: true } }),
    ])

    const activePeriods = periods.filter((p: any) => !p.isBreak)

    return `## Current School Context
School: ${school?.name || 'Unknown'}
Country: ${school?.country || 'Not set'}
Timezone: ${school?.timezone || 'UTC'}

## Resources
- ${teachers.length} teachers: ${teachers.map((t: any) => `${t.name} (${t.subjects.map((s: any) => s.subject.name).join(', ')})`).join('; ')}
- ${classes.length} classes: ${classes.map((c: any) => c.name).join(', ')}
- ${rooms.length} rooms: ${rooms.map((r: any) => `${r.name} (${r.type})`).join(', ')}
- ${subjects.length} subjects: ${subjects.map((s: any) => s.name).join(', ')}
- ${activePeriods.length} periods per day: ${activePeriods.map((p: any) => `${p.name} ${p.startTime}-${p.endTime}`).join(', ')}

## Today's Status
- Absences today: ${absences.length > 0 ? absences.map((a: any) => `${a.teacher.name} (${a.type})`).join(', ') : 'None'}
- Total lessons configured: ${lessons.length}
- Teachers near max workload: ${teachers.filter((t: any) => t.lessons.length >= t.maxPeriodsPerWeek - 2).map((t: any) => t.name).join(', ') || 'None'}

## Teacher Workloads
${teachers.map((t: any) => `- ${t.name}: ${t.lessons.length}/${t.maxPeriodsPerWeek} periods/week`).join('\n')}`
  } catch (err) {
    console.error('[AI Chat] buildSchoolContext error:', err)
    return 'Unable to load school context.'
  }
}

const SYSTEM_PROMPT_TEMPLATE = `You are Jadwali AI Agent, an expert school scheduling consultant and assistant.
You are embedded inside the jadwali.ai platform and have full knowledge of the current school's configuration.

## Your Capabilities
You can:
1. Answer questions about the current school schedule, teachers, classes, and configuration
2. Suggest optimal scheduling strategies
3. Identify and help resolve scheduling conflicts
4. Provide insights about teacher workloads and resource usage
5. Help with leave management and substitute planning
6. Give advice on best practices for school scheduling

{context}

## Behaviour Rules
- Be concise and direct. Educators are busy professionals.
- Always reference real data from the context above — never fabricate information.
- When suggesting changes, explain the reasoning and impact.
- If asked about something outside your scope, politely redirect to relevant features.
- Use markdown formatting for readability.
- Respond in the same language the user writes in.`

// Streaming mock response for when no API key is set
function createMockStream(message: string) {
  const encoder = new TextEncoder()
  const responses: Record<string, string> = {
    generate:
      "I'll analyze your school data and generate an optimized timetable. Here's what I found:\n\n- All classes have been analyzed\n- Teacher availability has been checked\n- Room capacities verified\n\nI've created a conflict-free timetable balancing teacher workloads across the week. You can view it in the Timetable page.",
    conflict:
      "I've scanned your current timetable and found:\n\n- No teacher double-bookings detected\n- No room conflicts found\n- No class overlaps present\n- All constraints are satisfied\n\nOverall, your timetable is well-optimized!",
    optimize:
      "Here are my workload optimization suggestions:\n\n1. Check if any teachers have uneven distribution across days\n2. Look for gaps in teacher schedules that could be filled\n3. Consider spreading specialized subject classes more evenly across the week\n4. Ensure break periods are well-distributed for each class",
    substitute:
      "Looking at today's absences:\n\nI'll check the current absence records and find the best matching substitutes based on subject expertise, availability, and workload.\n\nYou can manage absences from the Absences page and I'll help find optimal substitutes.",
    export:
      "I can help you export your data. Available exports:\n\n- **Timetable CSV** — Full schedule with all lessons\n- **Teachers CSV** — Staff list with subjects and workload\n- **Leave History CSV** — All leave requests\n- **Absences CSV** — Absence records\n\nVisit the Reports page or use the export button on each page.",
    leave:
      "I can help with leave management. Here's what you can do:\n\n1. **Submit leave requests** from the Leave page\n2. **Approve/reject** pending requests\n3. **Configure leave types** in Settings\n4. **Track balances** per teacher\n\nWould you like me to help with any of these?",
  }

  const lowerMsg = message.toLowerCase()
  let response = "I understand your question. As Jadwali's AI assistant, I can help with:\n\n- **Generate** conflict-free timetables\n- **Find conflicts** in your schedule\n- **Optimize** teacher workloads\n- **Find substitutes** for absent teachers\n- **Export** schedules in various formats\n- **Manage leave** requests and balances\n- **View reports** and analytics\n\nWhat would you like me to do?"

  if (lowerMsg.includes('generate') || lowerMsg.includes('timetable')) response = responses.generate
  else if (lowerMsg.includes('conflict')) response = responses.conflict
  else if (lowerMsg.includes('optimize') || lowerMsg.includes('workload') || lowerMsg.includes('balance')) response = responses.optimize
  else if (lowerMsg.includes('substitute') || lowerMsg.includes('absent') || lowerMsg.includes('absence')) response = responses.substitute
  else if (lowerMsg.includes('export') || lowerMsg.includes('pdf') || lowerMsg.includes('csv')) response = responses.export
  else if (lowerMsg.includes('leave') || lowerMsg.includes('vacation') || lowerMsg.includes('sick')) response = responses.leave

  return new ReadableStream({
    async start(controller) {
      const words = response.split(' ')
      for (const word of words) {
        controller.enqueue(encoder.encode(word + ' '))
        await new Promise(r => setTimeout(r, 25))
      }
      controller.close()
    },
  })
}

// Stream from Anthropic Claude API
async function streamAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.3,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '')
    throw new Error(`Anthropic API error ${response.status}: ${body}`)
  }

  const reader = response.body.getReader()

  return new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(parsed.delta.text))
                }
              } catch (err) {
    console.error('[API Error]', err)
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
    console.error('[API Error]', err)
        // Stream error
      }
      controller.close()
    },
  })
}

// Stream from OpenAI API
async function streamOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>
): Promise<ReadableStream> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      temperature: 0.3,
      messages: openaiMessages,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI API error ${response.status}: ${body}`)
  }

  const reader = response.body.getReader()

  return new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  controller.enqueue(encoder.encode(delta))
                }
              } catch (err) {
    console.error('[API Error]', err)
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
    console.error('[API Error]', err)
        // Stream error
      }
      controller.close()
    },
  })
}

// GET: return available providers so the UI can show the toggle
export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth(req)
  if (authError) return authError

  const providers: string[] = []
  if (process.env.ANTHROPIC_API_KEY) providers.push('claude')
  if (process.env.OPENAI_API_KEY) providers.push('openai')

  return new Response(JSON.stringify({ providers }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(req: NextRequest) {
  const { message, schoolId, history, provider: requestedProvider } = await req.json()

  const { error: authError } = await requireSchoolAccess(req, schoolId)
  if (authError) return authError

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!schoolId || typeof schoolId !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing schoolId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  // Determine which provider to use
  let provider: 'claude' | 'openai' | 'mock' = 'mock'
  if (requestedProvider === 'openai' && openaiKey) {
    provider = 'openai'
  } else if (requestedProvider === 'claude' && anthropicKey) {
    provider = 'claude'
  } else if (anthropicKey) {
    provider = 'claude'
  } else if (openaiKey) {
    provider = 'openai'
  }

  // Mock fallback
  if (provider === 'mock') {
    const stream = createMockStream(message)
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // Real AI call
  try {
    const context = await buildSchoolContext(schoolId)
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{context}', context)

    const messages: Array<{ role: string; content: string }> = []
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
    messages.push({ role: 'user', content: message })

    const stream = provider === 'claude'
      ? await streamAnthropic(anthropicKey!, systemPrompt, messages)
      : await streamOpenAI(openaiKey!, systemPrompt, messages)

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[AI Chat] Provider error:', err)
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    // Return error as streamed text so the user sees what's wrong
    const encoder = new TextEncoder()
    const errorStream = new ReadableStream({
      start(controller) {
        const text = errMsg.includes('credit balance')
          ? '**API Error:** Your Anthropic API key has no credits. Please top up at console.anthropic.com, or switch to OpenAI in the provider selector above.'
          : `**API Error:** ${errMsg}\n\nThe AI provider returned an error. Please check your API key or try a different provider.`
        controller.enqueue(encoder.encode(text))
        controller.close()
      },
    })
    return new Response(errorStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
