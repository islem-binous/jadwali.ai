import { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requireAuth, requireSchoolAccess } from '@/lib/auth/require-auth'
import { getAppSettings } from '@/lib/app-settings'

// Build school context for the AI
async function buildSchoolContext(schoolId: string) {
  try {
    const prisma = await getPrisma()
    const [school, teachers, classes, rooms, subjects, periods, absences, lessons, gradeCurriculumRows, grades] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.teacher.findMany({
        where: { schoolId },
        include: { subjects: { include: { subject: true } }, lessons: true, absences: { where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } } },
      }),
      prisma.class.findMany({ where: { schoolId }, include: { grade: true } }),
      prisma.room.findMany({ where: { schoolId } }),
      prisma.subject.findMany({ where: { schoolId } }),
      prisma.period.findMany({ where: { schoolId }, orderBy: { order: 'asc' } }),
      prisma.absence.findMany({ where: { schoolId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, include: { teacher: true } }),
      prisma.lesson.findMany({ where: { timetable: { schoolId } }, include: { class: true, subject: true, teacher: true, room: true, period: true } }),
      prisma.gradeCurriculum.findMany({
        where: { grade: { schoolId } },
        include: { subject: true },
      }),
      prisma.grade.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    ])

    const activePeriods = periods.filter((p: any) => !p.isBreak)

    // Build curriculum coverage analysis
    const teacherSubjectIds = new Set<string>()
    for (const t of teachers) {
      for (const ts of (t as any).subjects) {
        teacherSubjectIds.add(ts.subjectId)
      }
    }

    const gradeNameMap = new Map(grades.map((g: any) => [g.id, g.name]))
    const coverageByGrade = new Map<string, { subject: string; hours: number; covered: boolean }[]>()
    for (const gc of gradeCurriculumRows) {
      const gradeName = gradeNameMap.get((gc as any).gradeId) || (gc as any).gradeId
      if (!coverageByGrade.has(gradeName)) coverageByGrade.set(gradeName, [])
      coverageByGrade.get(gradeName)!.push({
        subject: (gc as any).subject?.name || (gc as any).subjectId,
        hours: (gc as any).hoursPerWeek,
        covered: teacherSubjectIds.has((gc as any).subjectId),
      })
    }

    let curriculumSection = ''
    if (coverageByGrade.size > 0) {
      curriculumSection = '\n## Curriculum Coverage\n'
      for (const [gradeName, subjects] of coverageByGrade) {
        const covered = subjects.filter(s => s.covered).length
        const total = subjects.length
        const missing = subjects.filter(s => !s.covered).map(s => s.subject)
        curriculumSection += `- ${gradeName}: ${covered}/${total} subjects have teachers`
        if (missing.length > 0) curriculumSection += ` — MISSING: ${missing.join(', ')}`
        curriculumSection += '\n'
      }
    }

    // Room inventory by type
    const roomsByType = new Map<string, number>()
    for (const r of rooms) {
      const type = (r as any).type || 'CLASSROOM'
      roomsByType.set(type, (roomsByType.get(type) || 0) + 1)
    }
    const roomInventory = `\n## Room Inventory\n${[...roomsByType.entries()].map(([type, count]) => `- ${type}: ${count}`).join('\n')}`

    return `## Current School Context
School: ${school?.name || 'Unknown'}
Country: ${school?.country || 'Not set'}
Timezone: ${school?.timezone || 'UTC'}

## Resources
- ${teachers.length} teachers: ${teachers.map((t: any) => `${t.name} (${t.subjects.map((s: any) => s.subject.name).join(', ')})`).join('; ')}
- ${classes.length} classes: ${classes.map((c: any) => `${c.name}${c.grade ? ` [${c.grade.name}]` : ''}`).join(', ')}
- ${rooms.length} rooms: ${rooms.map((r: any) => `${r.name} (${r.type})`).join(', ')}
- ${subjects.length} subjects: ${subjects.map((s: any) => `${s.name}${s.pedagogicDay ? ` (ped.day=${s.pedagogicDay})` : ''}`).join(', ')}
- ${activePeriods.length} periods per day: ${activePeriods.map((p: any) => `${p.name} ${p.startTime}-${p.endTime}`).join(', ')}
${curriculumSection}${roomInventory}

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

const TUNISIAN_RULES_CONTEXT = `
## Tunisian Education Scheduling Rules

### Hard Constraints (must never be violated)
- H1: Multi-hour sessions (2h, 3h, 4h) MUST be in consecutive periods with NO break between them
- H2: Group sessions (ParGroupe) split the class into 2 groups — both must be scheduled; paired group subjects swap groups simultaneously
- H3: Group sessions need specialized rooms (Science Lab for physics/biology, Tech Lab, Computer Lab, Gym)
- H4: Biweekly sessions (ParQuinzaine) alternate weeks (Week A / Week B) — two biweekly subjects can share the same time slot
- H5: PE needs gym/outdoor facilities, NEVER first period, multiple PE sessions must be on different days
- H6: Same teacher must teach ALL sessions of a subject for a given class
- H7: Teacher max 18h/week (15h/week for teachers with 25+ years seniority from recruitmentDate)
- H8: Teacher max 4h/day for ALL teachers regardless of seniority
- H9: Pedagogic day — each subject has a blocked day reserved for teacher training (absolute constraint)

### Pedagogic Day Assignments (subject cannot be taught on this day)
- Monday: History & Geography, Theatre
- Tuesday: Islamic Education, Music, Physical Sciences
- Wednesday: Technology, Mathematics
- Thursday: Visual Arts, Arabic
- Friday: Civic Education, French
- Saturday: Computer Science, English, PE, Life Sciences

### Soft Constraints (optimize in priority order)
- S1: Heavy subjects (Math ≥5h, Physics, Arabic) should be in morning periods (periods 1-4)
- S2: Spread sessions of the same subject across different days of the week
- S3: No back-to-back same subject (unless it's a planned multi-hour block)
- S4: Lab/practical sessions before lecture sessions in the week
- S5: Arts and PE should be in afternoon periods when possible
- S6: Balance daily load — mix heavy subjects (Math, Sciences) with light ones (Arts, PE, Civic Ed)

### Room Rules
- Specialized rooms (science labs, computer labs, tech labs) are RESERVED for matching session types only
- Library ONLY for supervised study/reading — NEVER for teaching
- Gymnasium ONLY for Physical Education — NEVER for other subjects (no exceptions)
- Regular classrooms for standard lecture sessions
- Last resort: empty specialized room for a regular session only if ALL classrooms are full

### Teacher Workload Calculation
- Default: 18h/week, 4h/day
- Senior teachers (≥25 years seniority): 15h/week, 4h/day
- Seniority = current school year start (September) - recruitment year
- If teacher has a manually set lower limit, use the stricter (lower) value

### Grade Levels
- Middle School: 7th, 8th, 9th year (7أ, 8أ, 9أ)
- 1st Year Secondary: Common trunk (1ث)
- 2nd Year: Sciences (2ع), Technology (2تك), Letters (2آ), Economics (2إق), Sports (2ريا)
- 3rd Year: Mathematics (3ر), Experimental Sciences (3ع), Letters (3آ), Economics (3إق), Technical Sciences (3تق), Sports (3ريا), Computer Science (3ع إ)
- 4th Year (Baccalauréat): Same specializations as 3rd year (4ر, 4ع, 4آ, 4إق, 4تق, 4ريا, 4ع إ)
`

const SYSTEM_PROMPT_TEMPLATE = `You are Jadwali AI Agent, an expert school scheduling consultant specialized in the Tunisian education system.
You are embedded inside the jadwali.ai platform and have full knowledge of the current school's configuration.

## Your Capabilities
You can:
1. Answer questions about the current school schedule, teachers, classes, and configuration
2. Analyze school readiness for timetable generation (check teacher-subject coverage, room availability, workload feasibility)
3. Suggest optimal scheduling strategies following Tunisian education rules
4. Identify and help resolve scheduling conflicts
5. Provide insights about teacher workloads, curriculum coverage, and resource usage
6. Help with leave management and substitute planning
7. Explain Tunisian scheduling rules (pedagogic days, group sessions, biweekly sessions, etc.)

{context}

${TUNISIAN_RULES_CONTEXT}

## Behaviour Rules
- Be concise and direct. Educators are busy professionals.
- Always reference real data from the context above — never fabricate information.
- When asked about readiness to generate a timetable, analyze curriculum coverage, teacher assignments, and room availability, then give a clear assessment.
- When suggesting changes, explain the reasoning and impact.
- If you notice missing teacher assignments or room types, proactively mention them.
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
  try {
    const { error: authError } = await requireAuth(req)
    if (authError) return authError
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const providers: string[] = []
  if (process.env.ANTHROPIC_API_KEY) providers.push('claude')
  if (process.env.OPENAI_API_KEY) providers.push('openai')

  return new Response(JSON.stringify({ providers }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(req: NextRequest) {
  let message: string, schoolId: string, history: unknown, requestedProvider: string | undefined
  try {
    const body = await req.json()
    message = body.message
    schoolId = body.schoolId
    history = body.history
    requestedProvider = body.provider
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const { error: authError } = await requireSchoolAccess(req, schoolId)
    if (authError) return authError
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  // Check if AI features are enabled
  try {
    const settings = await getAppSettings()
    if (!settings.aiEnabled) {
      return new Response(JSON.stringify({ error: 'AI features are currently disabled' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch {
    // If settings fetch fails, allow AI to proceed
  }

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
