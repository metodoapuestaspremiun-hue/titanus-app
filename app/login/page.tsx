"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, User, Brain } from "lucide-react";
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
            const response = await axios.post('/api/auth/login', { username, password });
            const { token } = response.data;

            document.cookie = `titanus_session=${token}; path=/; max-age=86400; SameSite=Strict`;
            router.push("/");
        } catch (err: any) {
            setError(err.response?.data?.error || "ERROR EN LA ARENA. REINTENTA.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-spartan-yellow selection:text-black">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-4 bg-spartan-yellow/10 border border-spartan-yellow/20 rounded-full mb-4 animate-pulse">
                        <Brain size={48} className="text-spartan-yellow" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter text-white">
                        TITANUS <span className="text-spartan-yellow underline decoration-spartan-yellow/30 underline-offset-8">LOGIN</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                        Solo para Guerreros Autorizados
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="bg-spartan-charcoal/30 border border-white/5 p-8 rounded-[40px] space-y-6 backdrop-blur-xl">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4">Gerrero</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nombre de Usuario"
                                    autoComplete="username"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4">Código Secreto</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
                            <ShieldAlert size={20} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full spartan-gradient hover:scale-[1.02] active:scale-95 text-black font-black py-4 rounded-2xl transition-all shadow-[0_20px_40px_rgba(252,221,9,0.15)] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? "VERIFICANDO..." : "ENTRAR A LA ARENA"}
                    </button>

                    <p className="text-center text-[10px] text-gray-700 font-bold uppercase">
                        Titanus Fitness v2.0 © 2025
                    </p>
                </form>
            </div>
        </div>
    );
}
