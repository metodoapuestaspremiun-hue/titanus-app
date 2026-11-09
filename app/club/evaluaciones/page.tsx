'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Trophy,
  Star,
  TrendingUp,
  RefreshCw,
  Filter,
  MessageSquare,
  Calendar,
  X
} from 'lucide-react'
import axios from 'axios'
import { coach_1_jpg, coach_2_jpg, coach_3_jpg } from '@/lib/brandingImages'
import { useTheme } from '@/components/ThemeProvider'

export default function CoachesRanking() {
  const theme = useTheme()
  const [coaches, setCoaches] = useState<any[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [selectedCoach, setSelectedCoach] = useState('ALL')
  const [selectedStars, setSelectedStars] = useState('ALL')

  // Modal de Detalle de Coach al hacer clic
  const [activeCoachModal, setActiveCoachModal] = useState<any | null>(null)
  const [showAllEvaluations, setShowAllEvaluations] = useState(false)

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
            <Trophy className="w-7 h-7" style={{ color: 'var(--accent-gold, #F59E0B)' }} />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Calificaciones de socios en tiempo real en <strong className="text-white">{theme.branchName || 'Sede Principal'}</strong>.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] transition-all text-zinc-400 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw
            className="w-4 h-4"
            style={{ color: loading ? 'var(--color-primary, #00F5D4)' : undefined }}
          />
        </button>
      </div>

      {/* Podio Olímpico - El 1º al centro, 2º izquierda, 3º derecha, resto abajo */}
      {coaches.length > 0 && (
        <div className="space-y-4">
          {/* Top 3: layout olímpico */}
          <div className="grid grid-cols-3 gap-4 pt-2 items-end">
            {/* 2do lugar - izquierda */}
            {coaches[1] ? (
              <div
                onClick={() => setActiveCoachModal(coaches[1])}
                className="rounded-2xl bg-[var(--bg-card,#05101C)] border flex flex-col cursor-pointer hover:scale-[1.02] transition-all group shadow-lg overflow-hidden"
                style={{ borderColor: 'rgba(226,232,240,0.3)' }}
              >
                <div className="relative h-32 w-full overflow-hidden bg-black/40">
                  {coaches[1].avatarUrl ? (
                    <img src={coaches[1].avatarUrl} alt={coaches[1].name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <span className="text-4xl font-black text-zinc-700">{coaches[1].name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/50 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-md bg-[#E2E8F0] text-black">#2</span>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold backdrop-blur-md" style={{ color: 'var(--accent-gold,#F59E0B)', backgroundColor: 'color-mix(in srgb, var(--accent-gold,#F59E0B) 20%, black)', borderColor: 'color-mix(in srgb, var(--accent-gold,#F59E0B) 40%, transparent)' }}>
                    <Star className="w-3 h-3" style={{ fill: 'var(--accent-gold,#F59E0B)' }} />
                    {coaches[1].stars.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 pt-0">
                  <h3 className="text-sm font-black text-white truncate">{coaches[1].name}</h3>
                  <p className="text-[11px] text-zinc-500">{coaches[1].totalReviews} reseña(s)</p>
                </div>
              </div>
            ) : <div />}

            {/* 1er lugar - centro (más grande) */}
            {coaches[0] && (
              <div
                onClick={() => setActiveCoachModal(coaches[0])}
                className="rounded-2xl bg-[var(--bg-card,#05101C)] border flex flex-col cursor-pointer hover:scale-[1.02] transition-all group shadow-2xl overflow-hidden"
                style={{ borderColor: 'var(--accent-gold,#F59E0B)', boxShadow: '0 10px 30px -5px color-mix(in srgb, var(--accent-gold,#F59E0B) 30%, transparent)' }}
              >
                <div className="relative h-48 w-full overflow-hidden bg-black/40">
                  {coaches[0].avatarUrl ? (
                    <img src={coaches[0].avatarUrl} alt={coaches[0].name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <span className="text-6xl font-black text-zinc-700">{coaches[0].name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/50 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-lg" style={{ backgroundColor: 'var(--accent-gold,#F59E0B)', color: '#000' }}>🏆</span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold backdrop-blur-md" style={{ color: 'var(--accent-gold,#F59E0B)', backgroundColor: 'color-mix(in srgb, var(--accent-gold,#F59E0B) 20%, black)', borderColor: 'color-mix(in srgb, var(--accent-gold,#F59E0B) 40%, transparent)' }}>
                    <Star className="w-3.5 h-3.5" style={{ fill: 'var(--accent-gold,#F59E0B)' }} />
                    {coaches[0].stars.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest block" style={{ color: 'var(--accent-gold,#F59E0B)' }}>Mejor Entrenador</span>
                  <h3 className="text-lg font-black text-white truncate">{coaches[0].name}</h3>
                  <p className="text-xs text-zinc-400">{coaches[0].totalReviews} reseña(s) · #{1} del Ranking</p>
                  <div className="mt-2 w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(coaches[0].stars / 5) * 100}%`, backgroundColor: 'var(--accent-gold,#F59E0B)' }} />
                  </div>
                </div>
              </div>
            )}

            {/* 3er lugar - derecha */}
            {coaches[2] ? (
              <div
                onClick={() => setActiveCoachModal(coaches[2])}
                className="rounded-2xl bg-[var(--bg-card,#05101C)] border flex flex-col cursor-pointer hover:scale-[1.02] transition-all group shadow-lg overflow-hidden"
                style={{ borderColor: 'rgba(100,116,139,0.4)' }}
              >
                <div className="relative h-32 w-full overflow-hidden bg-black/40">
                  {coaches[2].avatarUrl ? (
                    <img src={coaches[2].avatarUrl} alt={coaches[2].name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <span className="text-4xl font-black text-zinc-700">{coaches[2].name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card,#05101C)] via-[var(--bg-card,#05101C)]/50 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-md bg-[#64748B] text-white">#3</span>
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold backdrop-blur-md" style={{ color: 'var(--accent-gold,#F59E0B)', backgroundColor: 'color-mix(in srgb, var(--accent-gold,#F59E0B) 20%, black)', borderColor: 'color-mix(in srgb, var(--accent-gold,#F59E0B) 40%, transparent)' }}>
                    <Star className="w-3 h-3" style={{ fill: 'var(--accent-gold,#F59E0B)' }} />
                    {coaches[2].stars.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 pt-0">
                  <h3 className="text-sm font-black text-white truncate">{coaches[2].name}</h3>
                  <p className="text-[11px] text-zinc-500">{coaches[2].totalReviews} reseña(s)</p>
                </div>
              </div>
            ) : <div />}
          </div>

          {/* Resto de entrenadores (4+) en cuadrícula táctica */}
          {coaches.length > 3 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {coaches.slice(3).map((coach, idx) => (
                <div
                  key={coach.id}
                  onClick={() => setActiveCoachModal(coach)}
                  className="rounded-xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center">
                    {coach.avatarUrl ? (
                      <img src={coach.avatarUrl} alt={coach.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-zinc-500">{coach.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-500">#{idx + 4}</span>
                    <p className="text-xs font-bold text-white truncate group-hover:text-[var(--color-primary,#00F5D4)] transition-colors">{coach.name}</p>
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--accent-gold,#F59E0B)' }}>
                      <Star className="w-2.5 h-2.5" style={{ fill: 'var(--accent-gold,#F59E0B)' }} />
                      {coach.stars.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sección de Filtros y Opiniones de Socios */}
      <div className="bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{ color: 'var(--color-primary, #00F5D4)' }} />
            <h2 className="text-lg font-bold text-white">Opiniones & Calificaciones Recibidas</h2>
          </div>

          {/* Filtros dinámicos */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
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
              className="bg-zinc-900 border border-white/10 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
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
        {evaluations.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">
            No se encontraron evaluaciones con los filtros seleccionados.
          </div>
        ) : (
          <div className="space-y-0">
            <div className="divide-y divide-white/10">
              {(showAllEvaluations ? evaluations : evaluations.slice(0, 5)).map((item) => (
                <div key={item.id} className="py-4 space-y-2 hover:bg-white/5 px-3 rounded-xl transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-sm">{item.customerName}</span>
                      <span className="text-xs text-zinc-500 font-mono">+{item.customerPhone}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-md border font-medium"
                        style={{
                          color: 'var(--color-primary, #00F5D4)',
                          borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 20%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)'
                        }}
                      >
                        Coach: {item.coachName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: 'var(--accent-gold, #F59E0B)' }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5"
                          style={{
                            fill: i < item.stars ? 'var(--accent-gold, #F59E0B)' : 'none',
                            color: i < item.stars ? 'var(--accent-gold, #F59E0B)' : '#3F3F46'
                          }}
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

            {evaluations.length > 5 && (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setShowAllEvaluations(!showAllEvaluations)}
                  className="px-6 py-2.5 rounded-xl border text-sm font-bold transition-all hover:bg-white/5"
                  style={{
                    color: 'var(--color-primary, #00F5D4)',
                    borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                  }}
                >
                  {showAllEvaluations
                    ? '▲ Ver menos opiniones'
                    : `▼ Ver más opiniones (${evaluations.length - 5} más)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Detallado de un Coach */}
      {activeCoachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div
            className="bg-[var(--bg-card,#05101C)] border rounded-3xl p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] flex flex-col"
            style={{ borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 40%, transparent)' }}
          >
            <button
              onClick={() => setActiveCoachModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabecera del Entrenador */}
            <div className="flex items-center gap-4 pb-6 border-b border-white/10">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-black shadow-lg"
                style={{ backgroundColor: 'var(--color-primary, #00F5D4)' }}
              >
                {activeCoachModal.name.charAt(0)}
              </div>
              <div>
                <span
                  className="text-[11px] uppercase font-bold tracking-widest block"
                  style={{ color: 'var(--color-primary, #00F5D4)' }}
                >
                  Perfil de Entrenador
                </span>
                <h3 className="text-2xl font-black text-white">{activeCoachModal.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--accent-gold, #F59E0B)' }}>
                    <Star className="w-4 h-4" style={{ fill: 'var(--accent-gold, #F59E0B)' }} />
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
                        <div className="flex items-center gap-0.5" style={{ color: 'var(--accent-gold, #F59E0B)' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="w-3.5 h-3.5"
                              style={{
                                fill: i < item.stars ? 'var(--accent-gold, #F59E0B)' : 'none',
                                color: i < item.stars ? 'var(--accent-gold, #F59E0B)' : '#3F3F46'
                              }}
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
              <span>Evaluación Docente</span>
              <button
                onClick={() => {
                  setSelectedCoach(activeCoachModal.id)
                  setActiveCoachModal(null)
                }}
                className="px-3 py-1.5 rounded-lg border font-bold transition-all"
                style={{
                  color: 'var(--color-primary, #00F5D4)',
                  borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 30%, transparent)'
                }}
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
              <span
                className="text-xs px-2 py-0.5 rounded-md border font-medium"
                style={{
                  color: 'var(--color-primary, #00F5D4)',
                  borderColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 20%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #00F5D4) 10%, transparent)'
                }}
              >
                Coach: {item.coachName}
              </span>
            </div>

            <div className="flex items-center gap-1" style={{ color: 'var(--accent-gold, #F59E0B)' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5"
                  style={{
                    fill: i < item.stars ? 'var(--accent-gold, #F59E0B)' : 'none',
                    color: i < item.stars ? 'var(--accent-gold, #F59E0B)' : '#3F3F46'
                  }}
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
