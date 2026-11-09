'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Search,
  CheckCircle2,
  XCircle,
  QrCode,
  Sparkles,
  CreditCard,
  ShoppingBag,
  Star,
  ChevronRight,
  X,
  RefreshCw,
  ExternalLink,
  Download,
  Ticket,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'
import { action_membership_jpg, action_bar_jpg, action_coach_jpg } from '@/lib/brandingImages'
import { useTheme } from '@/components/ThemeProvider'

export default function ReceptionDashboard() {
  const theme = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tenantConfig, setTenantConfig] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [globalStats, setGlobalStats] = useState<{ totalBalance: number; redeemed: number; totalCustomers: number }>({
    totalBalance: 0,
    redeemed: 0,
    totalCustomers: 0,
  })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [qrModal, setQrModal] = useState<{
    open: boolean
    type: string
    title: string
    token: string
    qrUrl: string
    waUrl: string
  }>({
    open: false,
    type: '',
    title: '',
    token: '',
    qrUrl: '',
    waUrl: '',
  })

  // Modal de aprobación de Retail con detalle de producto
  const [retailModal, setRetailModal] = useState<{ open: boolean; paymentId: string; customerName: string } | null>(null)
  const [retailAmount, setRetailAmount] = useState('')
  const [retailProduct, setRetailProduct] = useState('')

  // Estado para el modal de canje de "Pase de un Amigo" en mostrador
  const [friendPassModal, setFriendPassModal] = useState(false)
  const [passCodeInput, setPassCodeInput] = useState('')
  const [verifyingPass, setVerifyingPass] = useState(false)
  const [verifiedPass, setVerifiedPass] = useState<any>(null)
  const [passError, setPassError] = useState<string | null>(null)
  const [friendName, setFriendName] = useState('')
  const [friendPhone, setFriendPhone] = useState('')
  const [redeemingPass, setRedeemingPass] = useState(false)
  const [passSuccess, setPassSuccess] = useState<string | null>(null)

  // Sondeo automático del estado del QR proyectado (cambia automáticamente cuando el socio lo consume)
  useEffect(() => {
    if (!qrModal.open || !qrModal.token) return

    const checkTokenUsage = async () => {
      try {
        const res = await axios.get(`/api/club/qr/check?token=${qrModal.token}`)
        // Si el token ya fue consumido por WhatsApp, regenerar inmediatamente el siguiente código
        if (res.data?.consumed) {
          openDynamicQr(qrModal.type as any, qrModal.title)
          fetchPendingPayments()
        }
      } catch {}
    }

    const interval = setInterval(checkTokenUsage, 3000)
    return () => clearInterval(interval)
  }, [qrModal.open, qrModal.token, qrModal.type, qrModal.title])

  const fetchTenantConfig = async () => {
    try {
      const res = await axios.get('/api/club/config')
      setTenantConfig(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchPendingPayments = async () => {
    try {
      const res = await axios.get('/api/club/payments')
      setPayments(res.data.payments || [])
    } catch (e) {
      console.error('Error fetching payments:', e)
    }
  }

  const fetchGlobalStats = async () => {
    try {
      const res = await axios.get('/api/club/wallet/audit')
      if (res.data) {
        setGlobalStats({
          totalBalance: Number(res.data.totalBalance || 0),
          redeemed: Number(res.data.redeemed || 0),
          totalCustomers: Array.isArray(res.data.customers) ? res.data.customers.length : 0,
        })
      }
    } catch (e) {
      console.error('Error fetching global wallet stats:', e)
    }
  }

  // Cargar estadísticas globales, configuración del gimnasio y pagos pendientes al montar y en intervalo
  useEffect(() => {
    fetchGlobalStats()
    fetchTenantConfig()
    fetchPendingPayments()

    // Polling continuo cada 3 segundos para detectar en tiempo real cuando llega una compra de WhatsApp
    const pollInterval = setInterval(() => {
      fetchPendingPayments()
      fetchGlobalStats()
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [])

  // Buscar socios dinámicamente con el input de búsqueda
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    const delay = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await axios.get(`/api/club/customers/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(res.data.customers || [])
        setSearchOpen(true)
      } catch (e) {
        console.error(e)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(delay)
  }, [searchQuery])

  const handleApprove = async (id: string, type: string, currentAmount: number) => {
    // Para compras en Tienda/Barra, mostrar modal con producto + monto
    if (type === 'RETAIL') {
      const item = payments.find(p => p.id === id)
      setRetailModal({
        open: true,
        paymentId: id,
        customerName: item?.customer?.name || 'Socio',
      })
      setRetailAmount(currentAmount > 0 ? String(currentAmount) : '')
      setRetailProduct('')
      return
    }

    try {
      setLoading(true)
      await axios.post('/api/club/payments', { paymentId: id, action: 'APPROVE', finalAmount: currentAmount })
      await fetchPendingPayments()
    } catch (e: any) {
      alert('Error aprobando pago: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRetail = async () => {
    if (!retailModal) return
    const amount = parseFloat(retailAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto válido mayor a $0.')
      return
    }
    try {
      setLoading(true)
      await axios.post('/api/club/payments', {
        paymentId: retailModal.paymentId,
        action: 'APPROVE',
        finalAmount: amount,
        productDescription: retailProduct.trim() || null,
      })
      setRetailModal(null)
      await fetchPendingPayments()
    } catch (e: any) {
      alert('Error aprobando pago: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    try {
      setLoading(true)
      await axios.post('/api/club/payments', { paymentId: id, action: 'REJECT' })
      await fetchPendingPayments()
    } catch (e: any) {
      alert('Error rechazando pago: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemBalance = async () => {
    if (!selectedCustomer) return
    const amountStr = prompt(
      `Ingrese monto a descontar en mostrador (Saldo disponible: $${selectedCustomer.balance.toFixed(2)} USD):`,
      selectedCustomer.balance.toString()
    )
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0 || amount > selectedCustomer.balance) {
      alert('Monto inválido')
      return
    }

    try {
      setLoading(true)
      const res = await axios.post('/api/club/wallet', {
        customerId: selectedCustomer.id,
        amountToRedeem: amount,
        description: 'Canje de saldo aplicado en mostrador de recepción',
      })
      alert(`✅ Canje exitoso. Nuevo saldo disponible: $${res.data.newBalance.toFixed(2)} USD`)
      setIsDrawerOpen(false)
      fetchPendingPayments()
    } catch (e: any) {
      alert('Error al canjear: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  const [generatingQr, setGeneratingQr] = useState(false)

  // Verificar código de Pase Amigo
  const handleVerifyPass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!passCodeInput.trim()) return

    try {
      setVerifyingPass(true)
      setPassError(null)
      setVerifiedPass(null)
      setPassSuccess(null)

      const res = await axios.get(`/api/club/passes?code=${encodeURIComponent(passCodeInput.trim())}`)
      if (res.data?.valid) {
        setVerifiedPass(res.data.pass)
      }
    } catch (e: any) {
      setPassError(e.response?.data?.error || 'Código no válido o inexistente')
    } finally {
      setVerifyingPass(false)
    }
  }

  // Canjear y dar acceso al amigo
  const handleRedeemPass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifiedPass || !friendName.trim()) return

    try {
      setRedeemingPass(true)
      setPassError(null)

      const res = await axios.post('/api/club/passes', {
        passId: verifiedPass.id,
        redeemedByName: friendName.trim(),
        redeemedByPhone: friendPhone.trim(),
      })

      setPassSuccess(res.data?.message || '¡Pase de amigo canjeado con éxito! Acceso autorizado.')
      setVerifiedPass(null)
      setPassCodeInput('')
      setFriendName('')
      setFriendPhone('')
    } catch (e: any) {
      setPassError(e.response?.data?.error || 'Error al canjear el pase')
    } finally {
      setRedeemingPass(false)
    }
  }

  const resetPassModal = () => {
    setFriendPassModal(false)
    setPassCodeInput('')
    setVerifiedPass(null)
    setPassError(null)
    setPassSuccess(null)
    setFriendName('')
    setFriendPhone('')
  }

  // Descargar el código QR proyectado como imagen PNG
  const downloadQrCode = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()

    img.onload = () => {
      canvas.width = 600
      canvas.height = 600
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 50, 50, 500, 500)
        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `QR_${tenantConfig?.slug || 'club'}_${qrModal.type}.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const openDynamicQr = async (type: 'MEMBERSHIP' | 'RETAIL' | 'EVALUATION', title: string) => {
    try {
      setGeneratingQr(true)
      
      const slug = tenantConfig?.slug || theme?.tenantSlug || 'titanus-gym'
      const typeRoute = type === 'MEMBERSHIP' ? 'm' : type === 'RETAIL' ? 't' : 'c'
      const branchCode = theme?.branchName ? `/${encodeURIComponent(theme.branchName.toLowerCase())}` : ''

      // URL Inteligente Permanente:
      // El cartel físico siempre apunta a /qr/[slug]/[tipo]/[sede]
      // Cuando cualquier cliente lo escanea con su cámara, el servidor genera un token dinámico efímero en 0.1s
      // y lo redirige automáticamente a WhatsApp con el código único de un solo uso.
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const permanentQrUrl = `${baseUrl}/qr/${slug}/${typeRoute}${branchCode}`

      setQrModal({
        open: true,
        type,
        title,
        token: `${type === 'MEMBERSHIP' ? 'MEM' : type === 'RETAIL' ? 'RET' : 'EVAL'}${theme?.branchName ? `-${theme.branchName.toUpperCase()}` : ''}`,
        qrUrl: permanentQrUrl,
        waUrl: permanentQrUrl,
      })
    } catch (e: any) {
      alert('Error mostrando código QR: ' + (e.response?.data?.error || e.message))
    } finally {
      setGeneratingQr(false)
    }
  }

  // Enlace directo de WhatsApp con el comando prefijado
  const getWhatsAppLink = (token: string) => {
    if (qrModal.waUrl && qrModal.token === token) {
      return qrModal.waUrl
    }
    const phone = tenantConfig?.whatsappPhone || '593986962872'
    return `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, mi código es ${token}`)}`
  }

  const tenantName = tenantConfig?.name || theme?.tenantName || 'ALL-CRM'

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            MONITOR DE RECEPCIÓN
            <span
              className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 15%, transparent)',
                color: 'var(--color-primary, #00F5D4)',
                borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
              }}
            >
              En Tiempo Real
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gestión táctica de cobros, canjes de monedero y aprobación de pagos en mostrador.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFriendPassModal(true)}
            className="px-4 py-2.5 rounded-xl text-black font-black text-sm flex items-center gap-2 shadow-lg transition-all"
            style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
          >
            <Ticket className="w-4 h-4 text-black" />
            Canjear Pase Amigo
          </button>

          <button
            onClick={fetchPendingPayments}
            className="p-2.5 rounded-xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] transition-all text-zinc-400 hover:text-white"
            title="Refrescar solicitudes"
          >
            <RefreshCw
              className="w-4 h-4"
              style={{ color: loading ? 'var(--color-primary, #00F5D4)' : undefined }}
            />
          </button>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar socio por nombre o celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setSearchOpen(true) }}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            {/* Dropdown de resultados de búsqueda */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card,#05101C)] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/10 max-h-60 overflow-y-auto">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c)
                      setSearchOpen(false)
                      setSearchQuery('')
                    }}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-white text-xs block">{c.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">+{c.phone}</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                      ${c.balance.toFixed(2)} USD
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN RESUMEN GENERAL (Modo Dual: Global por defecto / Socio Enfocado al buscar) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              {selectedCustomer ? 'SOCIO EN MOSTRADOR' : 'RESUMEN GENERAL DEL CLUB'}
            </h2>
            <p className="text-xs text-zinc-400">
              {selectedCustomer
                ? `Operando sobre el socio ${selectedCustomer.name}. Puedes canjearle saldo o revisar su historial.`
                : 'Métricas financieras en tiempo real: cashback acumulado y canjeado en todo el gimnasio.'}
            </p>
          </div>

          {selectedCustomer && (
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all self-start sm:self-auto flex items-center gap-1.5"
              style={{ color: 'var(--color-primary, #00F5D4)' }}
            >
              <span>✕</span> Volver a Métricas Globales
            </button>
          )}
        </div>

        {/* Tarjeta Visual: Si hay un socio seleccionado (o buscado), muestra sus datos y botones de canje */}
        {selectedCustomer ? (
          <div className="rounded-3xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.2))] relative overflow-hidden p-6 sm:p-8 shadow-2xl animate-in fade-in">
            {/* Fondo fotográfico B&W con opacidad */}
            <div className="absolute inset-0 z-0 opacity-15">
              <Image
                src={action_membership_jpg}
                alt="Background"
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/90 to-transparent" />
            </div>

            <div className="relative z-10 space-y-6">
              {/* Header del socio: Nombre, Badge VIP, Estado */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {selectedCustomer.name}
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono">
                      (Socio #{selectedCustomer.phone?.slice(-4) || '8666'})
                    </span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 15%, transparent)',
                      color: 'var(--color-primary, #00F5D4)',
                      borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}></span>
                    {selectedCustomer.membershipActive ? 'PREMIUM ACTIVO' : 'SOCIO ACTIVO'}
                  </div>
                </div>

                {/* Badge VIP GOLD */}
                <div
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-black backdrop-blur-md self-start"
                  style={{
                    color: 'var(--accent-gold, #F59E0B)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-gold, #F59E0B) 10%, black)',
                    borderColor: 'color-mix(in srgb, var(--accent-gold, #F59E0B) 40%, transparent)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold, #F59E0B)' }} />
                  <span>VIP GOLD</span>
                </div>
              </div>

              {/* Saldo Grande en Monedero del Socio */}
              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-baseline gap-2">
                  <span style={{ color: 'var(--color-primary, #00F5D4)' }}>
                    ${selectedCustomer.balance.toFixed(2)}
                  </span>
                  <span className="text-2xl sm:text-3xl text-white font-bold font-mono">USD</span>
                </div>
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider block">
                  CASHBACK DISPONIBLE EN MONEDERO DE ESTE SOCIO
                </span>
              </div>

              {/* Footer de la Tarjeta: Plan actual + Botones Tácticos */}
              <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-black shrink-0"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  >
                    {selectedCustomer.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">
                      PLAN ACTUAL
                    </span>
                    <span className="text-sm font-bold text-white">
                      Membresía Activa
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Ver Historial (Popout)
                  </button>
                  <button
                    type="button"
                    onClick={handleRedeemBalance}
                    className="px-5 py-2.5 rounded-xl text-black text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:scale-105"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  >
                    <QrCode className="w-4 h-4 text-black" />
                    Canjear QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MODO POR DEFECTO: Tarjeta Táctica de Resumen General de Todo el Gimnasio */
          <div className="rounded-3xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.2))] relative overflow-hidden p-6 sm:p-8 shadow-2xl animate-in fade-in">
            {/* Fondo fotográfico B&W con opacidad */}
            <div className="absolute inset-0 z-0 opacity-15">
              <Image
                src={action_membership_jpg}
                alt="Background"
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/90 to-transparent" />
            </div>

            <div className="relative z-10 space-y-6">
              {/* Header General del Gimnasio */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {tenantConfig?.name || theme?.tenantName || 'ALL-CRM'}
                      {theme?.branchName ? ` · Sede ${theme.branchName}` : ''}
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono">
                      {theme?.branchName ? `(Monedero & Cashback Sede ${theme.branchName})` : '(Monedero & Cashback Global)'}
                    </span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 15%, transparent)',
                      color: 'var(--color-primary, #00F5D4)',
                      borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}></span>
                    SISTEMA ACTIVO EN MOSTRADOR
                  </div>
                </div>

                {/* Badge VIP GOLD */}
                <div
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-black backdrop-blur-md self-start"
                  style={{
                    color: 'var(--accent-gold, #F59E0B)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-gold, #F59E0B) 10%, black)',
                    borderColor: 'color-mix(in srgb, var(--accent-gold, #F59E0B) 40%, transparent)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold, #F59E0B)' }} />
                  <span>FIDELIZACIÓN 360°</span>
                </div>
              </div>

              {/* Saldo Grande en Monederos Circulantes Globales */}
              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-black tracking-tight flex items-baseline gap-2">
                  <span style={{ color: 'var(--color-primary, #00F5D4)' }}>
                    ${globalStats.totalBalance.toFixed(2)}
                  </span>
                  <span className="text-2xl sm:text-3xl text-white font-bold font-mono">USD</span>
                </div>
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider block">
                  TOTAL EN MONEDEROS CIRCULANTES DE TODOS LOS SOCIOS
                </span>
              </div>

              {/* Footer de la Tarjeta Global: Métricas Clave */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">
                    TOTAL CANJEADO EN CAJA
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    ${globalStats.redeemed.toFixed(2)} USD
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">
                    SOCIOS CON BILLETERA
                  </span>
                  <span className="text-lg font-black text-white">
                    {globalStats.totalCustomers} socios registrados
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">
                    ACCESO RÁPIDO
                  </span>
                  <span className="text-xs text-zinc-400">
                    Usa el buscador para enfocar y canjear a un socio específico
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3 Botones de Proyección QR Estilo Táctico Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Cuota */}
        <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] relative overflow-hidden group transition-all flex flex-col justify-between shadow-xl">
          <div className="relative h-44 w-full overflow-hidden">
            <Image
              src={action_membership_jpg}
              alt="Cobro de Mensualidad"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/50 to-transparent" />
            <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
              <CreditCard className="w-5 h-5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
            </div>
            <div className="absolute top-3 right-3">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border shadow-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 25%, black)',
                  color: 'var(--color-primary, #00F5D4)',
                  borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 40%, transparent)',
                }}
              >
                {tenantConfig?.referralCommPct || 10}% Cashback Cuota
              </span>
            </div>
          </div>

          <div className="p-5 pt-0 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Cobro de Mensualidad</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Muestra el QR para que el socio escanee con la cámara y pague con WhatsApp.
              </p>
            </div>
            <button
              disabled={generatingQr}
              onClick={() => openDynamicQr('MEMBERSHIP', 'Pago de Mensualidad')}
              className="w-full py-3 px-4 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary, #00F5D4)',
              }}
            >
              <QrCode className="w-4 h-4 text-black" />
              {generatingQr ? 'Generando QR Único...' : 'Proyectar QR Cuota'}
            </button>
          </div>
        </div>

        {/* Card 2: Tienda & Barra */}
        <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] relative overflow-hidden group transition-all flex flex-col justify-between shadow-xl">
          <div className="relative h-44 w-full overflow-hidden">
            <Image
              src={action_bar_jpg}
              alt="Tienda & Barra Retail"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/50 to-transparent" />
            <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="absolute top-3 right-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md bg-black/60 text-zinc-200 border border-white/10 shadow-lg">
                {tenantConfig?.storeReferralCommPct || 5}% Cashback Barra
              </span>
            </div>
          </div>

          <div className="p-5 pt-0 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Tienda & Barra Retail</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Acredita saldo automático por compras de batidos y suplementos.
              </p>
            </div>
            <button
              disabled={generatingQr}
              onClick={() => openDynamicQr('RETAIL', 'Consumo en Barra de Suplementos')}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all border border-white/10 active:scale-[0.99] disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" style={{ color: 'var(--color-primary, #00F5D4)' }} />
              {generatingQr ? 'Generando QR Único...' : 'Proyectar QR Retail'}
            </button>
          </div>
        </div>

        {/* Card 3: Calificar Coach */}
        <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] relative overflow-hidden group transition-all flex flex-col justify-between shadow-xl">
          <div className="relative h-44 w-full overflow-hidden">
            <Image
              src={action_coach_jpg}
              alt="Calificar a Coach"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/50 to-transparent" />
            <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div className="absolute top-3 right-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg">
                Google 5★
              </span>
            </div>
          </div>

          <div className="p-5 pt-0 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Calificar a Coach</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Deriva 5★ directo a Google Maps y 1-4★ a reporte interno.
              </p>
            </div>
            <button
              disabled={generatingQr}
              onClick={() => openDynamicQr('EVALUATION', 'Calificación de Entrenadores')}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all border border-white/10 active:scale-[0.99] disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" style={{ color: 'var(--color-primary, #00F5D4)' }} />
              {generatingQr ? 'Generando QR Único...' : 'Proyectar QR Coach'}
            </button>
          </div>
        </div>
      </div>

      {/* Cola en Vivo desde Base de Datos Real */}
      <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
            ></div>
            <h2 className="text-lg font-bold text-white">Solicitudes Pendientes en Mostrador</h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {payments.length} solicitud(es) esperando aprobación
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-white/10 rounded-xl">
            No hay pagos pendientes de aprobación en este momento.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {payments.map((item) => (
              <div
                key={item.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 px-3 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold border"
                    style={{
                      color: 'var(--color-primary, #00F5D4)',
                      borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                    }}
                  >
                    {item.customer?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.customer?.name}</span>
                      <span className="text-xs text-zinc-400">+{item.customer?.phone}</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {item.description} &bull;{' '}
                      <span className="font-bold" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                        +${Number(item.cashbackAmt).toFixed(2)} USD Cashback ({Number(item.cashbackPct)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-white">
                    ${Number(item.amount).toFixed(2)} USD
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCustomer({
                          id: item.customer.id,
                          name: item.customer.name,
                          phone: item.customer.phone,
                          balance: Number(item.customer.wallets?.[0]?.balance || 0),
                        })
                        setIsDrawerOpen(true)
                      }}
                      className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs flex items-center gap-1 border border-white/10"
                      title="Inspeccionar billetera"
                    >
                      Billetera
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      disabled={loading}
                      onClick={() => handleApprove(item.id, item.type, Number(item.amount))}
                      className="px-3.5 py-2 rounded-xl text-black text-xs font-black transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--color-primary, #00F5D4)'
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      Aprobar
                    </button>

                    <button
                      disabled={loading}
                      onClick={() => handleReject(item.id)}
                      className="p-2 rounded-xl bg-zinc-900 text-zinc-400 border border-white/10 text-xs hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Proyección QR Matricial Real */}
      {qrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div
            className="bg-[var(--bg-card,#05101C)] border rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl"
            style={{ borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 40%, transparent)' }}
          >
            <button
              onClick={() => setQrModal({ ...qrModal, open: false })}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <span
              className="text-xs uppercase font-bold tracking-widest block mb-1"
              style={{ color: 'var(--color-primary, #00F5D4)' }}
            >
              Escaneo en Mostrador
            </span>
            <h3 className="text-xl font-black text-white mb-6">{qrModal.title}</h3>

            <div
              className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto mb-4 border-4"
              style={{ borderColor: 'var(--color-primary, #00F5D4)' }}
            >
              <QRCodeSVG
                id="qr-code-svg"
                value={qrModal.qrUrl}
                size={210}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <span
                className="text-[11px] px-2.5 py-1 rounded-full font-mono font-bold border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)',
                  color: 'var(--color-primary, #00F5D4)'
                }}
              >
                Cartel Permanente /{tenantConfig?.slug || 'club'}/{qrModal.type === 'MEMBERSHIP' ? 'm' : qrModal.type === 'RETAIL' ? 't' : 'c'}
              </span>
              <button
                onClick={downloadQrCode}
                className="p-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1 px-2"
                title="Descargar este QR para imprimirlo en tu cartel o acrílico"
              >
                <Download className="w-3.5 h-3.5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                Descargar para Imprimir
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Este es el código QR físico permanente. Imprímelo una sola vez. Cada cliente que lo escanee recibirá automáticamente su código seguro generado por el servidor y será dirigido al WhatsApp activo.
            </p>

            <a
              href={qrModal.waUrl || qrModal.qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs hover:underline font-bold"
              style={{ color: 'var(--color-primary, #00F5D4)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir simulación en WhatsApp Web
            </a>
          </div>
        </div>
      )}

      {/* Drawer Contextual Zero-Jump */}
      {isDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-md bg-[var(--bg-app,#03080F)] border-l border-[var(--border-card,rgba(0,245,212,0.15))] h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedCustomer.name}</h3>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                    +{selectedCustomer.phone}
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className="my-6 p-6 rounded-2xl bg-[var(--bg-card,#05101C)] border text-center"
                style={{ borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 40%, transparent)' }}
              >
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest block mb-1">
                  Saldo en Monedero Digital
                </span>
                <span className="text-4xl font-black tracking-tight" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                  ${selectedCustomer.balance.toFixed(2)} USD
                </span>
                <div
                  className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 20%, transparent)',
                    color: 'var(--color-primary, #00F5D4)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Listo para canje en mostrador
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Acción Táctica de Canje
                </h4>
                <button
                  onClick={handleRedeemBalance}
                  className="w-full py-3 px-4 rounded-xl text-black font-black text-sm transition-all shadow-lg"
                  style={{
                    backgroundColor: 'var(--color-primary, #00F5D4)'
                  }}
                >
                  Descontar Saldo en Mostrador
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <span className="text-xs text-zinc-500">{tenantName.toUpperCase()} &bull; Recepción y Caja</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aprobación de Venta Retail con Producto */}
      {retailModal?.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div
            className="bg-[var(--bg-card,#05101C)] border rounded-3xl p-7 max-w-md w-full shadow-2xl"
            style={{ borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 40%, transparent)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <span
                  className="text-[11px] uppercase font-bold tracking-widest block mb-0.5"
                  style={{ color: 'var(--color-primary, #00F5D4)' }}
                >
                  Aprobar Venta · Tienda & Barra
                </span>
                <h3 className="text-xl font-black text-white">
                  {retailModal.customerName}
                </h3>
              </div>
              <button
                onClick={() => setRetailModal(null)}
                className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Monto */}
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                  Monto Total de la Compra (USD) *
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg"
                    style={{ color: 'var(--color-primary, #00F5D4)' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={retailAmount}
                    onChange={(e) => setRetailAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white text-lg font-bold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Producto */}
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                  Producto(s) Adquirido(s) <span className="text-zinc-500 font-normal normal-case">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Proteína Whey 1kg, Creatina, Batido energético..."
                  value={retailProduct}
                  onChange={(e) => setRetailProduct(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none transition-colors placeholder-zinc-500"
                  maxLength={150}
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Se guardará en el historial del cliente para trazabilidad completa.
                </span>
              </div>

              {/* Preview del Cashback */}
              {retailAmount && !isNaN(parseFloat(retailAmount)) && parseFloat(retailAmount) > 0 && (
                <div
                  className="p-3 rounded-xl border flex items-center justify-between"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                  }}
                >
                  <span className="text-xs text-zinc-300">Cashback que recibirá el socio:</span>
                  <span className="font-black" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                    +${((parseFloat(retailAmount) * (tenantConfig?.storeReferralCommPct || 5)) / 100).toFixed(2)} USD
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRetailModal(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-sm font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={loading || !retailAmount || isNaN(parseFloat(retailAmount)) || parseFloat(retailAmount) <= 0}
                  onClick={handleApproveRetail}
                  className="flex-1 py-3 rounded-xl text-black font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-primary, #00F5D4)'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprobar & Acreditar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Canjear Pase Amigo en Mostrador */}
      {friendPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-3xl border p-8 space-y-6 relative shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card, #05101C)',
              borderColor: 'var(--border-card, rgba(0,245,212,0.2))',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 15%, transparent)',
                    color: 'var(--color-primary, #00F5D4)',
                  }}
                >
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Canjear Pase de Amigo</h3>
                  <p className="text-xs text-zinc-400">Acceso de 1 día de cortesía otorgado por un socio</p>
                </div>
              </div>
              <button
                onClick={resetPassModal}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensaje de Éxito */}
            {passSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
                <p className="text-xs text-emerald-300/80">
                  El amigo ya puede ingresar a las instalaciones. El código ha quedado quemado y no podrá volver a usarse.
                </p>
                <button
                  onClick={() => setPassSuccess(null)}
                  className="mt-2 text-xs font-bold underline hover:opacity-80 block"
                >
                  Canjear otro código
                </button>
              </div>
            )}

            {/* Mensaje de Error */}
            {passError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">No se puede canjear</span>
                  <span className="text-xs text-red-300/80">{passError}</span>
                </div>
              </div>
            )}

            {/* Paso 1: Ingreso del Código */}
            {!verifiedPass && !passSuccess && (
              <form onSubmit={handleVerifyPass} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                    Código de Pase (Dictado por el cliente)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: AMIGO-9X2Y"
                    value={passCodeInput}
                    onChange={(e) => setPassCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white text-lg font-mono font-black tracking-widest focus:outline-none transition-colors uppercase placeholder-zinc-600"
                    autoFocus
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Cada código es de 1 solo uso y viene incluido al pagar la mensualidad.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={verifyingPass || !passCodeInput.trim()}
                  className="w-full py-4 rounded-2xl text-black font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                >
                  {verifyingPass ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Search className="w-4 h-4 text-black" />
                  )}
                  {verifyingPass ? 'Verificando Código...' : 'Verificar Pase'}
                </button>
              </form>
            )}

            {/* Paso 2: Pase Válido encontrado -> Registrar Amigo y Conceder Acceso */}
            {verifiedPass && !passSuccess && (
              <form onSubmit={handleRedeemPass} className="space-y-5 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Pase Verificado:</span>
                    <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      {verifiedPass.code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Invitado por el Socio:</span>
                    <span className="font-bold text-sm text-white">
                      {verifiedPass.sponsor?.name || 'Socio'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Válido hasta:</span>
                    <span className="text-xs text-zinc-400">
                      {new Date(verifiedPass.expiresAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider block mb-1">
                      Nombre del Amigo (Quien ingresa hoy) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Gómez"
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider block mb-1">
                      WhatsApp del Amigo <span className="text-zinc-500 font-normal normal-case">(opcional, para bienvenida)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 593987654321"
                      value={friendPhone}
                      onChange={(e) => setFriendPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none placeholder-zinc-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setVerifiedPass(null)}
                    className="flex-1 py-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white text-sm font-bold transition-all"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={redeemingPass || !friendName.trim()}
                    className="flex-1 py-3.5 rounded-xl text-black font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
                  >
                    <UserCheck className="w-4 h-4 text-black" />
                    {redeemingPass ? 'Autorizando...' : 'Conceder Acceso'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
