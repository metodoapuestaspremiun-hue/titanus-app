'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  Sliders,
  Smartphone,
  CheckCircle,
  XCircle,
  Save,
  Plus,
  Trash2,
  Users,
  Printer,
  Edit2,
  Upload,
  Check,
  X
} from 'lucide-react'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'

export default function ClubConfig() {
  const [membershipCashback, setMembershipCashback] = useState(10)
  const [retailCashback, setRetailCashback] = useState(5)
  const [reviewUrl, setReviewUrl] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [cashbackOpen, setCashbackOpen] = useState(false)

  // Estado de conexión WhatsApp
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  // Gestión de Entrenadores
  const [coaches, setCoaches] = useState<any[]>([])
  const [newCoachName, setNewCoachName] = useState('')
  const [addingCoach, setAddingCoach] = useState(false)
  const [newCoachAvatarUrl, setNewCoachAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [updatingCoach, setUpdatingCoach] = useState(false)

  // Dominio base de la app para los QR impresos
  const [baseUrl, setBaseUrl] = useState('https://titanus-app.vercel.app')
  const [tenantSlug, setTenantSlug] = useState('titanus-gym')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  const checkWhatsAppStatus = async () => {
    try {
      const res = await axios.get('/api/whatsapp/status')
      setWsStatus(res.data.connected || res.data.status === 'open' ? 'connected' : 'disconnected')
    } catch (e) {
      setWsStatus('disconnected')
    }
  }

  const getQrCode = async () => {
    setLoadingQr(true)
    try {
      const timestamp = new Date().getTime()
      setQrCode(`/api/whatsapp/qr?t=${timestamp}`)
      setWsStatus('disconnected')
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingQr(false)
    }
  }

  const loadCoaches = async () => {
    try {
      const res = await axios.get('/api/club/coaches')
      setCoaches(res.data.coaches || [])
    } catch (e) {
      console.error('Error cargando coaches:', e)
    }
  }

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoachName.trim()) return
    try {
      setAddingCoach(true)
      await axios.post('/api/club/coaches', { name: newCoachName, avatarUrl: newCoachAvatarUrl || null })
      setNewCoachName('')
      setNewCoachAvatarUrl('')
      loadCoaches()
    } catch (e: any) {
      alert('Error agregando coach: ' + (e.response?.data?.error || e.message))
    } finally {
      setAddingCoach(false)
    }
  }

  const handleDeleteCoach = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este entrenador?')) return
    try {
      await axios.delete(`/api/club/coaches?id=${id}`)
      loadCoaches()
    } catch (e: any) {
      alert('Error eliminando coach: ' + (e.response?.data?.error || e.message))
    }
  }

  const startEditCoach = (coach: any) => {
    setEditingCoachId(coach.id)
    setEditName(coach.name)
    setEditAvatarUrl(coach.avatarUrl || '')
  }

  const cancelEditCoach = () => {
    setEditingCoachId(null)
    setEditName('')
    setEditAvatarUrl('')
  }

  const handleUpdateCoach = async (id: string) => {
    if (!editName.trim()) {
      alert('El nombre es obligatorio')
      return
    }
    try {
      setUpdatingCoach(true)
      await axios.put('/api/club/coaches', {
        id,
        name: editName.trim(),
        avatarUrl: editAvatarUrl.trim() || null,
      })
      cancelEditCoach()
      loadCoaches()
    } catch (e: any) {
      alert('Error actualizando coach: ' + (e.response?.data?.error || e.message))
    } finally {
      setUpdatingCoach(false)
    }
  }

  // Subir imagen desde la computadora usando /api/upload
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, target: 'NEW' | 'EDIT') => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      setUploadingAvatar(true)
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.url) {
        if (target === 'NEW') {
          setNewCoachAvatarUrl(res.data.url)
        } else {
          setEditAvatarUrl(res.data.url)
        }
      }
    } catch (err: any) {
      alert('Error al subir imagen: ' + (err.response?.data?.error || err.message))
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await axios.get('/api/club/config')
        if (res.data) {
          setTenantSlug(res.data.slug || 'titanus-gym')
          setMembershipCashback(Number(res.data.referralCommPct) || 10)
          setRetailCashback(Number(res.data.storeReferralCommPct) || 5)
          setReviewUrl(res.data.googleReviewUrl || '')
          setWhatsappPhone(res.data.whatsappPhone || '')
        }
      } catch (e) {
        console.error('Error cargando configuración:', e)
      }
    }
    loadConfig()
    loadCoaches()
    checkWhatsAppStatus()

    const interval = setInterval(checkWhatsAppStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage('')
      await axios.post('/api/club/config', {
        referralCommPct: membershipCashback,
        storeReferralCommPct: retailCashback,
        googleReviewUrl: reviewUrl,
        whatsappPhone: whatsappPhone,
      })
      setMessage('✅ Configuración guardada con éxito.')
      setTimeout(() => setMessage(''), 4000)
    } catch (e: any) {
      alert('Error guardando configuración: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            CONFIGURACIÓN TÁCTICA & QR
            <Settings className="w-7 h-7" style={{ color: 'var(--color-primary, #00F5D4)' }} />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Control de comisiones de monedero, vinculación WhatsApp y descarga de QR fijos para imprimir.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-black font-black text-sm flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-primary, #00F5D4)',
          }}
        >
          <Save className="w-4 h-4 text-black" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div
          className="p-4 rounded-xl border text-sm font-bold animate-in fade-in"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)',
            color: 'var(--color-primary, #00F5D4)',
          }}
        >
          {message}
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Sliders de Comisiones y Ajustes */}
        <div className="space-y-6">
          {/* Porcentajes de Cashback (Monedero) tipo acordeón / tab */}
          <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] overflow-hidden">
            <button
              type="button"
              onClick={() => setCashbackOpen(!cashbackOpen)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                <div>
                  <h2 className="text-base font-bold text-white">Porcentajes de Cashback (Monedero)</h2>
                  <p className="text-xs text-zinc-400">Cuota: {membershipCashback}% · Tienda: {retailCashback}%</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg border" style={{ color: 'var(--color-primary, #00F5D4)', borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)' }}>
                {cashbackOpen ? 'Cerrar ▲' : 'Configurar ▼'}
              </span>
            </button>

            {cashbackOpen && (
              <div className="px-5 pb-5 space-y-5 border-t border-white/10 pt-4 animate-in fade-in">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-300 font-bold">Cashback por Mensualidad</span>
                    <span className="font-black text-base" style={{ color: 'var(--color-primary, #00F5D4)' }}>{membershipCashback}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={membershipCashback}
                    onChange={(e) => setMembershipCashback(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--color-primary, #00F5D4)' }}
                  />
                  <span className="text-xs text-zinc-500">
                    Se acredita al monedero del socio al aprobar su cuota mensual en caja.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-300 font-bold">Cashback por Tienda / Barra Retail</span>
                    <span className="font-black text-base" style={{ color: 'var(--color-primary, #00F5D4)' }}>{retailCashback}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={retailCashback}
                    onChange={(e) => setRetailCashback(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--color-primary, #00F5D4)' }}
                  />
                  <span className="text-xs text-zinc-500">
                    Se acredita al monedero por compras de batidos, proteínas o snacks.
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-2">
                    Enlace Directo de Google Reviews (5 Estrellas)
                  </label>
                  <input
                    type="text"
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/titanus-gym/review"
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-2">
                    WhatsApp Oficial del Gimnasio
                  </label>
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="593987654321"
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gestión de Entrenadores Reales */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                <h2 className="text-lg font-bold text-white">Entrenadores del Gimnasio</h2>
              </div>
              <span className="text-xs text-zinc-500">{coaches.length} registrados</span>
            </div>

            <form onSubmit={handleAddCoach} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre del nuevo entrenador..."
                  value={newCoachName}
                  onChange={(e) => setNewCoachName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingCoach || uploadingAvatar}
                  className="px-4 py-2 text-black font-bold text-sm rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                  style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                >
                  <Plus className="w-4 h-4 text-black" />
                  Agregar
                </button>
              </div>

              {/* Input URL + Botón para subir imagen desde el equipo */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL o sube una imagen..."
                  value={newCoachAvatarUrl}
                  onChange={(e) => setNewCoachAvatarUrl(e.target.value)}
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none placeholder-zinc-500"
                />
                <label className="cursor-pointer px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingAvatar ? 'Subiendo...' : 'Subir Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImage(e, 'NEW')}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
            </form>

            <div className="divide-y divide-white/10 max-h-80 overflow-y-auto space-y-1">
              {coaches.map((c) => {
                const isEditing = editingCoachId === c.id

                return (
                  <div key={c.id} className="py-2.5">
                    {isEditing ? (
                      /* Formulario inline de Edición */
                      <div className="p-3 bg-zinc-900/90 rounded-xl border border-white/10 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Editar Entrenador</span>
                          <button
                            type="button"
                            onClick={cancelEditCoach}
                            className="text-zinc-500 hover:text-white text-xs p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nombre del entrenador"
                          className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                        />

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editAvatarUrl}
                            onChange={(e) => setEditAvatarUrl(e.target.value)}
                            placeholder="URL de foto o avatar..."
                            className="flex-1 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                          />
                          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 shrink-0">
                            <Upload className="w-3 h-3" />
                            <span>{uploadingAvatar ? '...' : 'Subir'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadImage(e, 'EDIT')}
                              className="hidden"
                              disabled={uploadingAvatar}
                            />
                          </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEditCoach}
                            className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCoach(c.id)}
                            disabled={updatingCoach}
                            className="px-3 py-1 text-black font-bold text-xs rounded-lg flex items-center gap-1"
                            style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                          >
                            <Check className="w-3.5 h-3.5 text-black" />
                            {updatingCoach ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Vista normal de Entrenador */
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 flex items-center justify-center">
                            {c.avatarUrl ? (
                              <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-zinc-400">{c.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">{c.name}</span>
                            <span className="text-xs text-zinc-500 block">Coach Titular</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditCoach(c)}
                            title="Editar entrenador y foto"
                            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCoach(c.id)}
                            title="Eliminar entrenador"
                            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Conector WhatsApp Evolution API */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                    wsStatus === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-white">Canal de WhatsApp</div>
                  <div className="text-sm text-zinc-400">Línea Oficial</div>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                  wsStatus === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}
              >
                {wsStatus === 'connected' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> Activo
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Offline
                  </>
                )}
              </div>
            </div>

            {wsStatus !== 'connected' && (
              <div className="space-y-4">
                {!qrCode ? (
                  <button
                    onClick={getQrCode}
                    disabled={loadingQr}
                    className="w-full text-black p-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  >
                    <Smartphone className="w-5 h-5" />
                    {loadingQr ? 'Generando QR...' : 'Conectar WhatsApp'}
                  </button>
                ) : (
                  <div className="bg-white p-6 rounded-3xl space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="text-center space-y-2">
                      <h4 className="font-bold text-black text-lg">Escanea este código QR</h4>
                      <p className="text-sm text-gray-600">Abre WhatsApp en tu teléfono y escanea</p>
                    </div>
                    <div className="flex justify-center">
                      <img
                        src={qrCode}
                        alt="QR"
                        className="w-64 h-64 border-4 rounded-2xl object-contain"
                        style={{ borderColor: 'var(--color-primary, #00F5D4)' }}
                      />
                    </div>
                    <button
                      onClick={() => setQrCode(null)}
                      className="text-xs text-gray-500 hover:text-black underline w-full text-center"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            {wsStatus === 'connected' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
                <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Instancia vinculada y lista para recibir solicitudes QR
                </span>
                <p className="text-xs text-zinc-400">
                  Ambos sistemas (Fidelización y Difusión masiva) están escuchando a través del mismo canal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
