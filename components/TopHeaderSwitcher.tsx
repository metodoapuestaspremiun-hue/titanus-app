"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MessageSquare, Menu, MapPin, ChevronDown, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import ClubSidebar from "@/components/ClubSidebar";
import Sidebar from "@/components/Sidebar";

interface Branch {
  id: string
  name: string
  code: string
  isMain: boolean
  isActive: boolean
  _count?: { staff: number; payments: number }
}

export default function TopHeaderSwitcher() {
  const pathname = usePathname();
  const isClub = pathname?.startsWith("/club");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Branch switcher state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Leer el branding del ThemeProvider (ya resuelto en el servidor — sin flash)
  const theme = useTheme();

  // Cerrar menú móvil automáticamente si cambia de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Fetch branches when in club area
  useEffect(() => {
    if (!isClub) return;
    fetch("/api/club/branches")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setBranches(data.branches ?? []);
      })
      .catch(() => {});
  }, [isClub]);

  // Close branch dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(e.target as Node)
      ) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derivar valores desde el ThemeContext (ya tiene datos del servidor sin delay)
  const isCustom = theme.isCustomBranded;
  const primaryColor = theme.primaryColor ?? "#00F5D4";
  const logoUrl = theme.logoUrl ?? "/branding/all_crm_icon.png";
  const tenantName = theme.tenantName ?? "ALL-CRM";
  const activeBranchName = theme.branchName;
  const activeBranchId = theme.branchId;

  // Logo ALL-CRM: versión cuadrada centrada
  const isAllCrmLogo = !isCustom;

  const hasMultipleBranches = branches.length > 1;

  async function handleBranchSwitch(branchId: string) {
    if (branchId === activeBranchId || switchingBranch) return;
    setSwitchingBranch(true);
    setBranchDropdownOpen(false);
    try {
      const res = await fetch("/api/club/branches/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // silent
    } finally {
      setSwitchingBranch(false);
    }
  }

  return (
    <>
      <header className="h-16 w-full bg-[var(--bg-card,#05101C)] border-b border-[var(--border-card,rgba(0,245,212,0.15))] px-3 sm:px-6 flex items-center justify-between select-none z-40 sticky top-0 transition-colors duration-300">
        {/* Lado izquierdo: Botón hamburguesa móvil + Logo + Identidad del Tenant */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Botón hamburguesa sólo en mobile */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-1 text-zinc-300 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Contenedor del Logo */}
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center border shadow-lg shrink-0"
            style={
              isCustom
                ? {
                    backgroundColor: "#ffffff",
                    borderColor: primaryColor,
                    padding: "2px",
                  }
                : {
                    backgroundColor: "#03080F",
                    borderColor: "rgba(0,245,212,0.4)",
                    padding: "2px",
                  }
            }
          >
            <Image
              src={isAllCrmLogo ? "/branding/all_crm_icon.png" : logoUrl}
              alt={`${tenantName} logo`}
              width={40}
              height={40}
              className="object-contain w-full h-full"
              priority
              unoptimized
            />
          </div>

          <div className="flex flex-col min-w-0 truncate">
            <span className="font-black text-sm sm:text-lg tracking-wider text-white leading-tight font-display truncate">
              {tenantName.toUpperCase()}
            </span>
            <span
              className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase leading-tight truncate"
              style={{ color: primaryColor }}
            >
              {isClub ? "Módulo Fidelización" : "Módulo Bot Difusión & Mensajería"}
            </span>
          </div>

          {/* Branch Switcher — only shown in club area */}
          {isClub && (activeBranchName || branches.length > 0) && (
            <div className="relative ml-1 sm:ml-2 shrink-0" ref={branchDropdownRef}>
              <button
                onClick={() => hasMultipleBranches && setBranchDropdownOpen((o) => !o)}
                disabled={switchingBranch}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all
                  ${hasMultipleBranches
                    ? "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 cursor-pointer text-zinc-200"
                    : "border-white/10 bg-white/5 cursor-default text-zinc-300"
                  }
                `}
                aria-label="Cambiar sucursal"
              >
                {switchingBranch ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
                )}
                <span className="hidden xs:inline sm:inline max-w-[80px] truncate">
                  {activeBranchName ?? "Sucursal"}
                </span>
                {hasMultipleBranches && (
                  <ChevronDown
                    className={`w-3 h-3 text-zinc-400 transition-transform shrink-0 ${branchDropdownOpen ? "rotate-180" : ""}`}
                  />
                )}
              </button>

              {/* Dropdown */}
              {branchDropdownOpen && hasMultipleBranches && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Cambiar sucursal
                    </p>
                  </div>
                  <ul className="py-1">
                    {branches.map((branch) => {
                      const isActive = branch.id === activeBranchId;
                      return (
                        <li key={branch.id}>
                          <button
                            onClick={() => handleBranchSwitch(branch.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors text-xs
                              ${isActive
                                ? "text-white bg-white/8"
                                : "text-zinc-300 hover:text-white hover:bg-white/5"
                              }
                            `}
                          >
                            <MapPin
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: isActive ? primaryColor : undefined }}
                            />
                            <span className="flex-1 font-medium truncate">{branch.name}</span>
                            {branch.isMain && (
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                Principal
                              </span>
                            )}
                            {isActive && (
                              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Switcher Táctico */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md shrink-0">
          <Link
            href="/club/dashboard"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
              isClub
                ? "text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            style={isClub ? { backgroundColor: primaryColor } : {}}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Fidelización</span>
          </Link>

          <Link
            href="/bot-dashboard"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all ${
              !isClub
                ? "text-black shadow-md font-bold"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            style={!isClub ? { backgroundColor: primaryColor } : {}}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Bot & Mensajes</span>
            <span className="sm:hidden text-[11px]">Bot</span>
          </Link>
        </div>
      </header>

      {/* Drawer móvil deslizable */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop con blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel lateral móvil */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {isClub ? (
              <ClubSidebar
                isMobileDrawer
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            ) : (
              <Sidebar
                isMobileDrawer
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
