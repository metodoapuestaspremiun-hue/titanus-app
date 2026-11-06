import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { signSuperAdminToken, SUPERADMIN_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña requeridos' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const admin = await prisma.superAdmin.findUnique({
      where: { email: cleanEmail },
    })

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    if (admin.passwordHash !== passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const token = await signSuperAdminToken(admin.id)
    const response = NextResponse.json({
      success: true,
      token,
      email: admin.email,
    })

    response.cookies.set(SUPERADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      maxAge: 14400, // 4 horas
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (error) {
    console.error('Error en /api/superadmin/auth/login:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

