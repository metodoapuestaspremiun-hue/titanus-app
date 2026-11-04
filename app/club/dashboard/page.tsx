'use client'

import React, { useState, useEffect } from 'react'
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
  Download
} from 'lucide-react'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'

export default function ReceptionDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tenantConfig, setTenantConfig] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [qrModal, setQrModal] = useState<{ open: boolean; type: string; title: string; token: string }>({
    open: false,
    type: '',
    title: '',
    token: '',
  })

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

  useEffect(() => {
    fetchTenantConfig()
    fetchPendingPayments()
    const interval = setInterval(fetchPendingPayments, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (id: string, type: string, currentAmount: number) => {
    let finalAmount = currentAmount

    // Para compras en barra (RETAIL), el monto lo confirma recepción en el momento
    if (type === 'RETAIL' && currentAmount === 0) {
      const amountStr = prompt('Ingrese el monto total de la compra en barra (USD):')
      if (!amountStr) return
      finalAmount = parseFloat(amountStr)
      if (isNaN(finalAmount) || finalAmount <= 0) {
        alert('Monto inválido')
        return
      }
    }

    try {
      setLoading(true)
      await axios.post('/api/club/payments', { paymentId: id, action: 'APPROVE', finalAmount })
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

  // Descargar el código QR proyectado como imagen PNG
  const downloadQrCode = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = 600
      canvas.height = 600
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 50, 50, 500, 500)
        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `QR_${qrModal.type}_${qrModal.token}.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const openDynamicQr = async (type: 'MEMBERSHIP' | 'RETAIL' | 'EVALUATION', title: string) => {
    try {
      setGeneratingQr(true)
      // Genera un código nuevo aleatorio en la BD para evitar repeticiones o fotos viejas
      const res = await axios.post('/api/club/qr/generate', { type })
      if (res.data.success) {
        setQrModal({
          open: true,
          type,
          title,
          token: res.data.token,
        })
      }
    } catch (e: any) {
      alert('Error generando código QR dinámico: ' + (e.response?.data?.error || e.message))
    } finally {
      setGeneratingQr(false)
    }
  }

  const openQr = (type: string, title: string, token: string) => {
    setQrModal({ open: true, type, title, token })
  }

  // Enlace directo de WhatsApp con el comando prefijado
  const whatsappTargetPhone = tenantConfig?.whatsappPhone || '593987654321'
  const getWhatsAppLink = (token: string) => {
    return `https://wa.me/${whatsappTargetPhone}?text=${encodeURIComponent(`Hola, mi código es ${token}`)}`
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            MONITOR DE RECEPCIÓN
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#FCDD09]/10 text-[#FCDD09] border border-[#FCDD09]/30 font-bold uppercase tracking-widest">
              Zero-Jump
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gestión táctica de cobros, canjes de monedero y aprobación de pagos en mostrador.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPendingPayments}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-[#FCDD09] transition-all text-zinc-400 hover:text-white"
            title="Refrescar solicitudes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FCDD09]' : ''}`} />
          </button>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar socio por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FCDD09]"
            />
          </div>
        </div>
      </div>

      {/* 3 Botones de Proyección QR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-950 border border-[#FCDD09]/30 relative overflow-hidden group hover:border-[#FCDD09] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#FCDD09]/10 text-[#FCDD09] flex items-center justify-center border border-[#FCDD09]/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FCDD09]/20 text-[#FCDD09]">
              {tenantConfig?.referralCommPct || 10}% Cashback Cuota
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Cobro de Mensualidad</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Muestra el QR para que el socio escanee con la cámara y pague con WhatsApp.
          </p>
          <button
            disabled={generatingQr}
            onClick={() => openDynamicQr('MEMBERSHIP', 'Pago de Mensualidad')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#FCDD09] text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-[#E5C100] transition-all shadow-lg shadow-[#FCDD09]/20 disabled:opacity-50"
          >
            <QrCode className="w-4 h-4 text-black" />
            {generatingQr ? 'Generando QR Único...' : 'Proyectar QR Cuota'}
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 relative overflow-hidden group hover:border-[#FCDD09]/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-zinc-300 flex items-center justify-center border border-white/10">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-200">
              {tenantConfig?.storeReferralCommPct || 5}% Cashback Barra
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Tienda & Barra Retail</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Acredita saldo automático por compras de batidos y suplementos.
          </p>
          <button
            disabled={generatingQr}
            onClick={() => openDynamicQr('RETAIL', 'Consumo en Barra de Suplementos')}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all border border-white/10 disabled:opacity-50"
          >
            <QrCode className="w-4 h-4 text-[#FCDD09]" />
            {generatingQr ? 'Generando QR Único...' : 'Proyectar QR Retail'}
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 relative overflow-hidden group hover:border-[#FCDD09]/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#FCDD09]/10 text-[#FCDD09] flex items-center justify-center border border-[#FCDD09]/20">
              <Star className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FCDD09]/20 text-[#FCDD09]">
              Google 5★
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Calificar a Coach</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Deriva 5★ directo a Google Maps y 1-4★ a reporte interno.
          </p>
          <button
            disabled={generatingQr}
            onClick={() => openDynamicQr('EVALUATION', 'Calificación de Entrenadores')}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all border border-white/10 disabled:opacity-50"
          >
            <QrCode className="w-4 h-4 text-[#FCDD09]" />
            {generatingQr ? 'Generando QR Único...' : 'Proyectar QR Coach'}
          </button>
        </div>
      </div>

      {/* Cola en Vivo desde Base de Datos Real */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#FCDD09] animate-pulse"></div>
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
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-[#FCDD09] border border-[#FCDD09]/30">
                    {item.customer?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.customer?.name}</span>
                      <span className="text-xs text-zinc-400">+{item.customer?.phone}</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {item.description} &bull;{' '}
                      <span className="text-[#FCDD09] font-bold">
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
                      className="px-3.5 py-2 rounded-xl bg-[#FCDD09] text-black text-xs font-black hover:bg-[#E5C100] transition-all flex items-center gap-1.5 shadow-md shadow-[#FCDD09]/20 disabled:opacity-50"
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
          <div className="bg-zinc-950 border border-[#FCDD09]/40 rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setQrModal({ ...qrModal, open: false })}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs uppercase font-bold text-[#FCDD09] tracking-widest block mb-1">
              Escaneo en Mostrador
            </span>
            <h3 className="text-xl font-black text-white mb-6">{qrModal.title}</h3>

            {/* Renderizado QR Vectorial Real (Escaneable con cámara normal de celular) */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto mb-4 border-4 border-[#FCDD09]">
              <QRCodeSVG
                id="qr-code-svg"
                value={getWhatsAppLink(qrModal.token)}
                size={210}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#FCDD09]/10 border border-[#FCDD09]/30 text-[#FCDD09] font-mono font-bold">
                Código Dinámico: {qrModal.token}
              </span>
              <button
                onClick={downloadQrCode}
                className="p-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-[#FCDD09] text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1 px-2"
                title="Descargar imagen PNG del QR"
              >
                <Download className="w-3.5 h-3.5 text-[#FCDD09]" />
                Descargar PNG
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Este código es de un solo uso y expira en 15 minutos para evitar capturas o repeticiones fraudulentas.
            </p>

            <a
              href={getWhatsAppLink(qrModal.token)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#FCDD09] hover:underline font-bold"
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
          <div className="w-full max-w-md bg-black border-l border-white/10 h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#FCDD09] font-medium">+{selectedCustomer.phone}</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-6 p-6 rounded-2xl bg-zinc-950 border border-[#FCDD09]/40 text-center">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest block mb-1">
                  Saldo en Monedero Digital
                </span>
                <span className="text-4xl font-black text-[#FCDD09] tracking-tight">
                  ${selectedCustomer.balance.toFixed(2)} USD
                </span>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#FCDD09]/20 text-[#FCDD09] font-bold">
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
                  className="w-full py-3 px-4 rounded-xl bg-[#FCDD09] text-black font-black text-sm hover:bg-[#E5C100] transition-all shadow-lg shadow-[#FCDD09]/20"
                >
                  Descontar Saldo en Mostrador
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <span className="text-xs text-zinc-500">Filosofía Zero-Jump &bull; TITANUS CRM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
