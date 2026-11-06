"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Wallet,
  Settings,
  LogOut,
  X,
} from "lucide-react";

export const clubNavItems = [
  { name: "Recepción & Caja", href: "/club/dashboard", icon: LayoutDashboard },
  { name: "Podio Coaches", href: "/club/evaluaciones", icon: Trophy },
  { name: "Billetera & Canjes", href: "/club/billetera", icon: Wallet },
  { name: "Configuración QR", href: "/club/configuracion", icon: Settings },
];

interface ClubSidebarProps {
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export default function ClubSidebar({ onCloseMobile, isMobileDrawer = false }: ClubSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    document.cookie = "gym_session=; path=/; max-age=0;";
    document.cookie = "titanus_session=; path=/; max-age=0; SameSite=Strict";
    router.push("/login");
  };

  const asideClasses = isMobileDrawer
    ? "w-full h-full bg-[var(--bg-app,#03080F)] text-white flex flex-col justify-between p-4 select-none"
    : "hidden md:flex w-64 sticky top-16 h-[calc(100vh-4rem)] bg-[var(--bg-app,#03080F)] border-r border-[var(--border-card,rgba(0,245,212,0.15))] text-white flex-col justify-between p-4 select-none shrink-0 transition-colors duration-300";

  return (
    <aside className={asideClasses}>
      <div>
        <div className="flex items-center justify-between px-3 py-2 mb-4">
          <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 font-display">
            Navegación Fidelización
          </span>
          {isMobileDrawer && onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 md:hidden"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="space-y-1.5">
          {clubNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "text-black shadow-lg"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
                style={
                  isActive
                    ? { backgroundColor: "var(--color-primary, #00F5D4)" }
                    : {}
                }
              >
                <Icon
                  className="w-5 h-5 transition-transform duration-200"
                  style={{
                    color: isActive ? "#000000" : "var(--color-primary, #00F5D4)",
                  }}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        {/* Status WhatsApp */}
        <div className="p-3 rounded-xl bg-[var(--bg-card,#05101C)] border border-[var(--border-card,rgba(0,245,212,0.15))] text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400">Canal WhatsApp</span>
            <span
              className="inline-flex items-center gap-1.5 font-bold"
              style={{ color: "var(--color-primary, #00F5D4)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--color-primary, #00F5D4)" }}
              ></span>
              En Línea
            </span>
          </div>
          <span className="text-zinc-500 text-[11px] block">Servicio Activo</span>
        </div>

        {/* Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
