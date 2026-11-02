'use client'

import React from 'react'
import { Wallet, Sparkles, TrendingUp } from 'lucide-react'

export default function WalletAudit() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          BILLETERA SPARTAN & CASHBACK
          <Wallet className="w-7 h-7 text-[#FCDD09]" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Flujo 4: Canje de saldo acumulado (Flujos 2 y 3) aplicado con un clic en mostrador.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-zinc-950 border border-[#FCDD09]/40">
          <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
            Total Cashback Acumulado
          </span>
          <div className="text-3xl font-black text-[#FCDD09] mt-2">$ 842.50 USD</div>
          <span className="text-xs text-zinc-500 mt-1 block">Saldo circulante en monederos</span>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10">
          <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
            Canjeados este mes
          </span>
          <div className="text-3xl font-black text-white mt-2">$ 310.00 USD</div>
          <span className="text-xs text-zinc-500 mt-1 block">Descuentos aplicados en mostrador</span>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/10">
          <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
            Retención de Socios
          </span>
          <div className="text-3xl font-black text-[#FCDD09] mt-2">94.2%</div>
          <span className="text-xs text-zinc-500 mt-1 block">+12% vs mes anterior</span>
        </div>
      </div>
    </div>
  )
}
