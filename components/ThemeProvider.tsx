"use client"

import React, { createContext, useContext, useEffect } from 'react'

interface ThemeContextType {
  primaryColor: string
  secondaryColor: string
  logoUrl?: string | null
  tenantName: string
  tenantSlug: string
  isCustomBranded: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: '#00F5D4',
  secondaryColor: '#00E5FF',
  tenantName: 'ALL-CRM',
  tenantSlug: 'default',
  logoUrl: '/branding/logo_negative.png',
  isCustomBranded: false,
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({
  children,
  primaryColor = '#00F5D4',
  secondaryColor = '#00E5FF',
  logoUrl = '/branding/logo_negative.png',
  tenantName = 'ALL-CRM',
  tenantSlug = 'default',
}: {
  children: React.ReactNode
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string | null
  tenantName?: string
  tenantSlug?: string
}) {
  // isCustomBranded: true si tiene logo externo (URL http o no es el logo ALL-CRM por defecto)
  const isCustomBranded = Boolean(logoUrl && !logoUrl.startsWith('/branding/'))

  // Fondo y tarjetas adaptativos:
  // Si es Titanus o marca con negro, preservar #000000. Si es ALL-CRM default, usar #03080F / #05101C
  const bgApp = isCustomBranded && secondaryColor === '#000000' ? '#000000' : '#03080F'
  const bgCard = isCustomBranded && secondaryColor === '#000000' ? '#0d0d0d' : '#05101C'
  const borderCard = isCustomBranded
    ? `color-mix(in srgb, ${primaryColor} 20%, transparent)`
    : 'rgba(0, 245, 212, 0.15)'

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', primaryColor)
      document.documentElement.style.setProperty('--color-secondary', secondaryColor)
      document.documentElement.style.setProperty('--bg-app', bgApp)
      document.documentElement.style.setProperty('--bg-card', bgCard)
      document.documentElement.style.setProperty('--border-card', borderCard)
    }
  }, [primaryColor, secondaryColor, bgApp, bgCard, borderCard])

  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        secondaryColor,
        logoUrl,
        tenantName,
        tenantSlug,
        isCustomBranded,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --color-primary: ${primaryColor};
              --color-secondary: ${secondaryColor};
              --bg-app: ${bgApp};
              --bg-card: ${bgCard};
              --border-card: ${borderCard};
            }
          `,
        }}
      />
      {children}
    </ThemeContext.Provider>
  )
}
