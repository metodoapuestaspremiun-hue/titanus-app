'use client'

import React from 'react'
import { Trophy, Star, TrendingUp } from 'lucide-react'

export default function CoachesRanking() {
  const topCoaches = [
    {
      id: 1,
      name: 'Marcos Rivas',
      specialty: 'Fuerza & Powerlifting',
      stars: 4.95,
      totalReviews: 86,
      rank: 1,
      badgeColor: 'bg-[#FCDD09] text-black',
    },
    {
      id: 2,
      name: 'Sofía Caicedo',
      specialty: 'Cross Training & Funcional',
      stars: 4.88,
      totalReviews: 74,
      rank: 2,
      badgeColor: 'bg-zinc-300 text-black',
    },
    {
      id: 3,
      name: 'Javier Morales',
      specialty: 'Hipertrofia & Acondicionamiento',
      stars: 4.82,
      totalReviews: 61,
      rank: 3,
      badgeColor: 'bg-zinc-700 text-zinc-100',
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          PODIO DE COACHES & PERFORMANCE
          <Trophy className="w-7 h-7 text-[#FCDD09]" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Flujo 1: Calificaciones de socios mediante escaneo QR. Filtro 5★ enviado a Google Maps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {topCoaches.map((coach) => (
          <div
            key={coach.id}
            className={`p-6 rounded-2xl bg-zinc-950 border ${
              coach.rank === 1
                ? 'border-[#FCDD09] shadow-xl shadow-[#FCDD09]/10'
                : 'border-white/10'
            } flex flex-col justify-between relative`}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={`w-9 h-9 rounded-xl ${coach.badgeColor} flex items-center justify-center font-black text-sm shadow-md`}
              >
                #{coach.rank}
              </span>
              <div className="flex items-center gap-1 text-[#FCDD09] bg-[#FCDD09]/10 px-2.5 py-1 rounded-full border border-[#FCDD09]/30 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-[#FCDD09]" />
                {coach.stars.toFixed(2)}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{coach.name}</h3>
              <p className="text-xs text-[#FCDD09] mb-3">{coach.specialty}</p>

              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-[#FCDD09] h-full rounded-full"
                  style={{ width: `${(coach.stars / 5) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-zinc-500">
                {coach.totalReviews} evaluaciones registradas
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Estado</span>
              <span className="text-[#FCDD09] font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Google 5★ Activo
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
