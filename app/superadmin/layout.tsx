"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/superadmin/login'

  const handleLogout = async () => {
    try {
      await fetch('/api/superadmin/auth/logout', { method: 'POST' })
    } catch {}
    document.cookie = 'superadmin_session=; path=/; max-age=0;'
    router.push('/superadmin/login')
  }

  if (isLoginPage) {
    return <div className="min-h-screen bg-[var(--bg-app,#03080F)] text-white">{children}</div>
  }

  const navItems = [
    { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
    { name: 'Clientes & Gyms', href: '/superadmin/tenants', icon: Building2 },
    { name: 'Crear Cuenta', href: '/superadmin/tenants/new', icon: PlusCircle },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-app,#03080F)] text-white flex flex-col md:flex-row">
      {/* SuperAdmin Sidebar */}
      <aside className="w-full md:w-64 bg-[var(--bg-card,#05101C)] border-r border-[var(--border-card,rgba(0,245,212,0.15))] flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo Header con Asset Oficial ALL-CRM */}
          <div className="p-5 border-b border-[var(--border-card,rgba(0,245,212,0.15))] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-auto max-w-[140px] flex items-center">
                <Image
                  src="/branding/logo_main_trimmed.png"
                  alt="ALL-CRM"
                  width={140}
                  height={40}
                  className="object-contain h-9 w-auto"
                  priority
                  unoptimized
                />
              </div>
            </div>
            <span className="text-[10px] bg-black/40 text-cyan-400 border border-cyan-500/20 font-mono px-2 py-0.5 rounded-full">
              v2.5
            </span>
          </div>

          {/* Navigation */}
          <div className="px-4 py-6">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-3 mb-2 block font-display">
              Gestión de Plataforma
            </span>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/superadmin'
                    ? pathname === '/superadmin'
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#00F5D4] text-black shadow-lg shadow-[rgba(0,245,212,0.2)] font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-black' : 'text-[#00F5D4]'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-black" />}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Footer Admin info & Logout */}
        <div className="p-4 border-t border-[var(--border-card,rgba(0,245,212,0.15))] space-y-3">
          <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#00F5D4]" />
            <div className="truncate">
              <span className="text-zinc-300 font-medium block truncate">
                SuperAdministrador
              </span>
              <span className="text-zinc-500 text-[10px] block">Acceso Root SaaS</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[var(--bg-app,#03080F)] min-h-screen overflow-y-auto">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
