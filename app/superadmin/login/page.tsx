"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react'

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/superadmin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciales incorrectas')
      }

      router.push('/superadmin')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app,#03080F)] flex items-center justify-center p-4 selection:bg-[#00F5D4] selection:text-black">
      <div className="w-full max-w-md space-y-8">
        {/* Header ALL-CRM Branding */}
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
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#00F5D4] bg-[#00F5D4]/10 border border-[#00F5D4]/20 px-3 py-1 rounded-full">
            SuperAdmin Suite
          </span>
          <p className="text-zinc-400 font-semibold tracking-wider text-xs uppercase">
            Plataforma Global Multi-Tenant
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[var(--bg-card,#05101C)] border border-[rgba(0,245,212,0.15)] p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl flex items-center gap-3 text-red-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Correo SuperAdmin
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@saas.com"
                  autoComplete="email"
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#00F5D4] focus:ring-1 focus:ring-[#00F5D4] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Contraseña Maestra
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#00F5D4] focus:ring-1 focus:ring-[#00F5D4] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#00F5D4] hover:bg-[#00e5ff] text-black font-extrabold py-3.5 rounded-xl transition-all shadow-[0_10px_25px_rgba(0,245,212,0.2)] uppercase tracking-wider text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-zinc-500 font-mono">
                Credencial por defecto: superadmin@saas.com
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
