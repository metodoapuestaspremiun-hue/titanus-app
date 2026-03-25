"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    LayoutDashboard,
    Settings,
    LogOut,
    Dumbbell,
    Terminal,
    Upload
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Cargar Clientes", href: "/cargar-clientes", icon: Upload },
    { name: "Clientes", href: "/clientes", icon: Users },
    { name: "Configuración", href: "/configuracion", icon: Settings },
    { name: "Logs", href: "/logs", icon: Terminal },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        // Borrar cookie de sesión
        document.cookie = "titanus_session=; path=/; max-age=0; SameSite=Strict";
        // Redirigir a login
        router.push("/login");
    };

    return (
        <div className="flex flex-col h-screen w-64 bg-spartan-black border-r border-white/10 text-white">
            <Link href="/" className="p-6 flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="bg-spartan-yellow p-2 rounded-lg">
                    <Dumbbell className="text-black h-6 w-6" />
                </div>
                <span className="font-bold text-xl tracking-tight">TITANUS</span>
            </Link>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-spartan-yellow text-black font-semibold shadow-[0_0_15px_rgba(252,221,9,0.3)]"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5",
                                isActive ? "text-black" : "text-gray-400 group-hover:text-spartan-yellow"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500 w-full transition-all"
                >
                    <LogOut className="h-5 w-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
