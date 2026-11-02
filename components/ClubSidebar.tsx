"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Wallet,
  Settings,
  LogOut,
  QrCode
} from "lucide-react";

const clubNavItems = [
  { name: "Recepción & Caja", href: "/club/dashboard", icon: LayoutDashboard },
  { name: "Podio Coaches", href: "/club/evaluaciones", icon: Trophy },
  { name: "Billetera & Canjes", href: "/club/billetera", icon: Wallet },
  { name: "Configuración QR", href: "/club/configuracion", icon: Settings },
];

export default function ClubSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = "titanus_session=; path=/; max-age=0; SameSite=Strict";
    router.push("/login");
  };

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] bg-black border-r border-white/10 text-white flex flex-col justify-between p-4 select-none">
      <div>
        <div className="px-3 py-2 mb-4">
          <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500">
            Navegación Fidelización
          </span>
        </div>

        <nav className="space-y-1.5">
          {clubNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#FCDD09] text-black shadow-md shadow-[#FCDD09]/15"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-black" : "text-[#FCDD09]"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        {/* Status WhatsApp */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400">Canal WhatsApp</span>
            <span className="inline-flex items-center gap-1.5 text-[#FCDD09] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#FCDD09] animate-pulse"></span>
              En Línea
            </span>
          </div>
          <span className="text-zinc-500 text-[11px] block">Instancia Evolution API</span>
        </div>

        {/* Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

