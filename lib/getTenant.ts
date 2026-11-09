import { prisma } from '@/lib/prisma'
import { verifyTenantToken, TENANT_COOKIE_NAME, TenantJWTPayload } from '@/lib/auth'

export class AuthError extends Error {
  status: number
  constructor(message: string = 'No autorizado: sesión no válida o ausente', status: number = 401) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

function extractCookie(req: Request, name: string): string | null {
  if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
    const cookie = (req as any).cookies.get(name)
    if (cookie?.value) return cookie.value
  }

  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))

  if (match) {
    return decodeURIComponent(match.substring(name.length + 1))
  }

  return null
}

/**
 * Extracts and verifies the tenant context from the incoming HTTP request.
 * Prioritizes the multi-tenant `gym_session` JWT cookie, accepts Bearer tokens,
 * and maintains backward-compatibility with legacy `titanus_session` cookies.
 * When no branchId is embedded in the JWT, defaults to the tenant's main branch.
 */
export async function getTenantFromRequest(
  req: Request
): Promise<TenantJWTPayload & { tenant?: any }> {
  // Helper to resolve branchId: if already in payload use it, else query DB for isMain branch
  async function resolvebranchId(payload: TenantJWTPayload): Promise<string | undefined> {
    if (payload.branchId) return payload.branchId
    const mainBranch = await prisma.branch.findFirst({
      where: { tenantId: payload.tenantId, isMain: true },
      select: { id: true },
    })
    return mainBranch?.id ?? undefined
  }

  // 1. Check gym_session cookie
  const gymSessionToken = extractCookie(req, TENANT_COOKIE_NAME)
  if (gymSessionToken) {
    try {
      const payload = await verifyTenantToken(gymSessionToken)
      const [tenant, branchId] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: payload.tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
            whatsappPhone: true,
          },
        }),
        resolvebranchId(payload),
      ])
      return {
        ...payload,
        branchId,
        tenant: tenant || undefined,
      }
    } catch {
      // Failed token verification, try fallback below
    }
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim()
    try {
      const payload = await verifyTenantToken(bearerToken)
      const [tenant, branchId] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: payload.tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
            whatsappPhone: true,
          },
        }),
        resolvebranchId(payload),
      ])
      return {
        ...payload,
        branchId,
        tenant: tenant || undefined,
      }
    } catch {
      // Failed token verification, continue
    }
  }

  // 3. Backward-compatibility: Check legacy titanus_session cookie
  const legacySession = extractCookie(req, 'titanus_session')
  if (legacySession) {
    try {
      const decoded = Buffer.from(legacySession, 'base64').toString('utf-8')
      const [user, , secret] = decoded.split(':')
      const serverSecret = process.env.DASHBOARD_SECRET || 'spartan_fortress_2025_titanus_gym'

      if (user === 'Titanus Gym' && secret === serverSecret) {
        const titanus = await prisma.tenant.findUnique({
          where: { slug: 'titanus-gym' },
          select: {
            id: true,
            name: true,
            slug: true,
            evolutionInstanceName: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
            whatsappPhone: true,
          },
        })
        if (titanus) {
          const mainBranch = await prisma.branch.findFirst({
            where: { tenantId: titanus.id, isMain: true },
            select: { id: true },
          })
          return {
            tenantId: titanus.id,
            tenantSlug: titanus.slug,
            role: 'OWNER',
            branchId: mainBranch?.id ?? undefined,
            tenant: titanus,
          }
        }
      }
    } catch {
      // Legacy decode failed
    }
  }

  throw new AuthError('No autorizado: sesión no válida o ausente', 401)
}

