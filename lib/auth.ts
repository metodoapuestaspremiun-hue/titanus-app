import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'saas_jwt_secret_2025_titanus_gym_ultramax'
const JWT_KEY = new TextEncoder().encode(JWT_SECRET_STRING)

export const TENANT_COOKIE_NAME = 'gym_session'
export const SUPERADMIN_COOKIE_NAME = 'superadmin_session'

export interface TenantJWTPayload {
  tenantId: string
  tenantSlug: string
  role?: string
  branchId?: string
}

export interface SuperAdminJWTPayload {
  adminId: string
}

/**
 * Sign a JWT for a Tenant owner/manager/staff member (expires in 7 days)
 */
export async function signTenantToken(
  tenantId: string,
  tenantSlug: string,
  role: string = 'OWNER',
  branchId?: string
): Promise<string> {
  const payload: Record<string, unknown> = { tenantId, tenantSlug, role }
  if (branchId) payload.branchId = branchId
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_KEY)
}

/**
 * Verify a Tenant JWT and return its payload
 */
export async function verifyTenantToken(token: string): Promise<TenantJWTPayload> {
  const { payload } = await jwtVerify(token, JWT_KEY)
  if (!payload.tenantId || !payload.tenantSlug) {
    throw new Error('Invalid tenant token payload')
  }
  return {
    tenantId: payload.tenantId as string,
    tenantSlug: payload.tenantSlug as string,
    role: (payload.role as string) || 'OWNER',
    branchId: (payload.branchId as string) || undefined,
  }
}

/**
 * Sign a JWT for a SuperAdmin (expires in 4 hours)
 */
export async function signSuperAdminToken(adminId: string): Promise<string> {
  return new SignJWT({ adminId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(JWT_KEY)
}

/**
 * Verify a SuperAdmin JWT and return its payload
 */
export async function verifySuperAdminToken(token: string): Promise<SuperAdminJWTPayload> {
  const { payload } = await jwtVerify(token, JWT_KEY)
  if (!payload.adminId) {
    throw new Error('Invalid superadmin token payload')
  }
  return {
    adminId: payload.adminId as string,
  }
}

/**
 * Extracts and verifies SuperAdmin authentication from incoming HTTP request
 */
export async function getSuperAdminFromRequest(req: Request): Promise<SuperAdminJWTPayload> {
  const cookieHeader = req.headers.get('cookie')
  let token: string | null = null

  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SUPERADMIN_COOKIE_NAME}=`))
    if (match) {
      token = decodeURIComponent(match.substring(SUPERADMIN_COOKIE_NAME.length + 1))
    }
  }

  if (!token) {
    const auth = req.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.substring(7).trim()
    }
  }

  if (!token) {
    throw new Error('No autorizado: sesión de SuperAdmin requerida')
  }

  return verifySuperAdminToken(token)
}
