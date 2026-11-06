"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Building2,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react'

interface TenantItem {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  moduleFidelizacion: boolean
  moduleMensajeria: boolean
  ownerEmail: string | null
  primaryColor: string | null
  logoUrl?: string | null
  createdAt: string
  _count: {
    customers: number
    staff: number
    payments: number
  }
}

interface StatsData {
  totalTenants: number
  activeTenants: number
  moduleFidelizacionCount: number
  moduleMensajeriaCount: number
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalTenants: 0,
    activeTenants: 0,
    moduleFidelizacionCount: 0,
    moduleMensajeriaCount: 0,
  })
  const [tenants, setTenants] = useState<TenantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/superadmin/tenants')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setTenants(data.tenants || [])
      }
    } catch (err) {
      console.error('Error cargando tenants en dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-card,rgba(0,245,212,0.15))]">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display">
            Panel de Control <span className="text-[#00F5D4]">SaaS</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestión global de inquilinos, licencias y módulos para Titanus y futuros gimnasios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/40 border border-[var(--border-card,rgba(0,245,212,0.15))] hover:border-[#00F5D4]/40 text-zinc-300 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00F5D4]' : ''}`} />
            <span>Actualizar</span>
          </button>

          <Link
            href="/superadmin/tenants/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e5ff] text-black text-xs font-bold transition-all shadow-lg shadow-[rgba(0,245,212,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Gimnasio</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gyms */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-5 rounded-2xl relative overflow-hidden group hover:border-[#00F5D4]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
              Total Gimnasios
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00F5D4]/10 text-[#00F5D4] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-white">
              {loading ? '...' : stats.totalTenants}
            </span>
            <span className="text-xs text-zinc-500 block mt-1">Cuentas creadas</span>
          </div>
        </div>

        {/* Active Gyms */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
              Gimnasios Activos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-emerald-400">
              {loading ? '...' : stats.activeTenants}
            </span>
            <span className="text-xs text-zinc-500 block mt-1">Operando actualmente</span>
          </div>
        </div>

        {/* Module Fidelización */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-5 rounded-2xl relative overflow-hidden group hover:border-[#00F5D4]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
              Mod. Fidelización
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00F5D4]/10 text-[#00F5D4] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-[#00F5D4]">
              {loading ? '...' : stats.moduleFidelizacionCount}
            </span>
            <span className="text-xs text-zinc-500 block mt-1">Licencias habilitadas</span>
          </div>
        </div>

        {/* Module Mensajería */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
              Mod. Mensajería
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-cyan-400">
              {loading ? '...' : stats.moduleMensajeriaCount}
            </span>
            <span className="text-xs text-zinc-500 block mt-1">Bots WhatsApp activos</span>
          </div>
        </div>
      </div>

      {/* Recent Tenants Table */}
      <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[var(--border-card,rgba(0,245,212,0.15))] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white font-display">Gimnasios Registrados</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Listado de inquilinos en el ecosistema</p>
          </div>
          <Link
            href="/superadmin/tenants"
            className="text-xs font-semibold text-[#00F5D4] hover:underline flex items-center gap-1"
          >
            <span>Ver todos los clientes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-black/30 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[var(--border-card,rgba(0,245,212,0.15))]">
              <tr>
                <th className="px-6 py-3.5">Gimnasio</th>
                <th className="px-6 py-3.5">Slug</th>
                <th className="px-6 py-3.5">Plan</th>
                <th className="px-6 py-3.5">Módulos</th>
                <th className="px-6 py-3.5">Socios</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Cargando inquilinos...
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No hay gimnasios registrados. Crea el primero con el botón superior.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">
                      <div className="flex items-center gap-3">
                        {t.logoUrl ? (
                          <div
                            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center p-0.5 shrink-0 border"
                            style={{
                              backgroundColor: '#ffffff',
                              borderColor: t.primaryColor || '#00F5D4',
                            }}
                          >
                            <Image
                              src={t.logoUrl}
                              alt={t.name}
                              width={32}
                              height={32}
                              className="object-contain w-full h-full"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black text-xs shrink-0"
                            style={{ backgroundColor: t.primaryColor || '#00F5D4' }}
                          >
                            {t.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="block leading-tight">{t.name}</span>
                          <span className="text-[11px] text-zinc-500 font-normal block">
                            {t.ownerEmail || 'Sin email configurado'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                      {t.slug}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-black/40 text-cyan-300 border border-cyan-500/20">
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.moduleFidelizacion && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00F5D4]/15 text-[#00F5D4] border border-[#00F5D4]/20">
                            Fidelización
                          </span>
                        )}
                        {t.moduleMensajeria && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            Mensajería
                          </span>
                        )}
                        {!t.moduleFidelizacion && !t.moduleMensajeria && (
                          <span className="text-[11px] text-zinc-600">Ninguno</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{t._count.customers} socios</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.isActive ? 'bg-emerald-400' : 'bg-zinc-500'
                          }`}
                        />
                        {t.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        className="text-xs font-bold text-[#00F5D4] hover:underline"
                      >
                        Administrar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
