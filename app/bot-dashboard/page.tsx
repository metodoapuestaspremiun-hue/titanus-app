"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Calendar,
  AlertCircle,
  TrendingUp,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import axios from "axios";

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>({ items: [], pagination: {} });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("/api/dashboard/stats");
        setStats(res.data);
      } catch (e) {
        console.error("Error stats:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchActivity = async (isBackground = false) => {
      if (!isBackground) setLoadingActivity(true);
      try {
        const res = await axios.get(`/api/dashboard/activity?page=${currentPage}&search=${searchTerm}`);
        setActivityData(res.data);
      } catch (e) {
        console.error("Error activity:", e);
      } finally {
        if (!isBackground) setLoadingActivity(false);
      }
    };

    // Initial fetch (debounced for search)
    const debounce = setTimeout(() => fetchActivity(false), 500);

    // Polling every 5 seconds (background)
    const interval = setInterval(() => fetchActivity(true), 5000);

    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
    };
  }, [currentPage, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Estado Actual</h1>
          <p className="text-gray-400 mt-2">Bienvenido Guerrero. Aquí tienes el resumen de hoy.</p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${(stats && stats.seconds_since_heartbeat < 600)
              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
              : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              }`} />
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Bot System: <span className={(stats && stats.seconds_since_heartbeat < 600) ? 'text-green-400' : 'text-red-400'}>
                {(stats && stats.seconds_since_heartbeat < 600) ? 'En Línea' : 'Desconectado'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Clientes Activos"
          value={loadingStats ? "..." : stats?.total_clientes}
          icon={Users}
          trend="Total en base de datos"
          color="yellow"
        />
        <StatCard
          title="Vencimientos Hoy"
          value={loadingStats ? "..." : stats?.vencimientos_hoy}
          icon={AlertCircle}
          trend="Revisión necesaria"
          color="red"
        />
        <StatCard
          title="Cumpleaños Hoy"
          value={loadingStats ? "..." : stats?.cumpleaños_hoy}
          icon={Calendar}
          trend="Día especial"
          color="blue"
        />
        <StatCard
          title="Mensajes Enviados"
          value={loadingStats ? "..." : stats?.mensajes_enviados}
          icon={MessageSquare}
          trend="Total histórico"
          color="green"
        />
      </div>

      <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-8 border-b border-white/10 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="text-spartan-yellow" />
            Registro de Actividad (Cola de Mensajes)
          </h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar actividad..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-spartan-yellow/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-widest border-b border-white/5 bg-white/5">
                <th className="px-8 py-4 font-semibold">Guerrero</th>
                <th className="px-8 py-4 font-semibold text-center">Tipo</th>
                <th className="px-8 py-4 font-semibold">Mensaje</th>
                <th className="px-8 py-4 font-semibold text-center">Estado</th>
                <th className="px-8 py-4 font-semibold text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingActivity ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6 h-12 bg-white/5"></td>
                  </tr>
                ))
              ) : activityData.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-500 italic text-sm">
                    No se encontró actividad reciente.
                  </td>
                </tr>
              ) : (
                activityData.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-semibold text-white group-hover:text-spartan-yellow transition-colors">{item.nombre}</div>
                      <div className="text-xs text-gray-500">{item.telefono}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded uppercase tracking-tighter text-gray-400">
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-gray-400 truncate max-w-[300px]" title={item.mensaje}>
                        {item.mensaje}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {item.estado === 'enviado' ? (
                        <div className="flex items-center justify-center gap-1 text-green-500">
                          <CheckCircle2 size={14} /> <span className="text-[10px] font-bold uppercase">Enviado</span>
                        </div>
                      ) : item.estado === 'error' ? (
                        <div className="flex items-center justify-center gap-1 text-red-500">
                          <XCircle size={14} /> <span className="text-[10px] font-bold uppercase">Error</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-spartan-yellow">
                          <Clock size={14} /> <span className="text-[10px] font-bold uppercase tracking-tight">Pendiente</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right text-xs text-gray-500">
                      {new Date(item.fecha_creacion.endsWith('Z') ? item.fecha_creacion : item.fecha_creacion + 'Z').toLocaleString('es-EC', { timeZone: 'America/Guayaquil', hour12: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {activityData.pagination.pages > 1 && (
          <div className="p-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Página <span className="text-white">{activityData.pagination.currentPage}</span> de {activityData.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-white/5 border border-white/10 p-2 rounded-xl text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(activityData.pagination.pages, p + 1))}
                disabled={currentPage === activityData.pagination.pages}
                className="bg-white/5 border border-white/10 p-2 rounded-xl text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <div className="bg-spartan-charcoal/50 rounded-3xl border border-white/10 p-6 transition-all hover:bg-white/5 group">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-white/5 p-3 rounded-2xl group-hover:bg-spartan-yellow/10 transition-colors">
          <Icon className="h-6 w-6 text-spartan-yellow" />
        </div>
        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{trend}</span>
      </div>
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold mt-1 tracking-tighter">{value}</p>
    </div>
  );
}
