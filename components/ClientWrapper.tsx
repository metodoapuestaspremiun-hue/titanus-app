"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ClubSidebar from "@/components/ClubSidebar";
import TopHeaderSwitcher from "@/components/TopHeaderSwitcher";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSuperAdmin = pathname?.startsWith("/superadmin");
  const isClubModule = pathname?.startsWith("/club");

  if (isLoginPage || isSuperAdmin) {
    return <>{children}</>;
  }

  // Para el módulo /club, ClubLayout se encarga de envolver con ThemeProvider (SSR)
  // TopHeaderSwitcher y ClubSidebar deben estar DENTRO de ClubLayout para consumir useTheme()
  if (isClubModule) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app,#03080F)] text-white flex flex-col transition-colors duration-300">
      <TopHeaderSwitcher />
      <div className="flex flex-1 relative">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-[var(--bg-app,#03080F)]/90">
          {children}
        </main>
      </div>
    </div>
  );
}
