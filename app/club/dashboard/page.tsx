'use client'

import React, { useState } from 'react'
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
  X
} from 'lucide-react'

export default function ReceptionDashboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const pendingPayments = [
    {
      id: 'pay-1',
      customer: 'Carlos Mendoza',
      phone: '+593 99 123 4567',
      type: 'MEMBERSHIP',
      plan: 'Mes Completo VIP',
      amount: 35.0,
      cashbackEarned: 3.5,
      time: 'Hace 2 min',
    },
    {
      id: 'pay-2',
      customer: 'Andrea Villacís',
      phone: '+593 98 765 4321',
      type: 'RETAIL',
      plan: 'Proteína Whey Isolate + BCAA',
      amount: 45.0,
      cashbackEarned: 2.25,
      time: 'Hace 6 min',
    },
  ]

  const handleOpenDrawer = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDrawerOpen(true)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      {/* Encabezado Spartan */}
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

        {/* Buscador de Socio */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar socio por nombre o celular..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#FCDD09] transition-all"
          />
        </div>
      </div>

      {/* Tarjetas de Acción Rápida estilo Spartan (Negro y Amarillo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Cobro Mensualidad */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-[#FCDD09]/30 relative overflow-hidden group hover:border-[#FCDD09] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#FCDD09]/10 text-[#FCDD09] flex items-center justify-center border border-[#FCDD09]/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#FCDD09]/20 text-[#FCDD09]">
              10% Cashback
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Cobro de Mensualidad</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Proyecta el código QR para que el socio escanee y abone con WhatsApp.
          </p>
          <button className="w-full py-2.5 px-4 rounded-xl bg-[#FCDD09] text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-[#E5C100] transition-all shadow-lg shadow-[#FCDD09]/20">
            <QrCode className="w-4 h-4 text-black" />
            Proyectar QR Cuota
          </button>
        </div>

        {/* Card 2: Tienda & Barra Retail */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 relative overflow-hidden group hover:border-[#FCDD09]/60 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-zinc-300 flex items-center justify-center border border-white/10">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-200">
              5% Cashback
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Tienda & Barra Retail</h3>
          <p className="text-xs text-zinc-400 mb-4">
            Acredita saldo automático por compras de batidos y suplementos.
          </p>
          <button className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all border border-white/10">
            <QrCode className="w-4 h-4 text-[#FCDD09]" />
            Proyectar QR Retail
          </button>
        </div>

        {/* Card 3: Calificar a Coach */}
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
          <button className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all border border-white/10">
            <QrCode className="w-4 h-4 text-[#FCDD09]" />
            Proyectar QR Coach
          </button>
        </div>
      </div>

      {/* Cola de Aprobación en Mostrador */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#FCDD09] animate-pulse"></div>
            <h2 className="text-lg font-bold text-white">Solicitudes Pendientes en Mostrador</h2>
          </div>
          <span className="text-xs text-zinc-500">Actualización en vivo</span>
        </div>

        <div className="divide-y divide-white/10">
          {pendingPayments.map((item) => (
            <div
              key={item.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 px-3 rounded-xl transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-[#FCDD09] border border-[#FCDD09]/30">
                  {item.customer.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{item.customer}</span>
                    <span className="text-xs text-zinc-400">{item.phone}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {item.plan} &bull;{' '}
                    <span className="text-[#FCDD09] font-bold">
                      +{item.cashbackEarned.toFixed(2)} USD Cashback
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-black text-white">
                  ${item.amount.toFixed(2)} USD
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleOpenDrawer({
                        ...item,
                        balance: 14.5,
                        membershipStatus: 'Activa',
                      })
                    }
                    className="p-2 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs flex items-center gap-1 border border-white/10"
                    title="Inspeccionar socio"
                  >
                    Detalle
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button className="px-3.5 py-2 rounded-xl bg-[#FCDD09] text-black text-xs font-black hover:bg-[#E5C100] transition-all flex items-center gap-1.5 shadow-md shadow-[#FCDD09]/20">
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    Aprobar
                  </button>

                  <button className="p-2 rounded-xl bg-zinc-900 text-zinc-400 border border-white/10 text-xs hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer Contextual Zero-Jump */}
      {isDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-md bg-black border-l border-white/10 h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedCustomer.customer}</h3>
                  <p className="text-xs text-[#FCDD09] font-medium">{selectedCustomer.phone}</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Saldo Monedero Digital */}
              <div className="my-6 p-6 rounded-2xl bg-zinc-950 border border-[#FCDD09]/40 text-center">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-widest block mb-1">
                  Saldo en Monedero Digital
                </span>
                <span className="text-4xl font-black text-[#FCDD09] tracking-tight">
                  ${selectedCustomer.balance.toFixed(2)} USD
                </span>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#FCDD09]/20 text-[#FCDD09] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Listo para canje total
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Acción Táctica de Canje
                </h4>
                <button className="w-full py-3 px-4 rounded-xl bg-[#FCDD09] text-black font-black text-sm hover:bg-[#E5C100] transition-all shadow-lg shadow-[#FCDD09]/20">
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
