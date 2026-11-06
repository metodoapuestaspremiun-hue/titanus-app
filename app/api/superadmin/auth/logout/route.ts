import { NextResponse } from 'next/server'
import { SUPERADMIN_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'SuperAdmin sesión cerrada',
  })

  response.cookies.set(SUPERADMIN_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
  })

  return response
}

export async function GET() {
  return POST()
}

