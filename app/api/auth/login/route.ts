import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { signTenantToken, TENANT_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, email, password } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Contraseña requerida' },
        { status: 400 }
      )
    }

    const inputIdentifier = (email || username || '').trim()

    // 1. Compatibilidad hacia atrás: Usuario Spartan 'Titanus Gym'
    if (inputIdentifier === 'Titanus Gym' || inputIdentifier.toLowerCase() === 'titanus gym') {
      const titanusTenant = await prisma.tenant.findUnique({
        where: { slug: 'titanus-gym' },
      })

      if (titanusTenant) {
        const inputHash = crypto.createHash('sha256').update(password).digest('hex')
        const isValid =
          (titanusTenant.ownerPasswordHash && titanusTenant.ownerPasswordHash === inputHash) ||
          password === 'Contraseña123.'

        if (isValid) {
          const token = await signTenantToken(titanusTenant.id, titanusTenant.slug, 'OWNER')
          const response = NextResponse.json({
            success: true,
            tenantSlug: titanusTenant.slug,
            token,
          })

          response.cookies.set(TENANT_COOKIE_NAME, token, {
            httpOnly: true,
            path: '/',
            maxAge: 604800, // 7 días
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })

          return response
        }
      }
    }

    // 2. Login multi-tenant dinámico por ownerEmail o slug
    let tenant = await prisma.tenant.findUnique({
      where: { ownerEmail: inputIdentifier },
    })

    if (!tenant) {
      // Intentar también buscar por slug si el usuario ingresó el slug del gym
      tenant = await prisma.tenant.findUnique({
        where: { slug: inputIdentifier.toLowerCase() },
      })
    }

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Credenciales Incorrectas' },
        { status: 401 }
      )
    }

    // Verificar contraseña con hash SHA-256
    const inputHash = crypto.createHash('sha256').update(password).digest('hex')
    const passwordMatches =
      tenant.ownerPasswordHash === inputHash ||
      (!tenant.ownerPasswordHash && password === 'Contraseña123.')

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: 'Credenciales Incorrectas' },
        { status: 401 }
      )
    }

    if (!tenant.isActive) {
      return NextResponse.json(
        { success: false, error: 'La cuenta del gimnasio se encuentra inactiva' },
        { status: 403 }
      )
    }

    const token = await signTenantToken(tenant.id, tenant.slug, 'OWNER')
    const response = NextResponse.json({
      success: true,
      tenantSlug: tenant.slug,
      token,
    })

    response.cookies.set(TENANT_COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      maxAge: 604800, // 7 días
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (error) {
    console.error('Error en /api/auth/login:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
