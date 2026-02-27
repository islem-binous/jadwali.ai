import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function requireSuperAdmin(request: Request) {
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    }
  }

  const prisma = await getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user || user.role !== 'SUPER_ADMIN') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
    }
  }

  return { error: null, user }
}
