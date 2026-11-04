'use client'

import React, { useState, useEffect } from 'react'
import {
  Trophy,
  Star,
  TrendingUp,
  RefreshCw,
  Filter,
  MessageSquare,
  Calendar,
  X,
  UserCheck
} from 'lucide-react'
import axios from 'axios'

export default function CoachesRanking() {
  const [coaches, setCoaches] = useState<any[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [selectedCoach, setSelectedCoach] = useState('ALL')
  const [selectedStars, setSelectedStars] = useState('ALL')

  // Modal de Detalle de Coach al hacer clic
  const [activeCoachModal, setActiveCoachModal] = useState<any | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await axios.get(
        `/api/club/evaluaciones/list?coachId=${selectedCoach}&stars=${selectedStars}`
      )
      setCoaches(res.data.coaches || [])
      setEvaluations(res.data.evaluations || [])
    } catch (e) {
      console.error('Error cargando podio y opiniones:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedCoach, selectedStars])

  // Filtrar opiniones específicas para el modal del coach seleccionado
  const coachModalEvaluations = activeCoachModal
    ? evaluations.filter((e) => e.coachId === activeCoachModal.id)
    : []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            PODIO DE COACHES & OPINIONES
            <Trophy className="w-7 h-7 text-[#FCDD09]" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Calificaciones de socios en tiempo real. Haz clic en cualquier entrenador para ver todas sus opiniones.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-[#FCDD09] transition-all text-zinc-400 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FCDD09]' : ''}`} />
        </button>
      </div>

      {/* Podio Top 3 - Clickeable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {coaches.slice(0, 3).map((coach, index) => {
          const rank = index + 1
          const badgeClass =
            rank === 1
              ? 'bg-[#FCDD09] text-black shadow-lg shadow-[#FCDD09]/20'
              : rank === 2
              ? 'bg-zinc-300 text-black'
              : 'bg-zinc-700 text-white'

          return (
            <div
              key={coach.id}
              onClick={() => setActiveCoachModal(coach)}
              className={`p-6 rounded-2xl bg-zinc-950 border ${
                rank === 1
                  ? 'border-[#FCDD09] shadow-xl shadow-[#FCDD09]/10'
                  : 'border-white/10 hover:border-white/30'
              } flex flex-col justify-between relative cursor-pointer hover:scale-[1.02] transition-all group`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`w-9 h-9 rounded-xl ${badgeClass} flex items-center justify-center font-black text-sm`}
                >
                  #{rank}
                </span>
                <div className="flex items-center gap-1 text-[#FCDD09] bg-[#FCDD09]/10 px-2.5 py-1 rounded-full border border-[#FCDD09]/30 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#FCDD09]" />
                  {coach.stars.toFixed(2)}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white group-hover:text-[#FCDD09] transition-colors">
                  {coach.name}
                </h3>
                <p className="text-xs text-[#FCDD09] mb-3">Coach Titular Titanus &bull; Ver opiniones &rarr;</p>

                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-[#FCDD09] h-full rounded-full transition-all duration-500"
                    style={{ width: `${(coach.stars / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-zinc-500">
                  {coach.totalReviews} evaluación(es) acumuladas
                </span>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Reputación</span>
                <span className="text-[#FCDD09] font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Google 5★ Activo
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sección de Filtros y Opiniones de Socios */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FCDD09]" />
            <h2 className="text-lg font-bold text-white">Opiniones & Calificaciones Recibidas</h2>
          </div>

          {/* Filtros dinámicos */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#FCDD09]"
              >
                <option value="ALL">Todos los Coaches</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedStars}
              onChange={(e) => setSelectedStars(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#FCDD09]"
            >
              <option value="ALL">Todas las Estrellas</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Estrellas)</option>
              <option value="4">⭐⭐⭐⭐ (4 Estrellas)</option>
              <option value="3">⭐⭐⭐ (3 Estrellas)</option>
              <option value="2">⭐⭐ (2 Estrellas)</option>
              <option value="1">⭐ (1 Estrella)</option>
            </select>
          </div>
        </div>

        {/* Lista de Opiniones General */}
        {evaluacionesListRender(evaluations)}
      </div>

      {/* Modal Detallado de un Coach */}
      {activeCoachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-[#FCDD09]/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveCoachModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Entrenador */}
            <div className="flex items-center gap-4 pb-6 border-b border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-[#FCDD09] flex items-center justify-center font-black text-2xl text-black shadow-lg shadow-[#FCDD09]/20">
                {activeCoachModal.name.charAt(0)}
              </div>
              <div>
                <span className="text-[11px] uppercase font-bold text-[#FCDD09] tracking-widest block">
                  Perfil de Entrenador
                </span>
                <h3 className="text-2xl font-black text-white">{activeCoachModal.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[#FCDD09] text-sm font-bold">
                    <Star className="w-4 h-4 fill-[#FCDD09]" />
                    {activeCoachModal.stars.toFixed(2)} / 5.00
                  </div>
                  <span className="text-xs text-zinc-500">
                    &bull; {activeCoachModal.totalReviews} reseña(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Lista de opiniones del Coach */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Reseñas de este entrenador ({coachModalEvaluations.length})
              </h4>

              {coachModalEvaluations.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  Este entrenador aún no tiene reseñas registradas con los filtros actuales.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {coachModalEvaluations.map((item) => (
                    <div key={item.id} className="py-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.customerName}</span>
                          <span className="text-xs text-zinc-500 font-mono">+{item.customerPhone}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-[#FCDD09]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < item.stars ? 'fill-[#FCDD09] text-[#FCDD09]' : 'text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {item.comment ? (
                        <p className="text-xs text-zinc-300 bg-zinc-900/80 p-3 rounded-xl border border-white/5">
                          "{item.comment}"
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">
                          {item.stars === 5 ? 'Calificación 5★ (Derivado a Google Reviews).' : 'Sin comentario escrito.'}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleString('es-EC')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-zinc-500">
              <span>TITANUS SYSTEM &bull; Evaluación Docente</span>
              <button
                onClick={() => {
                  setSelectedCoach(activeCoachModal.id)
                  setActiveCoachModal(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-[#FCDD09] border border-[#FCDD09]/30 hover:bg-[#FCDD09] hover:text-black font-bold transition-all"
              >
                Filtrar tabla principal por este Coach
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function evaluacionesListRender(evaluations: any[]) {
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-10 text-zinc-500 text-sm">
        No se encontraron evaluaciones con los filtros seleccionados.
      </div>
    )
  }

  return (
    <div className="divide-y divide-white/10">
      {evaluations.map((item) => (
        <div key={item.id} className="py-4 space-y-2 hover:bg-white/5 px-3 rounded-xl transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm">{item.customerName}</span>
              <span className="text-xs text-zinc-500 font-mono">+{item.customerPhone}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-900 border border-white/10 text-[#FCDD09] font-medium">
                Coach: {item.coachName}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[#FCDD09]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < item.stars ? 'fill-[#FCDD09] text-[#FCDD09]' : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {item.comment ? (
            <p className="text-xs text-zinc-300 bg-zinc-900/80 p-3 rounded-xl border border-white/5">
              "{item.comment}"
            </p>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              {item.stars === 5 ? 'Calificación 5 estrellas (Derivado a Google Reviews).' : 'Sin comentario adicional.'}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <Calendar className="w-3 h-3" />
            {new Date(item.createdAt).toLocaleString('es-EC')}
          </div>
        </div>
      ))}
    </div>
  )
}
