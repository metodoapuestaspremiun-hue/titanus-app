import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTenantToken, verifySuperAdminToken, TENANT_COOKIE_NAME, SUPERADMIN_COOKIE_NAME } from '@/lib/auth'

function checkLegacyTitanusSession(session: string): boolean {
  try {
    const decoded = typeof atob === 'function' ? atob(session) : Buffer.from(session, 'base64').toString('utf-8')
    const [user, , secret] = decoded.split(':')
    const serverSecret = process.env.DASHBOARD_SECRET || 'spartan_fortress_2025_titanus_gym'
    return user === 'Titanus Gym' && secret === serverSecret
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Manejo exclusivo de rutas de SuperAdmin (/superadmin/**)
  if (pathname.startsWith('/superadmin')) {
    const superAdminCookie = request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value
    let isSuperAdminValid = false

    if (superAdminCookie) {
      try {
        await verifySuperAdminToken(superAdminCookie)
        isSuperAdminValid = true
      } catch {
        isSuperAdminValid = false
      }
    }

    // Ruta de login de SuperAdmin
    if (pathname === '/superadmin/login') {
      if (isSuperAdminValid) {
        return NextResponse.redirect(new URL('/superadmin', request.url))
      }
      return NextResponse.next()
    }

    // Cualquier otra ruta de SuperAdmin requiere sesión válida
    if (!isSuperAdminValid) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url))
    }

    return NextResponse.next()
  }

  // 2. Rutas públicas generales (siempre permitidas)
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/qr/')

  // Verificar sesión de Tenant (gym_session o titanus_session de compatibilidad)
  const tenantCookie = request.cookies.get(TENANT_COOKIE_NAME)?.value
  const legacyCookie = request.cookies.get('titanus_session')?.value
  let isTenantValid = false

  if (tenantCookie) {
    try {
      await verifyTenantToken(tenantCookie)
      isTenantValid = true
    } catch {
      isTenantValid = false
    }
  }

  if (!isTenantValid && legacyCookie) {
    if (checkLegacyTitanusSession(legacyCookie)) {
      isTenantValid = true
    }
  }

  // Si ingresa a la raíz '/', redirigir según estado de autenticación
  if (pathname === '/') {
    if (isTenantValid) {
      return NextResponse.redirect(new URL('/club/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si un tenant autenticado visita /login, redirigir a /club/dashboard
  if (pathname === '/login') {
    if (isTenantValid) {
      return NextResponse.redirect(new URL('/club/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Si no está autenticado y no es ruta pública, redirigir a /login
  if (!isTenantValid && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto archivos estáticos:
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - branding
     * - branding-ui
     * - extensiones de imágenes y assets
     */
    '/((?!_next/static|_next/image|favicon.ico|branding|branding-ui|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
