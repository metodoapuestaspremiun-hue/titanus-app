"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Terminal,
  Upload,
  X,
} from "lucide-react";

export const botNavItems = [
  { name: "Dashboard Bot", href: "/bot-dashboard", icon: LayoutDashboard },
  { name: "Cargar Clientes", href: "/cargar-clientes", icon: Upload },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Configuración Bot", href: "/configuracion", icon: Settings },
  { name: "Logs", href: "/logs", icon: Terminal },
];

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export default function Sidebar({ onCloseMobile, isMobileDrawer = false }: SidebarProps) {
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
    ? "w-full h-full bg-black text-white flex flex-col justify-between p-4 select-none"
    : "hidden md:flex flex-col sticky top-16 h-[calc(100vh-4rem)] w-64 bg-black border-r border-white/10 text-white select-none shrink-0";

  return (
    <aside className={asideClasses}>
      <div>
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500">
            Navegación Mensajería
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

        <nav className="px-4 space-y-1.5">
          {botNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#ffe202] text-black font-bold shadow-lg shadow-[#ffe202]/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: isActive ? "#000000" : "#ffe202" }}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
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
