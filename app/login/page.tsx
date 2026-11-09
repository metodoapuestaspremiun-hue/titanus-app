"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, User, ArrowRight, MapPin, Crown, ArrowLeft, CheckCircle2 } from "lucide-react";
import axios from "axios";

interface BranchOption {
    id: string;
    name: string;
    code: string;
    isMain: boolean;
    address: string | null;
}

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Estado del selector de sede
    const [step, setStep] = useState<"LOGIN" | "SELECT_BRANCH">("LOGIN");
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const [switchingBranch, setSwitchingBranch] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post('/api/auth/login', {
                email: username,
                username,
                password,
            });
            const { token, branches: returnedBranches } = response.data;

            if (token) {
                document.cookie = `gym_session=${token}; path=/; max-age=604800; SameSite=Lax`;
                document.cookie = `titanus_session=${token}; path=/; max-age=604800; SameSite=Strict`;
            }

            // Si el gimnasio tiene más de 1 sucursal, mostrar la pantalla de selección de sede
            if (Array.isArray(returnedBranches) && returnedBranches.length > 1) {
                setBranches(returnedBranches);
                const mainBranch = returnedBranches.find((b: BranchOption) => b.isMain) || returnedBranches[0];
                setSelectedBranchId(mainBranch?.id || "");
                setStep("SELECT_BRANCH");
                setLoading(false);
                return;
            }

            router.push("/club/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al autenticar. Verifica tus credenciales.");
            setLoading(false);
        }
    };

    const handleConfirmBranch = async (branchId: string) => {
        try {
            setSwitchingBranch(true);
            await axios.post('/api/club/branches/switch', { branchId });
            router.push("/club/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al seleccionar sede.");
            setSwitchingBranch(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-app,#03080F)] flex items-center justify-center p-4 selection:bg-[#00F5D4] selection:text-black">
            <div className="w-full max-w-md space-y-8">
                {/* Header Branding Oficial ALL-CRM */}
                <div className="text-center space-y-3 flex flex-col items-center">
                    <div className="h-16 w-auto max-w-[240px] flex items-center justify-center mb-1">
                        <Image
                            src="/branding/logo_main_trimmed.png"
                            alt="ALL-CRM"
                            width={220}
                            height={60}
                            className="object-contain h-14 w-auto"
                            priority
                            unoptimized
                        />
                    </div>
                    <p className="text-zinc-400 font-semibold tracking-wider text-xs uppercase">
                        Plataforma Inteligente de Fidelización & Retención
                    </p>
                </div>

                {/* Formulario */}
                {step === "LOGIN" ? (
                    <form
                        onSubmit={handleLogin}
                        className="bg-[var(--bg-card,#05101C)] border border-[rgba(0,245,212,0.15)] p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl animate-in fade-in"
                    >
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    Email o Usuario del Gimnasio
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="admin@titanusgym.com o Titanus Gym"
                                        autoComplete="username"
                                        className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00F5D4] focus:ring-1 focus:ring-[#00F5D4] transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    Contraseña de Acceso
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        autoComplete="current-password"
                                        className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00F5D4] focus:ring-1 focus:ring-[#00F5D4] transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl flex items-center gap-3 text-red-400 text-xs font-semibold">
                                <ShieldAlert size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#00F5D4] hover:bg-[#00e5ff] text-black font-extrabold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(0,245,212,0.2)] uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                        >
                            <span>{loading ? "VERIFICANDO ACCESO..." : "INGRESAR AL PANEL"}</span>
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>

                        <p className="text-center text-[11px] text-zinc-500 font-medium">
                            ALL-CRM SaaS v2.5 &bull; Acceso para Administradores de Gimnasio
                        </p>
                    </form>
                ) : (
                    /* Paso 2: Selección de Sucursal / Sede */
                    <div className="bg-[var(--bg-card,#05101C)] border border-[rgba(0,245,212,0.15)] p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep("LOGIN");
                                    setError("");
                                }}
                                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Volver</span>
                            </button>
                            <span className="text-[10px] uppercase font-mono font-bold text-[#00F5D4] bg-[#00F5D4]/10 px-2.5 py-1 rounded-full border border-[#00F5D4]/20">
                                Sesión Iniciada
                            </span>
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#00F5D4]" />
                                Selecciona la Sede
                            </h2>
                            <p className="text-xs text-zinc-400">
                                ¿En qué sucursal deseas operar en esta sesión? (Podrás alternarla arriba en cualquier momento).
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl flex items-center gap-3 text-red-400 text-xs font-semibold">
                                <ShieldAlert size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2.5">
                            {branches.map((b) => {
                                const isSelected = selectedBranchId === b.id;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        disabled={switchingBranch}
                                        onClick={() => setSelectedBranchId(b.id)}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? "bg-[#00F5D4]/10 border-[#00F5D4] shadow-lg shadow-[#00F5D4]/10"
                                                : "bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900"
                                        }`}
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-white group-hover:text-[#00F5D4] transition-colors">
                                                    Sede {b.name}
                                                </span>
                                                {b.isMain && (
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                                        <Crown className="w-3 h-3" />
                                                        Matriz
                                                    </span>
                                                )}
                                            </div>
                                            {b.address && (
                                                <p className="text-xs text-zinc-500 line-clamp-1">{b.address}</p>
                                            )}
                                            <span className="text-[10px] font-mono text-zinc-400 block">
                                                Código: {b.code}
                                            </span>
                                        </div>

                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                                                isSelected
                                                    ? "bg-[#00F5D4] border-[#00F5D4] text-black"
                                                    : "border-zinc-700 bg-zinc-800/60 text-transparent"
                                            }`}
                                        >
                                            <CheckCircle2 className="w-4 h-4 fill-current" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            disabled={switchingBranch || !selectedBranchId}
                            onClick={() => handleConfirmBranch(selectedBranchId)}
                            className="w-full bg-[#00F5D4] hover:bg-[#00e5ff] text-black font-extrabold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(0,245,212,0.2)] uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                        >
                            <span>{switchingBranch ? "ACCEDIENDO A LA SEDE..." : "ENTRAR A ESTA SEDE"}</span>
                            {!switchingBranch && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
