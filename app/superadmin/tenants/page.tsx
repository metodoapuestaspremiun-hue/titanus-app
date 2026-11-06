"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit,
  Sparkles,
  MessageSquare,
  AlertCircle,
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
  evolutionInstanceName: string | null
  createdAt: string
  _count: {
    customers: number
    staff: number
    payments: number
  }
}

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionError, setActionError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/tenants')
      const data = await res.json()
      if (data.success) {
        setTenants(data.tenants || [])
      }
    } catch (err: any) {
      setActionError('Error cargando inquilinos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  // Toggle rápido de módulo con persistencia en el backend
  const handleToggleModule = async (
    id: string,
    field: 'moduleFidelizacion' | 'moduleMensajeria' | 'isActive',
    currentVal: boolean
  ) => {
    try {
      setTogglingId(`${id}-${field}`)
      const newVal = !currentVal

      // Optimistic update
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: newVal } : t))
      )

      const res = await fetch(`/api/superadmin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newVal }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        // Rollback
        setTenants((prev) =>
          prev.map((t) => (t.id === id ? { ...t, [field]: currentVal } : t))
        )
        setActionError(data.error || 'No se pudo actualizar el estado')
      }
    } catch (err: any) {
      setActionError(err.message || 'Error en la petición')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteTenant = async (id: string, name: string, slug: string) => {
    if (slug === 'titanus-gym') {
      alert('Titanus Gym es la cuenta raíz y no puede ser eliminada.')
      return
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente el gimnasio "${name}"? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    try {
      const res = await fetch(`/api/superadmin/tenants/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTenants((prev) => prev.filter((t) => t.id !== id))
      } else {
        alert(data.error || 'Error al eliminar gimnasio')
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar')
    }
  }

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-card,rgba(0,245,212,0.15))]">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display">
            Clientes & <span className="text-[#00F5D4]">Gimnasios</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Administra suscripciones, módulos y configuración de cada gimnasio suscrito.
          </p>
        </div>

        <Link
          href="/superadmin/tenants/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e5ff] text-black text-xs font-bold transition-all shadow-lg shadow-[rgba(0,245,212,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Gimnasio</span>
        </Link>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between text-red-400 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, slug o email..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00F5D4]"
          />
        </div>

        <div className="text-xs text-zinc-500 font-mono self-end sm:self-center">
          Mostrando {filtered.length} de {tenants.length} cuentas
        </div>
      </div>

      {/* Main Tenants Table */}
      <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-black/30 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[var(--border-card,rgba(0,245,212,0.15))]">
              <tr>
                <th className="px-6 py-4">Gimnasio</th>
                <th className="px-6 py-4">Slug / Instancia</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Fidelización</th>
                <th className="px-6 py-4">Mensajería</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Cargando cuentas de gimnasios...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No se encontraron gimnasios con el término &ldquo;{searchTerm}&rdquo;.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    {/* Name & Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {t.logoUrl ? (
                          <div
                            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center p-0.5 shrink-0 border shadow-sm"
                            style={{
                              backgroundColor: '#ffffff',
                              borderColor: t.primaryColor || '#00F5D4',
                            }}
                          >
                            <Image
                              src={t.logoUrl}
                              alt={t.name}
                              width={36}
                              height={36}
                              className="object-contain w-full h-full"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-black text-xs shrink-0 shadow-sm"
                            style={{ backgroundColor: t.primaryColor || '#00F5D4' }}
                          >
                            {t.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-white block">{t.name}</span>
                          <span className="text-[11px] text-zinc-500 block">
                            {t.ownerEmail || 'Sin email'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Slug & WhatsApp Instance */}
                    <td className="px-6 py-4 text-xs font-mono">
                      <span className="text-zinc-300 block">{t.slug}</span>
                      <span className="text-[10px] text-zinc-600 block">
                        Instancia: {t.evolutionInstanceName || 'gym_bot'}
                      </span>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-black/40 text-cyan-300 border border-cyan-500/20 uppercase">
                        {t.plan}
                      </span>
                    </td>

                    {/* Toggle Fidelización */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleToggleModule(t.id, 'moduleFidelizacion', t.moduleFidelizacion)
                        }
                        disabled={togglingId === `${t.id}-moduleFidelizacion`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          t.moduleFidelizacion
                            ? 'bg-[#00F5D4]/15 text-[#00F5D4] border border-[#00F5D4]/30 hover:bg-[#00F5D4]/25'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
                        }`}
                        title="Click para activar o desactivar módulo"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{t.moduleFidelizacion ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    </td>

                    {/* Toggle Mensajería */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleToggleModule(t.id, 'moduleMensajeria', t.moduleMensajeria)
                        }
                        disabled={togglingId === `${t.id}-moduleMensajeria`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          t.moduleMensajeria
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
                        }`}
                        title="Click para activar o desactivar módulo"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{t.moduleMensajeria ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    </td>

                    {/* Toggle Status Activo */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleModule(t.id, 'isActive', t.isActive)}
                        disabled={togglingId === `${t.id}-isActive`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          t.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.isActive ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        {t.isActive ? 'Operativo' : 'Suspendido'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/superadmin/tenants/${t.id}`}
                          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#00F5D4] transition-colors"
                          title="Editar configuración"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {t.slug !== 'titanus-gym' && (
                          <button
                            onClick={() => handleDeleteTenant(t.id, t.name, t.slug)}
                            className="p-2 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Eliminar gimnasio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
