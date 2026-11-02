"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    LayoutDashboard,
    Settings,
    LogOut,
    Terminal,
    Upload
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard Bot", href: "/", icon: LayoutDashboard },
    { name: "Cargar Clientes", href: "/cargar-clientes", icon: Upload },
    { name: "Clientes", href: "/clientes", icon: Users },
    { name: "Configuración Bot", href: "/configuracion", icon: Settings },
    { name: "Logs", href: "/logs", icon: Terminal },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        document.cookie = "titanus_session=; path=/; max-age=0; SameSite=Strict";
        router.push("/login");
    };

    return (
        <aside className="flex flex-col h-[calc(100vh-4rem)] w-64 bg-black border-r border-white/10 text-white select-none">
            <div className="px-6 py-4">
                <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500">
                    Navegación Mensajería
                </span>
            </div>

            <nav className="flex-1 px-4 space-y-1.5">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                                isActive
                                    ? "bg-[#FCDD09] text-black shadow-md shadow-[#FCDD09]/15"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive ? "text-black" : "text-[#FCDD09]")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
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
