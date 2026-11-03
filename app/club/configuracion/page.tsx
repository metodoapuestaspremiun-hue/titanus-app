'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  Sliders,
  RefreshCw,
  Smartphone,
  CheckCircle,
  XCircle,
  Save,
  Plus,
  Trash2,
  Users,
  Link2,
  Terminal
} from 'lucide-react'
import axios from 'axios'

export default function ClubConfig() {
  const [membershipCashback, setMembershipCashback] = useState(10)
  const [retailCashback, setRetailCashback] = useState(5)
  const [reviewUrl, setReviewUrl] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Estado de conexión WhatsApp (Evolution API real)
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [webhookMsg, setWebhookMsg] = useState('')
  const [registeringWebhook, setRegisteringWebhook] = useState(false)

  // Gestión de Entrenadores reales
  const [coaches, setCoaches] = useState<any[]>([])
  const [newCoachName, setNewCoachName] = useState('')
  const [addingCoach, setAddingCoach] = useState(false)

  const checkWhatsAppStatus = async () => {
    try {
      const res = await axios.get('/api/whatsapp/status')
      setWsStatus(res.data.connected || res.data.status === 'open' ? 'connected' : 'disconnected')
    } catch (e) {
      setWsStatus('disconnected')
    }
  }

  const registerWebhook = async () => {
    try {
      setRegisteringWebhook(true)
      setWebhookMsg('')
      const domain = window.location.origin
      const res = await axios.post('/api/club/setup-webhook', {
        webhookUrl: `${domain}/api/club/webhook/whatsapp`,
      })
      if (res.data.success) {
        setWebhookMsg(`✅ Webhook registrado correctamente: ${res.data.webhookUrl}`)
      } else {
        setWebhookMsg(`⚠️ Respuesta de Evolution: ${JSON.stringify(res.data.evolutionResponse)}`)
      }
    } catch (e: any) {
      setWebhookMsg(`❌ Error: ${e.response?.data?.error || e.message}`)
    } finally {
      setRegisteringWebhook(false)
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
      await axios.post('/api/club/coaches', { name: newCoachName })
      setNewCoachName('')
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

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await axios.get('/api/club/config')
        if (res.data) {
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
      setMessage('✅ Configuración guardada en la base de datos con éxito.')
      setTimeout(() => setMessage(''), 4000)
    } catch (e: any) {
      alert('Error guardando configuración: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            CONFIGURACIÓN TÁCTICA & QR
            <Settings className="w-7 h-7 text-[#FCDD09]" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Control de comisiones de monedero, vinculación WhatsApp y gestión de entrenadores.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-[#FCDD09] text-black font-black text-sm flex items-center gap-2 hover:bg-[#E5C100] transition-all shadow-lg shadow-[#FCDD09]/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4 text-black" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-[#FCDD09]/10 border border-[#FCDD09]/30 text-[#FCDD09] text-sm font-bold animate-in fade-in">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Columna Izquierda: Sliders de Comisiones y Ajustes */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-5 h-5 text-[#FCDD09]" />
              <h2 className="text-lg font-bold text-white">Porcentajes de Cashback (Monedero)</h2>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300 font-bold">Cashback por Mensualidad</span>
                <span className="font-black text-[#FCDD09] text-base">{membershipCashback}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={membershipCashback}
                onChange={(e) => setMembershipCashback(Number(e.target.value))}
                className="w-full accent-[#FCDD09] cursor-pointer"
              />
              <span className="text-xs text-zinc-500">
                Se acredita al monedero del socio al aprobar su cuota mensual en caja.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-300 font-bold">Cashback por Tienda / Barra Retail</span>
                <span className="font-black text-[#FCDD09] text-base">{retailCashback}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={retailCashback}
                onChange={(e) => setRetailCashback(Number(e.target.value))}
                className="w-full accent-[#FCDD09] cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FCDD09]"
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
                className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FCDD09]"
              />
            </div>
          </div>

          {/* Gestión de Entrenadores Reales */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#FCDD09]" />
                <h2 className="text-lg font-bold text-white">Entrenadores del Gimnasio</h2>
              </div>
              <span className="text-xs text-zinc-500">{coaches.length} registrados</span>
            </div>

            {/* Formulario para agregar */}
            <form onSubmit={handleAddCoach} className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre del nuevo entrenador..."
                value={newCoachName}
                onChange={(e) => setNewCoachName(e.target.value)}
                className="flex-1 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FCDD09]"
              />
              <button
                type="submit"
                disabled={addingCoach}
                className="px-4 py-2 bg-[#FCDD09] text-black font-bold text-sm rounded-xl hover:bg-[#E5C100] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-black" />
                Agregar
              </button>
            </form>

            {/* Lista de Coaches */}
            <div className="divide-y divide-white/10 max-h-56 overflow-y-auto">
              {coaches.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">{c.name}</span>
                    <span className="text-xs text-zinc-500 block">Coach Titular</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCoach(c.id)}
                    className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Conector WhatsApp Evolution API con Escaneo QR Real */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-6">
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
                  <div className="font-bold text-white">WhatsApp Instance</div>
                  <div className="text-sm text-zinc-400">gym_bot (Evolution API)</div>
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

            {/* Panel de Conexión / QR */}
            {wsStatus !== 'connected' && (
              <div className="space-y-4">
                {!qrCode ? (
                  <button
                    onClick={getQrCode}
                    disabled={loadingQr}
                    className="w-full bg-[#FCDD09] hover:bg-[#E5C100] text-black p-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#FCDD09]/20 disabled:opacity-50"
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
                        className="w-64 h-64 border-4 border-[#FCDD09] rounded-2xl object-contain"
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

            {/* Registro de Webhook */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#FCDD09]" />
                <span className="text-sm font-bold text-white">Webhook de Fidelización</span>
              </div>
              <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                <code className="text-[11px] text-[#FCDD09] font-mono select-all block break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/api/club/webhook/whatsapp
                </code>
              </div>
              <button
                onClick={registerWebhook}
                disabled={registeringWebhook}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all disabled:opacity-50"
              >
                <Terminal className="w-4 h-4 text-[#FCDD09]" />
                {registeringWebhook ? 'Registrando...' : 'Registrar Webhook en Evolution API'}
              </button>
              {webhookMsg && (
                <p className="text-xs text-zinc-300 bg-zinc-900 p-3 rounded-xl border border-white/10 break-all">
                  {webhookMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
