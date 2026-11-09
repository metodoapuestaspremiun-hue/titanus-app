"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Building2,
  User,
  Lock,
  Globe,
  Sparkles,
  MessageSquare,
  Palette,
  Phone,
  Save,
  Upload,
  AlertCircle,
  Plus,
  X,
  Crown,
} from 'lucide-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewTenantPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form states con default oficial ALL-CRM
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [moduleFidelizacion, setModuleFidelizacion] = useState(true)
  const [moduleMensajeria, setModuleMensajeria] = useState(true)
  const [evolutionInstanceName, setEvolutionInstanceName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#00F5D4') // Default ALL-CRM Cyan
  const [secondaryColor, setSecondaryColor] = useState('#00E5FF')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [googleReviewUrl, setGoogleReviewUrl] = useState('')
  const [referralCommPct, setReferralCommPct] = useState(10)
  const [storeReferralCommPct, setStoreReferralCommPct] = useState(5)

  // Subida de logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Sucursales iniciales
  const [branches, setBranches] = useState<string[]>(['Centro'])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugEdited) {
      setSlug(slugify(val))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Crear el tenant
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          ownerEmail: ownerEmail || null,
          ownerPassword: ownerPassword || null,
          plan: 'PRO',
          moduleFidelizacion,
          moduleMensajeria,
          evolutionInstanceName: evolutionInstanceName || null,
          primaryColor,
          secondaryColor,
          whatsappPhone: whatsappPhone || null,
          googleReviewUrl: googleReviewUrl || null,
          referralCommPct,
          storeReferralCommPct,
          branches: branches.filter((b) => b.trim() !== ''),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear el gimnasio')
      }

      const createdTenantId = data.tenant.id

      // 2. Si se seleccionó un logo, subirlo directamente a BunnyCDN a través del endpoint de logo
      if (logoFile && createdTenantId) {
        setUploadingLogo(true)
        const formData = new FormData()
        formData.append('logo', logoFile)
        formData.append('primaryColor', primaryColor)

        try {
          await fetch(`/api/superadmin/tenants/${createdTenantId}/logo`, {
            method: 'POST',
            body: formData,
          })
        } catch (logoErr) {
          console.error('Error al subir logo tras crear gimnasio:', logoErr)
        }
      }

      router.push('/superadmin/tenants')
    } catch (err: any) {
      setError(err.message || 'Error al procesar el formulario')
    } finally {
      setLoading(false)
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-card,rgba(0,245,212,0.15))]">
        <Link
          href="/superadmin/tenants"
          className="w-9 h-9 rounded-xl bg-black/40 border border-[var(--border-card,rgba(0,245,212,0.15))] hover:border-[#00F5D4]/40 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display">
            Crear Nueva Cuenta de <span className="text-[#00F5D4]">Gimnasio</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">
            Configuración inicial, logotipo de marca y aprovisionamiento SaaS.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección: Logotipo de Marca */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Upload className="w-4 h-4 text-[#00F5D4]" />
            <span>1. Logotipo & Identidad Visual</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-black/30 border border-white/5">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center border shrink-0 relative shadow-lg"
              style={{
                backgroundColor: '#ffffff',
                borderColor: primaryColor || '#00F5D4',
              }}
            >
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Vista previa del logo"
                  width={96}
                  height={96}
                  className="object-contain w-full h-full p-2"
                  unoptimized
                />
              ) : (
                <div className="text-center p-2">
                  <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-1" />
                  <span className="text-[10px] text-zinc-500 font-bold block uppercase">
                    Sin Logo
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00F5D4] hover:bg-[#00e5ff] text-black text-xs font-bold cursor-pointer transition-all shadow-md shadow-[rgba(0,245,212,0.15)]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{logoPreview ? 'Cambiar Logotipo' : 'Subir Logotipo'}</span>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-[11px] text-zinc-400">
                Formatos recomendados: PNG o WEBP con fondo transparente. Al subirlo se aplicará a la marca del cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Datos Principales del Gimnasio */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Building2 className="w-4 h-4 text-[#00F5D4]" />
            <span>2. Datos Principales del Gimnasio</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Nombre Comercial *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Sparta Fitness Center"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Slug URL Identificador *
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setSlugEdited(true)
                  }}
                  placeholder="sparta-fitness"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-zinc-400">WhatsApp de Recepción</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="593987654321"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Credenciales de Acceso */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Lock className="w-4 h-4 text-[#00F5D4]" />
            <span>3. Credenciales del Propietario / Admin</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Usuario de Acceso (Owner)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                <input
                  type="text"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="Ej: admin_sparta o admin@spartagym.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Contraseña Temporal
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Módulos y Personalización */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Palette className="w-4 h-4 text-[#00F5D4]" />
            <span>4. Módulos & Branding de Marca</span>
          </h2>

          {/* Module Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-[var(--border-card,rgba(0,245,212,0.15))] cursor-pointer hover:border-[#00F5D4]/40 transition-colors">
              <input
                type="checkbox"
                checked={moduleFidelizacion}
                onChange={(e) => setModuleFidelizacion(e.target.checked)}
                className="mt-1 accent-[#00F5D4] w-4 h-4 rounded"
              />
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00F5D4]" />
                  <span className="text-sm font-bold text-white">Módulo Fidelización</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Cashback, monedero digital, QR efímeros y podio de calificación de entrenadores.
                </p>
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
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">Módulo Mensajería</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Campañas WhatsApp masivas, recordatorios de vencimiento y chatbot IA.
                </p>
              </div>
            </label>
          </div>

          {/* Color Picker & Evolution Instance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Color Principal de la Marca (Default ALL-CRM)
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
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Instancia WhatsApp (Evolution API)
              </label>
              <input
                type="text"
                value={evolutionInstanceName}
                onChange={(e) => setEvolutionInstanceName(e.target.value)}
                placeholder="sparta_bot (opcional, autoprovisiona)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#00F5D4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Cashback Mensualidad (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={referralCommPct}
                onChange={(e) => setReferralCommPct(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">
                Cashback Tienda/Barra (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={storeReferralCommPct}
                onChange={(e) => setStoreReferralCommPct(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4]"
              />
            </div>
          </div>
        </div>

        {/* Section: Sucursales Iniciales */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-6 rounded-2xl space-y-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
            <Building2 className="w-4 h-4 text-[#00F5D4]" />
            <span>5. Sucursales Iniciales</span>
          </h2>

          <p className="text-xs text-zinc-400">
            Define las sedes del gimnasio. La primera siempre será la{' '}
            <strong className="text-zinc-200">Sede Principal</strong> (Matriz).
          </p>

          <div className="space-y-2">
            {branches.map((branchName, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  {idx === 0 && (
                    <Crown className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-400 w-4 h-4 pointer-events-none" />
                  )}
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => {
                      const updated = [...branches]
                      updated[idx] = e.target.value
                      setBranches(updated)
                    }}
                    placeholder={idx === 0 ? 'Sede Principal (ej. Centro)' : `Sucursal ${idx + 1}`}
                    className={`w-full bg-zinc-900 border rounded-xl pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00F5D4] ${
                      idx === 0 ? 'pl-10 border-yellow-400/40' : 'pl-4 border-zinc-800'
                    }`}
                  />
                </div>
                {idx === 0 ? (
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider px-2 shrink-0">
                    Matriz
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBranches(branches.filter((_, i) => i !== idx))}
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                    aria-label="Eliminar sucursal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setBranches([...branches, ''])}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[#00F5D4]/30 text-[#00F5D4] text-xs font-bold hover:bg-[#00F5D4]/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar Sucursal
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/superadmin/tenants"
            className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploadingLogo}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00F5D4] hover:bg-[#00e5ff] text-black text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-[rgba(0,245,212,0.25)] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {uploadingLogo
                ? 'Subiendo logo y optimizando...'
                : loading
                ? 'Creando cuenta...'
                : 'Crear Gimnasio'}
            </span>
          </button>
        </div>
      </form>
    </div>
  )
}
