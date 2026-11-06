import React from 'react'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyTenantToken, TENANT_COOKIE_NAME } from '@/lib/auth'
import { ThemeProvider } from '@/components/ThemeProvider'
import TopHeaderSwitcher from '@/components/TopHeaderSwitcher'
import ClubSidebar from '@/components/ClubSidebar'

export default async function ClubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const gymSession = cookieStore.get(TENANT_COOKIE_NAME)?.value

  // Default Fallbacks oficiales: ALL-CRM Tactical Cyan
  let primaryColor = '#00F5D4'
  let secondaryColor = '#00E5FF'
  let logoUrl: string | null = '/branding/logo_negative.png'
  let tenantName = 'ALL-CRM'
  let tenantSlug = 'default'

  if (gymSession) {
    try {
      const { tenantId } = await verifyTenantToken(gymSession)
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
        },
      })
      if (tenant) {
        tenantName = tenant.name
        tenantSlug = tenant.slug
        // Si el cliente tiene logo propio, priorizar su logo y su color extraído/guardado
        if (tenant.logoUrl) {
          logoUrl = tenant.logoUrl
          primaryColor = tenant.primaryColor || '#ffe202'
          secondaryColor = tenant.secondaryColor || '#000000'
        } else {
          // Cliente sin logo: se mantiene en ALL-CRM Tactical Cyan
          logoUrl = '/branding/logo_negative.png'
          primaryColor = tenant.primaryColor || '#00F5D4'
          secondaryColor = tenant.secondaryColor || '#00E5FF'
        }
      }
    } catch {}
  } else {
    // Fallback por compatibilidad a Titanus Gym (si se ingresa por sesión legacy)
    const titanus = await prisma.tenant.findUnique({
      where: { slug: 'titanus-gym' },
      select: {
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
      },
    })
    if (titanus) {
      tenantName = titanus.name
      tenantSlug = titanus.slug
      logoUrl = titanus.logoUrl || '/Logo.webp'
      primaryColor = titanus.primaryColor || '#ffe202'
      secondaryColor = titanus.secondaryColor || '#000000'
    }
  }

  return (
    <ThemeProvider
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      logoUrl={logoUrl}
      tenantName={tenantName}
      tenantSlug={tenantSlug}
    >
      <div className="min-h-screen bg-[var(--bg-app,#03080F)] text-white flex flex-col transition-colors duration-300">
        <TopHeaderSwitcher />
        <div className="flex flex-1 relative">
          <ClubSidebar />
          <main className="flex-1 min-w-0 bg-[var(--bg-app,#03080F)]/90">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
