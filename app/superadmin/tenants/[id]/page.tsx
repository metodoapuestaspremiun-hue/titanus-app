"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Lock,
  Globe,
  Sparkles,
  MessageSquare,
  Palette,
  Save,
  Trash2,
  Upload,
  Check,
  AlertCircle,
} from 'lucide-react'

export default function EditTenantPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [plan, setPlan] = useState('FREE')
  const [isActive, setIsActive] = useState(true)
  const [moduleFidelizacion, setModuleFidelizacion] = useState(true)
  const [moduleMensajeria, setModuleMensajeria] = useState(true)
  const [evolutionInstanceName, setEvolutionInstanceName] = useState('')
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('')
  const [evolutionApiKey, setEvolutionApiKey] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#00F5D4')
  const [secondaryColor, setSecondaryColor] = useState('#00E5FF')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [referralCommPct, setReferralCommPct] = useState(10)
  const [storeReferralCommPct, setStoreReferralCommPct] = useState(5)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    customers: 0,
    staff: 0,
    payments: 0,
    evaluations: 0,
  })

  useEffect(() => {
    async function loadTenant() {
      try {
        setLoading(true)
        const res = await fetch(`/api/superadmin/tenants/${tenantId}`)
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo cargar el gimnasio')
        }

        const t = data.tenant
        setName(t.name || '')
        setSlug(t.slug || '')
        setOwnerEmail(t.ownerEmail || '')
        setPlan(t.plan || 'FREE')
        setIsActive(Boolean(t.isActive))
        setModuleFidelizacion(Boolean(t.moduleFidelizacion))
        setModuleMensajeria(Boolean(t.moduleMensajeria))
        setEvolutionInstanceName(t.evolutionInstanceName || '')
        setEvolutionApiUrl(t.evolutionApiUrl || '')
        setEvolutionApiKey(t.evolutionApiKey || '')
        setPrimaryColor(t.primaryColor || '#00F5D4')
        setSecondaryColor(t.secondaryColor || '#00E5FF')
        setWhatsappPhone(t.whatsappPhone || '')
        setGoogleReviewUrl(t.googleReviewUrl || '')
        setReferralCommPct(Number(t.referralCommPct) || 10)
        setStoreReferralCommPct(Number(t.storeReferralCommPct) || 5)
        setLogoUrl(t.logoUrl || null)

        if (t._count) {
          setStats(t._count)
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    }

    if (tenantId) {
      loadTenant()
    }
  }, [tenantId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      const payload: any = {
        name,
        slug,
        ownerEmail: ownerEmail || null,
        plan,
        isActive,
        moduleFidelizacion,
        moduleMensajeria,
        evolutionInstanceName: evolutionInstanceName || null,
        evolutionApiUrl: evolutionApiUrl || null,
        evolutionApiKey: evolutionApiKey || null,
        primaryColor,
        secondaryColor,
        whatsappPhone: whatsappPhone || null,
        googleReviewUrl: googleReviewUrl || null,
        referralCommPct,
        storeReferralCommPct,
      }

      if (newPassword.trim()) {
        payload.ownerPassword = newPassword.trim()
      }

      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar el gimnasio')
      }

      setMessage({ type: 'success', text: 'Gimnasio actualizado correctamente.' })
      setNewPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('primaryColor', primaryColor)

      const res = await fetch(`/api/superadmin/tenants/${tenantId}/logo`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setLogoUrl(data.logoUrl)
        if (data.primaryColor) {
          setPrimaryColor(data.primaryColor)
        }
        setMessage({ type: 'success', text: 'Logo subido con éxito a BunnyCDN y colores extraídos.' })
      } else {
        throw new Error(data.error || 'Error al subir logo')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDelete = async () => {
    if (slug === 'titanus-gym') {
      alert('Titanus Gym es la cuenta raíz del sistema y no puede eliminarse.')
      return
    }

    const conf = window.confirm(
      `¿Deseas eliminar definitivamente el gimnasio "${name}"? Esta acción no se puede deshacer.`
    )
    if (!conf) return

    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/superadmin/tenants')
      } else {
        alert(data.error || 'Error al eliminar')
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar')
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-zinc-500">
        Cargando datos del gimnasio...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-card,rgba(0,245,212,0.15))]">
        <div className="flex items-center gap-4">
          <Link
            href="/superadmin/tenants"
            className="p-2 rounded-xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white font-display">{name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 text-cyan-300 border border-cyan-500/20">
                {slug}
              </span>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">
              ID: <span className="font-mono">{tenantId}</span>
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-black/40 px-3.5 py-2 rounded-xl border border-[var(--border-card,rgba(0,245,212,0.15))] font-mono">
          <span>{stats.customers} socios</span>
          <span>•</span>
          <span>{stats.staff} staff</span>
          <span>•</span>
          <span>{stats.payments} pagos</span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Logo & Branding */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Palette className="w-4 h-4 text-[#00F5D4]" />
            <span>1. Logotipo & Identidad Visual</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Logo upload and preview */}
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <span className="font-black text-black text-2xl font-display">
                    {name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-[#00F5D4] text-xs font-bold text-white cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#00F5D4]" />
                  <span>{uploadingLogo ? 'Subiendo...' : 'Subir Logotipo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleLogoUpload(file)
                    }}
                  />
                </label>
                <p className="text-[11px] text-zinc-500">
                  PNG o SVG transparente recomendado (máx. 2MB).
                </p>
              </div>
            </div>

            {/* Color Swatch & Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Color Principal de la Marca
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#00F5D4"
                  className="w-32 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
                />
                <div
                  className="px-3 py-2 rounded-xl text-black font-bold text-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Vista previa de botón
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Información Básica */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Building2 className="w-4 h-4 text-[#00F5D4]" />
            <span>2. Configuración General</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Nombre del Gimnasio</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Slug</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              >
                <option value="FREE">Plan Gratuito (FREE)</option>
                <option value="BASIC">Plan Básico (BASIC)</option>
                <option value="PRO">Plan Profesional (PRO)</option>
                <option value="ENTERPRISE">Plan Enterprise (VIP)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Estado Operativo</label>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    className="accent-emerald-400"
                  />
                  <span className="text-emerald-400">Activo (Habilitado)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    className="accent-red-400"
                  />
                  <span className="text-zinc-500">Suspendido</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Credenciales del Propietario */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Lock className="w-4 h-4 text-[#00F5D4]" />
            <span>3. Acceso del Propietario</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Usuario de Login</label>
              <input
                type="text"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="Ej: admin_titanus o admin@titanusgym.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Cambiar Contraseña (dejar vacío para no alterar)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Módulos Activos */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-[#00F5D4]" />
            <span>4. Módulos & Licencias</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-[var(--border-card,rgba(0,245,212,0.15))] cursor-pointer hover:border-[#00F5D4]/40 transition-colors">
              <input
                type="checkbox"
                checked={moduleFidelizacion}
                onChange={(e) => setModuleFidelizacion(e.target.checked)}
                className="mt-1 accent-[#00F5D4] w-4 h-4 rounded"
              />
              <div>
                <span className="text-sm font-bold text-white block">Módulo Fidelización</span>
                <span className="text-xs text-zinc-400 block mt-1">
                  Cashback, monedero digital, QR efímeros y podio de calificación de entrenadores.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-[var(--border-card,rgba(0,245,212,0.15))] cursor-pointer hover:border-[#00F5D4]/40 transition-colors">
              <input
                type="checkbox"
                checked={moduleMensajeria}
                onChange={(e) => setModuleMensajeria(e.target.checked)}
                className="mt-1 accent-[#00F5D4] w-4 h-4 rounded"
              />
              <div>
                <span className="text-sm font-bold text-white block">Módulo Mensajería</span>
                <span className="text-xs text-zinc-400 block mt-1">
                  Campañas masivas, bot IA y recordatorios de vencimiento.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Configuración de WhatsApp e Instancia */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <MessageSquare className="w-4 h-4 text-[#00F5D4]" />
            <span>5. Integración WhatsApp (Evolution API)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Nombre de la Instancia Evolution
              </label>
              <input
                type="text"
                value={evolutionInstanceName}
                onChange={(e) => setEvolutionInstanceName(e.target.value)}
                placeholder="gym_bot o sparta_bot"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">WhatsApp de Recepción</label>
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="593987654321"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Google Review URL</label>
              <input
                type="text"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Cashback Mensualidad (%) / Tienda (%)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.5"
                  value={referralCommPct}
                  onChange={(e) => setReferralCommPct(Number(e.target.value))}
                  placeholder="10%"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
                />
                <input
                  type="number"
                  step="0.5"
                  value={storeReferralCommPct}
                  onChange={(e) => setStoreReferralCommPct(Number(e.target.value))}
                  placeholder="5%"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          {slug !== 'titanus-gym' ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Gimnasio</span>
            </button>
          ) : (
            <span className="text-xs text-zinc-500 font-mono">
              🛡️ Cuenta Raíz Protegida (Titanus)
            </span>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/superadmin/tenants"
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold transition-colors"
            >
              Volver
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e5ff] text-black text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-[rgba(0,245,212,0.25)] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
