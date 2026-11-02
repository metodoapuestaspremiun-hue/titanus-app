"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Sparkles, MessageSquare } from "lucide-react";

export default function TopHeaderSwitcher() {
  const pathname = usePathname();
  const isClub = pathname?.startsWith("/club");

  return (
    <header className="h-16 w-full bg-[#0a0a0a] border-b border-white/10 px-6 flex items-center justify-between select-none z-40 sticky top-0">
      {/* Identidad de Marca Spartan */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#FCDD09] flex items-center justify-center shadow-md shadow-[#FCDD09]/10">
          <Dumbbell className="w-5 h-5 text-black" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-lg tracking-wider text-white">TITANUS SYSTEM</span>
          <span className="text-[10px] text-[#FCDD09] font-bold tracking-widest uppercase">
            {isClub ? "Módulo Fidelización & QR (Principal)" : "Módulo Bot Difusión & Cumpleaños"}
          </span>
        </div>
      </div>

      {/* Switcher Táctico de Sistemas */}
      <div className="flex items-center bg-[#141414] p-1 rounded-xl border border-white/10">
        <Link
          href="/club/dashboard"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            isClub
              ? "bg-[#FCDD09] text-black shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Fidelización & QR (Principal)</span>
        </Link>

        <Link
          href="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            !isClub
              ? "bg-[#FCDD09] text-black shadow-md"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Bot Mensajería & Clientes</span>
        </Link>
      </div>
    </header>
  );
}

