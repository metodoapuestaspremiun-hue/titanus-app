"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, User, ArrowRight } from "lucide-react";
import axios from "axios";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
            const { token } = response.data;

            if (token) {
                document.cookie = `gym_session=${token}; path=/; max-age=604800; SameSite=Lax`;
                document.cookie = `titanus_session=${token}; path=/; max-age=604800; SameSite=Strict`;
            }
            router.push("/club/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al autenticar. Verifica tus credenciales.");
            setLoading(false);
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
                <form
                    onSubmit={handleLogin}
                    className="bg-[var(--bg-card,#05101C)] border border-[rgba(0,245,212,0.15)] p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl"
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
            </div>
        </div>
    );
}
