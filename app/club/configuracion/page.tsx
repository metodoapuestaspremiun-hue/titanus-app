'use client'

import React, { useState } from 'react'
import { Settings, Sliders, RefreshCw, Smartphone, Check } from 'lucide-react'

export default function ClubConfig() {
  const [membershipCashback, setMembershipCashback] = useState(10)
  const [retailCashback, setRetailCashback] = useState(5)
  const [reviewUrl, setReviewUrl] = useState('https://g.page/r/titanus-gym/review')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          CONFIGURACIÓN TÁCTICA & QR
          <Settings className="w-7 h-7 text-[#FCDD09]" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Ajustes de cashback, enlaces de Google Reviews y conexión de WhatsApp Evolution API.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sliders de Comisiones Cashback */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-[#FCDD09]" />
            <h2 className="text-lg font-bold text-white">Comisiones & Monedero</h2>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-300 font-medium">Cashback por Mensualidad</span>
              <span className="font-bold text-[#FCDD09]">{membershipCashback}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={membershipCashback}
              onChange={(e) => setMembershipCashback(Number(e.target.value))}
              className="w-full accent-[#FCDD09] cursor-pointer"
            />
            <span className="text-xs text-zinc-500">
              Se acredita a la billetera tras la aprobación de cuota en caja.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-300 font-medium">Cashback por Barra & Retail</span>
              <span className="font-bold text-[#FCDD09]">{retailCashback}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={retailCashback}
              onChange={(e) => setRetailCashback(Number(e.target.value))}
              className="w-full accent-[#FCDD09] cursor-pointer"
            />
            <span className="text-xs text-zinc-500">
              Se acredita tras la compra de suplementos o bebidas.
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Enlace Directo de Google Reviews (5 Estrellas)
            </label>
            <input
              type="text"
              value={reviewUrl}
              onChange={(e) => setReviewUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FCDD09]"
            />
          </div>
        </div>

        {/* Instancia WhatsApp Evolution */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Smartphone className="w-5 h-5 text-[#FCDD09]" />
              <h2 className="text-lg font-bold text-white">Instancia WhatsApp (Evolution API)</h2>
            </div>

            <div className="my-6 p-6 rounded-xl bg-zinc-900 border border-white/10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#FCDD09]/10 text-[#FCDD09] flex items-center justify-center mb-3 border border-[#FCDD09]/30">
                <Check className="w-8 h-8" />
              </div>
              <span className="text-base font-bold text-white">Instancia Vinculada</span>
              <span className="text-xs text-zinc-400 mt-1">
                Recepción activa para recibir solicitudes de pago y calificaciones QR.
              </span>
            </div>
          </div>

          <button className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 border border-white/10 transition-all">
            <RefreshCw className="w-4 h-4 text-[#FCDD09]" />
            Reiniciar o Re-vincular QR WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
