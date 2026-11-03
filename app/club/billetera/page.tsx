'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Wallet,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Users,
  DollarSign,
  ArrowDownLeft,
  ChevronRight
} from 'lucide-react'
import axios from 'axios'

export default function WalletAudit() {
  const [data, setData] = useState<any>({ totalBalance: 0, redeemed: 0, customers: [] })
  const [loading, setLoading] = useState(true)

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'WITH_BALANCE' | 'ZERO_BALANCE'>('ALL')

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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            BILLETERA SPARTAN & MONEDERO DIGITAL
            <Wallet className="w-7 h-7 text-[#FCDD09]" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Flujo 4: Auditoría y canjes de saldo de clientes (alimentado por los Flujos 2 y 3).
          </p>
        </div>

        <button
          onClick={fetchWalletData}
          className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-[#FCDD09] transition-all text-zinc-400 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FCDD09]' : ''}`} />
        </button>
      </div>

      {/* Métricas Globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-950 border border-[#FCDD09]/40">
          <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
            Total en Monederos Circulante
          </span>
          <div className="text-3xl font-black text-[#FCDD09] mt-2">
            ${data.totalBalance.toFixed(2)} USD
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">Saldo listo para canje</span>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10">
          <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
            Total Descontado en Canjes
          </span>
          <div className="text-3xl font-black text-white mt-2">
            ${data.redeemed.toFixed(2)} USD
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">Ahorro real entregado en mostrador</span>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10">
          <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
            Total Clientes Registrados
          </span>
          <div className="text-3xl font-black text-[#FCDD09] mt-2">
            {data.customers.length}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">Con monedero activo en MySQL</span>
        </div>
      </div>

      {/* Directorio de Clientes con Filtros Tácticos */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FCDD09]" />
              Directorio de Billeteras
            </h2>
            <span className="text-xs text-zinc-400">
              Mostrando {filteredCustomers.length} cliente(s) &bull; Subtotal filtrado: <span className="font-bold text-[#FCDD09]">${totalFiltrado.toFixed(2)} USD</span>
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
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FCDD09]"
              />
            </div>

            {/* Filtro por saldo */}
            <select
              value={balanceFilter}
              onChange={(e: any) => setBalanceFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#FCDD09] w-full sm:w-auto"
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
          <div className="divide-y divide-white/10">
            {filteredCustomers.map((c: any) => (
              <div
                key={c.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 px-3 rounded-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-[#FCDD09] border border-[#FCDD09]/30">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">{c.name}</span>
                    <span className="text-xs text-zinc-400 font-mono">+{c.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-lg font-black text-[#FCDD09]">
                      ${c.balance.toFixed(2)} USD
                    </span>
                    <span className="block text-[11px] text-zinc-500">Saldo monedero</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
