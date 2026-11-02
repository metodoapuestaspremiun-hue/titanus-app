"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ClubSidebar from "@/components/ClubSidebar";
import TopHeaderSwitcher from "@/components/TopHeaderSwitcher";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";
    const isClubModule = pathname?.startsWith("/club");

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header Global Switcher Spartan */}
            <TopHeaderSwitcher />

            <div className="flex flex-1">
                {/* Sidebar Contextual según el software activo */}
                {isClubModule ? <ClubSidebar /> : <Sidebar />}

                {/* Contenido Principal */}
                <main className="flex-1 min-h-[calc(100vh-4rem)] bg-zinc-950/60 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
