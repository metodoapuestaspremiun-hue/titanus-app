'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  Wallet,
  Sparkles,
  RefreshCw,
  Search,
  Users,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  X,
  Clock,
  ListFilter
} from 'lucide-react'
import axios from 'axios'
import { action_membership_jpg, action_bar_jpg, action_coach_jpg } from '@/lib/brandingImages'

export default function WalletAudit() {
  const [data, setData] = useState<any>({ totalBalance: 0, redeemed: 0, customers: [] })
  const [loading, setLoading] = useState(true)

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'WITH_BALANCE' | 'ZERO_BALANCE'>('ALL')

  // Modal / Drawer de Historial de Cliente
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerHistory, setCustomerHistory] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)

  // Expandir listado de clientes
  const [showAllCustomers, setShowAllCustomers] = useState(false)

  // Filtros del historial de movimientos
  const [txTypeFilter, setTxTypeFilter] = useState('ALL')
  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/club/wallet/audit')
      setData(res.data)
    } catch (e) {
      console.error('Error cargando wallet:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWalletData()
  }, [])

  // Cargar historial detallado al seleccionar cliente
  const openCustomerHistory = async (customerId: string, page = 1, typeF = 'ALL', dateFrom = '', dateTo = '') => {
    setSelectedCustomerId(customerId)
    setLoadingHistory(true)
    if (page === 1) setCustomerHistory(null)
    try {
      const params = new URLSearchParams({
        customerId,
        page: String(page),
        pageSize: '15',
        type: typeF,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      })
      const res = await axios.get(`/api/club/wallet/history?${params.toString()}`)
      if (page === 1) {
        setCustomerHistory(res.data)
      } else {
        // Append para paginación
        setCustomerHistory((prev: any) => ({
          ...res.data,
          transactions: [...(prev?.transactions || []), ...res.data.transactions],
        }))
      }
      setHistoryPage(page)
    } catch (e) {
      console.error('Error cargando historial de cliente:', e)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Filtrado reactivo por Nombre o Celular
  const filteredCustomers = useMemo(() => {
    return (data.customers || []).filter((c: any) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery.trim())

      if (!matchesSearch) return false

      if (balanceFilter === 'WITH_BALANCE') return c.balance > 0
      if (balanceFilter === 'ZERO_BALANCE') return c.balance === 0
      return true
    })
  }, [data.customers, searchQuery, balanceFilter])

  // Total acumulado dinámico de los clientes filtrados
  const totalFiltrado = useMemo(() => {
    return filteredCustomers.reduce((acc: number, curr: any) => acc + curr.balance, 0)
  }, [filteredCustomers])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            BILLETERA & MONEDERO DIGITAL
            <Wallet className="w-7 h-7" style={{ color: 'var(--color-primary, #00F5D4)' }} />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Auditoría, canjes de saldo y trazabilidad completa de clientes. Haz clic en un socio para ver su historial.
          </p>
        </div>

        <button
          onClick={fetchWalletData}
          className="p-2.5 rounded-xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] transition-all text-zinc-400 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw
            className="w-4 h-4"
            style={{ color: loading ? 'var(--color-primary, #00F5D4)' : undefined }}
          />
        </button>
      </div>

      {/* Métricas Globales con Acciones Visuales Tácticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] relative overflow-hidden group transition-all flex flex-col justify-between shadow-xl">
          <div className="relative h-28 w-full overflow-hidden">
            <Image
              src={action_membership_jpg}
              alt="Circulante"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/60 to-transparent" />
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--color-primary, #00F5D4)' }} />
            </div>
          </div>
          <div className="p-5 pt-0">
            <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
              Total en Monederos Circulante
            </span>
            <div className="text-3xl font-black mt-2 font-number" style={{ color: 'var(--color-primary, #00F5D4)' }}>
              ${data.totalBalance.toFixed(2)} USD
            </div>
            <span className="text-xs text-zinc-500 mt-1 block">Saldo listo para canje</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] relative overflow-hidden group transition-all flex flex-col justify-between shadow-xl">
          <div className="relative h-28 w-full overflow-hidden">
            <Image
              src={action_bar_jpg}
              alt="Canjes"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/60 to-transparent" />
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="p-5 pt-0">
            <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
              Total Descontado en Canjes
            </span>
            <div className="text-3xl font-black text-white mt-2 font-number">
              ${data.redeemed.toFixed(2)} USD
            </div>
            <span className="text-xs text-zinc-500 mt-1 block">Ahorro real entregado en mostrador</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] relative overflow-hidden group transition-all flex flex-col justify-between shadow-xl">
          <div className="relative h-28 w-full overflow-hidden">
            <Image
              src={action_coach_jpg}
              alt="Socios"
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/60 to-transparent" />
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10">
              <Users className="w-4 h-4" style={{ color: 'var(--color-primary, #00F5D4)' }} />
            </div>
          </div>
          <div className="p-5 pt-0">
            <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
              Total Clientes Registrados
            </span>
            <div className="text-3xl font-black mt-2 font-number" style={{ color: 'var(--color-primary, #00F5D4)' }}>
              {data.customers.length}
            </div>
            <span className="text-xs text-zinc-500 mt-1 block">Socios con monedero activo</span>
          </div>
        </div>
      </div>

      {/* Directorio de Clientes con Filtros Tácticos */}
      <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
              Directorio de Billeteras
            </h2>
            <span className="text-xs text-zinc-400">
              Mostrando {filteredCustomers.length} cliente(s) &bull; Subtotal filtrado:{' '}
              <span className="font-bold" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                ${totalFiltrado.toFixed(2)} USD
              </span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Buscador por Nombre o Teléfono */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre o número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            {/* Filtro por saldo */}
            <select
              value={balanceFilter}
              onChange={(e: any) => setBalanceFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">Todos los Saldos</option>
              <option value="WITH_BALANCE">Con Saldo Disponible (&gt; $0)</option>
              <option value="ZERO_BALANCE">Sin Saldo ($0.00)</option>
            </select>
          </div>
        </div>

        {/* Listado de Socios con Saldo */}
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No se encontraron clientes que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="space-y-0">
            <div className="divide-y divide-white/10">
              {(showAllCustomers ? filteredCustomers : filteredCustomers.slice(0, 5)).map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => openCustomerHistory(c.id)}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 px-4 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold border transition-all"
                      style={{
                        color: 'var(--color-primary, #00F5D4)',
                        borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                      }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block group-hover:text-[var(--color-primary,#00F5D4)] transition-colors">
                        {c.name}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">+{c.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-lg font-black" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                        ${c.balance.toFixed(2)} USD
                      </span>
                      <span className="block text-[11px] text-zinc-500">Saldo monedero</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 group-hover:text-[var(--color-primary,#00F5D4)] transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCustomers.length > 5 && (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setShowAllCustomers(!showAllCustomers)}
                  className="px-6 py-2.5 rounded-xl border text-sm font-bold transition-all hover:bg-white/5"
                  style={{
                    color: 'var(--color-primary, #00F5D4)',
                    borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                  }}
                >
                  {showAllCustomers
                    ? `▲ Mostrar solo 5`
                    : `▼ Ver todos (${filteredCustomers.length} clientes)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Lateral: Historial y Movimientos del Cliente */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-lg bg-[var(--bg-app,#03080F)] border-l border-[var(--border-card,rgba(0,245,212,0.15))] h-full flex flex-col shadow-2xl">
            {/* Header fijo */}
            <div className="p-6 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className="text-[10px] uppercase font-bold tracking-widest block mb-0.5"
                    style={{ color: 'var(--color-primary, #00F5D4)' }}
                  >
                    Historial de Monedero
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {customerHistory?.customer?.name || 'Cargando socio...'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {customerHistory?.customer?.phone ? `+${customerHistory.customer.phone}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedCustomerId(null); setHistoryPage(1); setTxTypeFilter('ALL'); setTxDateFrom(''); setTxDateTo('') }}
                  className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tarjeta de Saldo */}
              {customerHistory && (
                <div
                  className="mt-4 p-4 rounded-2xl bg-[var(--bg-card,#05101C)] border flex items-center justify-between"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 40%, transparent)' }}
                >
                  <div>
                    <span className="text-xs text-zinc-400 font-medium block">Saldo Disponible</span>
                    <span className="text-2xl font-black" style={{ color: 'var(--color-primary, #00F5D4)' }}>
                      ${customerHistory.customer.balance.toFixed(2)} USD
                    </span>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 15%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                    }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingHistory && !customerHistory ? (
                <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                  <span className="text-sm">Cargando movimientos...</span>
                </div>
              ) : customerHistory ? (
                <>
                  {/* Filtros de Movimientos */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ListFilter className="w-4 h-4" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                      Movimientos del Monedero
                      <span className="ml-auto text-zinc-500 font-normal normal-case">
                        {customerHistory.pagination?.total || 0} en total
                      </span>
                    </h4>

                    {/* Filtros inline */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['ALL', 'CASHBACK_EARNED', 'REDEEMED'].map((t) => (
                        <button
                          key={t}
                          onClick={() => openCustomerHistory(selectedCustomerId!, 1, t, txDateFrom, txDateTo)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            txTypeFilter === t
                              ? 'text-black border-transparent'
                              : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                          }`}
                          style={{
                            backgroundColor: txTypeFilter === t ? 'var(--color-primary, #00F5D4)' : undefined,
                            color: txTypeFilter === t ? '#000000' : undefined
                          }}
                        >
                          {t === 'ALL' ? 'Todos' : t === 'CASHBACK_EARNED' ? '+ Cashback' : '- Canjes'}
                        </button>
                      ))}
                    </div>

                    {/* Filtros de fecha */}
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1">
                        <label className="text-[11px] text-zinc-500 block mb-1">Desde</label>
                        <input
                          type="date"
                          value={txDateFrom}
                          onChange={(e) => { setTxDateFrom(e.target.value); openCustomerHistory(selectedCustomerId!, 1, txTypeFilter, e.target.value, txDateTo) }}
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] text-zinc-500 block mb-1">Hasta</label>
                        <input
                          type="date"
                          value={txDateTo}
                          onChange={(e) => { setTxDateTo(e.target.value); openCustomerHistory(selectedCustomerId!, 1, txTypeFilter, txDateFrom, e.target.value) }}
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>
                      {(txDateFrom || txDateTo) && (
                        <button
                          onClick={() => { setTxDateFrom(''); setTxDateTo(''); openCustomerHistory(selectedCustomerId!, 1, txTypeFilter, '', '') }}
                          className="self-end pb-1.5 text-zinc-500 hover:text-white"
                          title="Limpiar fechas"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Lista de Transacciones */}
                    {customerHistory.transactions.length === 0 ? (
                      <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 text-center text-zinc-500 text-xs">
                        No hay movimientos con este filtro.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customerHistory.transactions.map((tx: any) => {
                          const isEarned = tx.type === 'CASHBACK_EARNED'
                          return (
                            <div
                              key={tx.id}
                              className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isEarned
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {isEarned ? (
                                    <ArrowDownLeft className="w-4 h-4" />
                                  ) : (
                                    <ArrowUpRight className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-white block">
                                    {isEarned ? 'Cashback Ganado' : 'Canje en Mostrador'}
                                  </span>
                                  <span className="text-[11px] text-zinc-400 block leading-tight">
                                    {tx.description}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3" />
                                    {new Date(tx.createdAt).toLocaleDateString('es-EC', {
                                       day: '2-digit', month: 'short', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-sm font-black flex-shrink-0 ml-2 ${isEarned ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isEarned ? '+' : '-'}${tx.amount.toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Paginación de Movimientos */}
                    {customerHistory.pagination && customerHistory.pagination.pages > 1 && (
                      <div className="flex items-center justify-between pt-3 text-xs text-zinc-400">
                        <span>
                          Pág. {historyPage} de {customerHistory.pagination.pages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={historyPage <= 1 || loadingHistory}
                            onClick={() => openCustomerHistory(selectedCustomerId!, historyPage - 1, txTypeFilter, txDateFrom, txDateTo)}
                            className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 disabled:opacity-30"
                          >
                            ← Anterior
                          </button>
                          <button
                            disabled={historyPage >= customerHistory.pagination.pages || loadingHistory}
                            onClick={() => openCustomerHistory(selectedCustomerId!, historyPage + 1, txTypeFilter, txDateFrom, txDateTo)}
                            className="px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 disabled:opacity-30"
                          >
                            Siguiente →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Historial de Pagos / Compras */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" style={{ color: 'var(--color-primary, #00F5D4)' }} />
                      Consumos Registrados ({customerHistory.payments.length})
                    </h4>

                    {customerHistory.payments.length === 0 ? (
                      <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 text-center text-zinc-500 text-xs">
                        No hay consumos registrados aún.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customerHistory.payments.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white">
                                {p.type === 'MEMBERSHIP' ? '🏋️ Mensualidad' : '🥤 Tienda / Barra'}
                              </span>
                              <div className="text-right">
                                <span className="font-bold text-white">${p.amount.toFixed(2)} USD</span>
                                <span className="block text-[10px] text-emerald-400">
                                  +${p.cashbackAmt.toFixed(2)} cashback
                                </span>
                              </div>
                            </div>
                            {p.description && (
                              <p className="text-zinc-400 text-[11px] mt-0.5 truncate">{p.description}</p>
                            )}
                            <span className="text-zinc-600 text-[10px] flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(p.createdAt).toLocaleDateString('es-EC', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer fijo */}
            <div className="p-4 border-t border-white/10 text-center flex-shrink-0">
              <span className="text-xs text-zinc-500">Trazabilidad de Billetera</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
