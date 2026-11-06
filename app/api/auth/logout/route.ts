import { NextResponse } from 'next/server'
import { TENANT_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesión cerrada exitosamente',
  })

  response.cookies.set(TENANT_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
  })

  response.cookies.set('titanus_session', '', {
    path: '/',
    maxAge: 0,
  })

  return response
}

export async function GET() {
  return POST()
}

