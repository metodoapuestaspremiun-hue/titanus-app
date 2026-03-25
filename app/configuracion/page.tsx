"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    Brain,
    Save,
    Smartphone,
    CheckCircle,
    XCircle,
    RefreshCw,
    Zap,
    Eye,
    ChevronDown,
    Send,
    LogOut,
    Upload,
    Gift,
    Megaphone,
    Wifi
} from "lucide-react";
import axios from "axios";

// =============================================
// TABS CONFIG
// =============================================
const TABS = [
    { id: "conexion", label: "Conexión", icon: Wifi, description: "WhatsApp & IA" },
    { id: "cumpleanos", label: "Cumpleaños", icon: Gift, description: "Mensajes automáticos" },
    { id: "campana", label: "Campaña", icon: Megaphone, description: "Difusión masiva" },
] as const;

type TabId = typeof TABS[number]["id"];

// =============================================
// MAIN PAGE
// =============================================
export default function ConfigPage() {
    const [configs, setConfigs] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [tempHora, setTempHora] = useState("");
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [scheduledList, setScheduledList] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>("conexion");

    useEffect(() => {
        fetchConfigs();
        checkWhatsAppStatus();
        const interval = setInterval(() => { checkWhatsAppStatus(); }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (configs.envio_hora && !tempHora) setTempHora(configs.envio_hora);
        if (configs.difusiones_programadas_json) {
            try { setScheduledList(JSON.parse(configs.difusiones_programadas_json)); } catch { setScheduledList([]); }
        }
    }, [configs.envio_hora, configs.difusiones_programadas_json]);

    const fetchConfigs = async () => {
        try { const response = await axios.get("/api/config"); setConfigs(response.data); }
        catch (error) { console.error("Error fetching configs:", error); }
        finally { setLoading(false); }
    };

    const checkWhatsAppStatus = async () => {
        try { const response = await axios.get("/api/whatsapp/status"); setWsStatus(response.data.connected ? 'connected' : 'disconnected'); }
        catch { setWsStatus('disconnected'); }
    };

    const saveConfig = async (clave: string, valor: string) => {
        setSaving(true);
        try { await axios.post("/api/config", { clave, valor }); await fetchConfigs(); }
        finally { setSaving(false); }
    };

    const sendTestMessage = async () => {
        if (!testPhone || !testMessage) { setTestResult({ success: false, message: 'Por favor completa todos los campos' }); return; }
        setSendingTest(true); setTestResult(null);
        try {
            await axios.post("/api/whatsapp/test", { phoneNumber: testPhone, message: testMessage });
            setTestResult({ success: true, message: '✅ Mensaje enviado correctamente!' });
            setTimeout(() => { setTestPhone(''); setTestMessage(''); setTestResult(null); }, 3000);
        } catch (error: any) {
            setTestResult({ success: false, message: `❌ Error: ${error.response?.data?.error || 'No se pudo enviar el mensaje'}` });
        } finally { setSendingTest(false); }
    };

    const getQrCode = async () => {
        setLoadingQr(true); setQrCode(null);
        try { await axios.post("/api/whatsapp/qr"); setQrCode(`/api/whatsapp/qr?t=${Date.now()}`); }
        catch { alert('Error al obtener el código QR'); }
        finally { setLoadingQr(false); }
    };

    const disconnectWhatsApp = async () => {
        if (!confirm('¿Estás seguro de que quieres desconectar el WhatsApp? El bot dejará de funcionar.')) return;
        setDisconnecting(true);
        try { await axios.post("/api/whatsapp/logout"); alert('Desconectado correctamente'); checkWhatsAppStatus(); setQrCode(null); }
        catch { alert('Error al desconectar. Intenta de nuevo.'); }
        finally { setDisconnecting(false); }
    };

    const providers = [
        { id: "groq", name: "Groq (Llama 3.3)", icon: "⚡" },
    ];

    if (loading) return <div className="p-8 text-gray-500 animate-pulse">Cargando configuración...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Ajustes del Sistema</h1>
                <p className="text-gray-400 mt-2">Configura la conexión, mensajes y campañas.</p>
            </div>

            {/* ========== PIPELINE STEPPER ========== */}
            <div className="flex items-center gap-0 bg-spartan-charcoal/30 rounded-2xl border border-white/10 p-2">
                {TABS.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-300 relative ${
                                isActive
                                    ? 'bg-spartan-yellow text-black shadow-[0_0_20px_rgba(252,221,9,0.2)]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <div className={`flex items-center justify-center rounded-lg p-1.5 ${isActive ? 'bg-black/10' : ''}`}>
                                <Icon size={18} />
                            </div>
                            <div className="text-left hidden sm:block">
                                <div className={`text-sm font-black uppercase tracking-wider ${isActive ? '' : ''}`}>{tab.label}</div>
                                <div className={`text-[10px] ${isActive ? 'text-black/60' : 'text-gray-600'}`}>{tab.description}</div>
                            </div>
                            {/* Step number */}
                            <span className={`absolute top-1 right-2 text-[9px] font-black ${isActive ? 'text-black/30' : 'text-gray-700'}`}>
                                {idx + 1}/{TABS.length}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ========== TAB CONTENT ========== */}
            <div className="animate-in fade-in duration-300" key={activeTab}>

                {/* ==================== TAB 1: CONEXIÓN ==================== */}
                {activeTab === "conexion" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: IA */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-xl font-bold text-spartan-yellow">
                                <Brain size={24} />
                                <h2>Cerebro IA (Prompts)</h2>
                            </div>

                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-6">
                                <div className="space-y-4">
                                    <label className="text-sm text-gray-400 font-bold uppercase tracking-wider block">Proveedor de IA Activo</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {providers.map((p) => (
                                            <button key={p.id} onClick={() => saveConfig('ai_provider', p.id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${configs.ai_provider === p.id
                                                    ? 'border-spartan-yellow bg-spartan-yellow/10 text-white'
                                                    : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{p.icon}</span>
                                                    <div>
                                                        <div className="font-semibold">{p.name}</div>
                                                        {p.id === 'gemini' && (
                                                            <div className="text-[10px] text-spartan-yellow font-bold uppercase tracking-wider">Universal Adapter Active</div>
                                                        )}
                                                    </div>
                                                </div>
                                                {configs.ai_provider === p.id && <CheckCircle className="text-spartan-yellow h-5 w-5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <KeyInput
                                        label="Groq API Key"
                                        placeholder="gsk_..."
                                        value={configs.groq_api_key || ""}
                                        onSave={(val: string) => saveConfig('groq_api_key', val)}
                                    />
                                    {/* OpenAI and Gemini options removed as per user request */}
                                </div>
                            </div>
                        </div>

                        {/* Right: WhatsApp Status */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-xl font-bold text-spartan-yellow">
                                <Smartphone size={24} />
                                <h2>WhatsApp</h2>
                            </div>

                            {/* Status Card */}
                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${wsStatus === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold">WhatsApp Instance</div>
                                            <div className="text-sm text-gray-500">gym_bot v2.3.7</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${wsStatus === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {wsStatus === 'connected' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                        {wsStatus === 'connected' ? 'Activo' : 'Offline'}
                                    </div>
                                </div>

                                {wsStatus === 'disconnected' && (
                                    <div className="space-y-4">
                                        {!qrCode ? (
                                            <button onClick={getQrCode} disabled={loadingQr}
                                                className="w-full spartan-gradient text-black p-4 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest transition-all hover:scale-105 disabled:opacity-50"
                                            >
                                                <Smartphone size={20} />
                                                {loadingQr ? 'Generando QR...' : 'Conectar WhatsApp'}
                                            </button>
                                        ) : (
                                            <div className="bg-white p-6 rounded-3xl space-y-4 animate-in zoom-in-95 duration-300">
                                                <div className="text-center space-y-2">
                                                    <h4 className="font-bold text-black text-lg">Escanea este código QR</h4>
                                                    <p className="text-sm text-gray-600">Abre WhatsApp en tu teléfono y escanea</p>
                                                </div>
                                                <div className="flex justify-center">
                                                    <img src={qrCode} alt="QR" className="w-64 h-64 border-4 border-spartan-yellow rounded-2xl" />
                                                </div>
                                                <button onClick={() => setQrCode(null)} className="text-xs text-gray-500 hover:text-black underline w-full text-center">Cancelar</button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {wsStatus === 'connected' && (
                                    <div className="space-y-3">
                                        <button onClick={checkWhatsAppStatus}
                                            className="w-full bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5 hover:bg-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <RefreshCw className="h-5 w-5 text-gray-500 group-hover:rotate-180 transition-all duration-500" />
                                                <span className="text-gray-300 font-medium">Actualizar Estado</span>
                                            </div>
                                            <Zap className="h-4 w-4 text-spartan-yellow" />
                                        </button>
                                        <button onClick={disconnectWhatsApp} disabled={disconnecting}
                                            className="w-full bg-red-500/10 p-4 rounded-2xl flex items-center justify-between border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <LogOut className="h-5 w-5 text-red-500" />
                                                <span className="text-red-400 font-medium">Desconectar</span>
                                            </div>
                                            {disconnecting && <span className="text-xs text-red-400">Procesando...</span>}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Test Message Card */}
                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-8 space-y-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Send size={20} className="text-spartan-yellow" />
                                    Prueba de Mensaje
                                </h3>
                                <p className="text-sm text-gray-500">Envía un mensaje de prueba para verificar la conexión.</p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Número de WhatsApp</label>
                                        <input type="text" placeholder="593963410409" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all" disabled={sendingTest}
                                        />
                                        <p className="text-[10px] text-gray-600">Incluye código de país sin el signo +</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Mensaje</label>
                                        <textarea placeholder="Escribe tu mensaje de prueba aquí..." value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all min-h-[100px]" disabled={sendingTest}
                                        />
                                    </div>
                                    {testResult && (
                                        <div className={`p-4 rounded-2xl border ${testResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} animate-in slide-in-from-top-2 duration-300`}>
                                            {testResult.message}
                                        </div>
                                    )}
                                    <button onClick={sendTestMessage} disabled={sendingTest || wsStatus !== 'connected'}
                                        className="w-full spartan-gradient text-black py-3 px-6 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        <Send size={16} />
                                        {sendingTest ? 'Enviando...' : 'Enviar Prueba'}
                                    </button>
                                    {wsStatus !== 'connected' && <p className="text-xs text-red-400 text-center">⚠️ El WhatsApp debe estar conectado para enviar mensajes</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== TAB 2: CUMPLEAÑOS ==================== */}
                {activeTab === "cumpleanos" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Birthday message config */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-xl font-bold text-spartan-yellow">
                                <Gift size={24} />
                                <h2>Mensaje de Cumpleaños</h2>
                            </div>

                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-300">
                                🎂 Cada día, el bot revisará quiénes cumplen años y les enviará automáticamente este mensaje a la hora que configures.
                            </div>

                            <PromptCard
                                title="Plantilla de Cumpleaños"
                                description="Personaliza cómo la IA redactará las felicitaciones."
                                tipo="cumpleanios"
                                promptValue={configs.prompt_cumpleanios || ""}
                                staticValue={configs.prompt_cumpleanios_static || ""}
                                mode={configs.prompt_cumpleanios_mode || 'ai'}
                                variables={["Nombre"]}
                                onSave={saveConfig}
                                onModeChange={(mode: string) => saveConfig('prompt_cumpleanios_mode', mode)}
                                saving={saving}
                                provider='groq'
                                apiKeys={{ 
                                    groq: configs.groq_api_key
                                }}
                            />
                        </div>

                        {/* Right: Schedule */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-xl font-bold text-spartan-yellow">
                                <RefreshCw size={24} />
                                <h2>Horario de Envío</h2>
                            </div>

                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-8 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-spartan-yellow/10 flex items-center justify-center text-spartan-yellow">
                                        <RefreshCw size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Hora de Envío Automático</h3>
                                        <p className="text-xs text-gray-500">El bot despertará a esta hora cada día para enviar cumpleaños.</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="relative group">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-4 mb-2 block">Hora de Envío (Formato 24h)</label>
                                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                                            <div className="relative flex-1">
                                                <input type="time" value={tempHora || configs.envio_hora || "08:00"} onChange={(e) => setTempHora(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-3xl font-black text-white focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all text-center appearance-none"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><RefreshCw size={24} /></div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const hora = tempHora || configs.envio_hora || "08:00";
                                                    if (!hora) return;
                                                    if (confirm(`⚠️ ¿CONFIRMAS EL CAMBIO DE HORA?\n\nNueva hora de cumpleaños: ${hora}\n\nEl bot ajustará su reloj interno automáticamente.`)) {
                                                        saveConfig('envio_hora', hora);
                                                    }
                                                }}
                                                className="spartan-gradient text-black font-black px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tighter"
                                            >
                                                <CheckCircle size={18} />
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-600 text-center font-bold px-4">
                                        ℹ️ Ejemplo: 08:00 para la mañana o 19:00 para la noche. El bot se activará al minuto exacto.
                                    </p>
                                </div>
                            </div>

                            {/* Birthday Image */}
                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-4">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Upload size={18} className="text-spartan-yellow" />
                                    Imagen de Cumpleaños (Opcional)
                                </h3>
                                <p className="text-xs text-gray-500">Se enviará junto al mensaje de cumpleaños.</p>
                                <ImageUploader
                                    currentUrl={configs.imagen_cumple || configs.cumple_imagen || configs.birthday_image || ''}
                                    onUpload={(url: string) => saveConfig('imagen_cumple', url)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== TAB 3: CAMPAÑA ==================== */}
                {activeTab === "campana" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Campaign message */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-xl font-bold text-spartan-yellow">
                                <Megaphone size={24} />
                                <h2>Mensaje de Campaña</h2>
                            </div>

                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 text-sm text-orange-300">
                                📢 Las campañas se envían a <b>todos</b> tus clientes. Puedes enviar al instante o programarlas para una fecha y hora específica.
                            </div>

                            <PromptCard
                                title="Plantilla de Difusión"
                                description="Configura el mensaje que recibirán todos tus usuarios."
                                tipo="publicidad"
                                promptValue={configs.prompt_publicidad || ""}
                                staticValue={configs.prompt_publicidad_static || ""}
                                mode={configs.prompt_publicidad_mode || 'static'}
                                lockMode="static"
                                variables={["Nombre"]}
                                onSave={saveConfig}
                                onModeChange={(mode: string) => saveConfig('prompt_publicidad_mode', mode)}
                                saving={saving}
                                provider='groq'
                                apiKeys={{ 
                                    groq: configs.groq_api_key
                                }}
                            />

                            {/* Campaign Image */}
                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-4">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Upload size={18} className="text-spartan-yellow" />
                                    Imagen de Campaña (Opcional)
                                </h3>
                                <ImageUploader currentUrl={configs.publicidad_imagen} onUpload={(url: string) => saveConfig('publicidad_imagen', url)} />
                            </div>
                        </div>

                        {/* Right: Actions + Limits */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-xl font-bold text-spartan-yellow">
                                <Settings size={24} />
                                <h2>Envío y Programación</h2>
                            </div>

                            {/* Limits Card */}
                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-5">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Zap size={18} className="text-spartan-yellow" />
                                    Límites de Envío
                                </h3>
                                <p className="text-xs text-gray-500">Controla cuántos mensajes se envían para proteger tu cuenta de WhatsApp.</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Máx. por día</label>
                                        <input
                                            type="number"
                                            min="1" max="500"
                                            value={configs.campana_limite_diario || '80'}
                                            onChange={(e) => saveConfig('campana_limite_diario', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-2xl font-black text-white text-center focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50"
                                        />
                                        <p className="text-[9px] text-gray-600 text-center">mensajes/día</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Máx. por hora</label>
                                        <input
                                            type="number"
                                            min="1" max="100"
                                            value={configs.campana_limite_hora || '20'}
                                            onChange={(e) => saveConfig('campana_limite_hora', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-2xl font-black text-white text-center focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50"
                                        />
                                        <p className="text-[9px] text-gray-600 text-center">mensajes/hora</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-600 text-center">
                                    ⚠️ Recomendado: Máx 80/día y 20/hora para evitar bloqueos de WhatsApp.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-5">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Send size={18} className="text-spartan-yellow" />
                                    Acciones
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={async () => {
                                            if (confirm("⚠️ ¿Estás seguro de INICIAR EL ENVÍO AHORA a TODA la base de datos?\n\nEl sistema enviará los mensajes por lotes para proteger tu cuenta.")) {
                                                try {
                                                    const now = new Date();
                                                    const today = now.toISOString().split('T')[0];
                                                    const time = now.toLocaleTimeString('es-EC', { hour12: false, hour: '2-digit', minute: '2-digit' });
                                                    const newItem = { fecha: today, hora: time, estado: 'pendiente', mensaje: configs.prompt_publicidad_static || "", imagen: configs.publicidad_imagen || "" };
                                                    const newList = [...scheduledList, newItem];
                                                    await saveConfig('difusiones_programadas_json', JSON.stringify(newList));
                                                    alert("✅ ¡Envío Iniciado! El bot procesará el primer lote en unos minutos.");
                                                } catch (e: any) { alert(`❌ Error: ${e.message}`); }
                                            }
                                        }}
                                        className="bg-spartan-yellow text-black font-extrabold py-4 rounded-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send size={20} />
                                        ENVIAR AHORA
                                    </button>
                                    <button onClick={() => setShowScheduleModal(true)}
                                        className="bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Settings size={20} />
                                        PROGRAMAR
                                    </button>
                                </div>
                            </div>

                            {/* Scheduled List */}
                            {scheduledList.length > 0 && (
                                <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-4">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Próximas Difusiones Programadas</label>
                                    <div className="space-y-3">
                                        {scheduledList.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-spartan-yellow/10 flex items-center justify-center text-spartan-yellow"><Zap size={16} /></div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white">{item.fecha} — {item.hora}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase font-black">{item.estado}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => { const newList = scheduledList.filter((_, i) => i !== idx); saveConfig('difusiones_programadas_json', JSON.stringify(newList)); }}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                ><XCircle size={18} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ========== SCHEDULE MODAL ========== */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-spartan-charcoal rounded-3xl border border-white/10 p-8 w-full max-w-md shadow-2xl space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white">Programar Difusión</h3>
                            <p className="text-gray-400 text-sm">Elige cuándo quieres que el bot envíe este mensaje a todos los guerreros.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha de Envío</label>
                                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Hora de Envío</label>
                                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={() => setShowScheduleModal(false)} className="flex-1 px-6 py-4 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-all">Cancelar</button>
                            <button
                                onClick={async () => {
                                    if (!scheduleDate || !scheduleTime) { alert("Por favor selecciona fecha y hora."); return; }
                                    const newItem = { fecha: scheduleDate, hora: scheduleTime, estado: 'pendiente', mensaje: configs.prompt_publicidad_static || "", imagen: configs.publicidad_imagen || "" };
                                    const newList = [...scheduledList, newItem];
                                    await saveConfig('difusiones_programadas_json', JSON.stringify(newList));
                                    setShowScheduleModal(false); setScheduleDate(""); setScheduleTime("");
                                }}
                                className="flex-1 px-6 py-4 rounded-xl spartan-gradient text-black font-black hover:scale-105 transition-all"
                            >Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// SUB-COMPONENTS (unchanged logic)
// =============================================
function KeyInput({ label, placeholder, value, onSave }: any) {
    const isConfigured = value === "******** (Configurado)";
    const [localVal, setLocalVal] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => { setLocalVal(value); }, [value]);

    return (
        <div className="space-y-2">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input type={isEditing || !isConfigured ? "text" : "password"} placeholder={placeholder} value={localVal}
                    onFocus={() => { if (isConfigured) { setLocalVal(""); setIsEditing(true); } }}
                    onChange={(e) => setLocalVal(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all font-mono text-sm"
                />
                <button onClick={() => { onSave(localVal); setIsEditing(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-spartan-yellow font-bold text-xs uppercase hover:bg-spartan-yellow/10 px-3 py-1.5 rounded-xl transition-all"
                >{isConfigured && !isEditing ? "Cambiar" : "Listo"}</button>
            </div>
        </div>
    );
}

function ImageUploader({ currentUrl, onUpload }: { currentUrl: string, onUpload: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUpload(response.data.url);
        } catch { alert("Error al subir la imagen"); }
        finally { setUploading(false); }
    };

    return (
        <div className="space-y-4">
            {currentUrl && (
                <div className="relative group w-full max-w-sm rounded-2xl overflow-hidden border border-white/10">
                    <img src={currentUrl} alt="Imagen" className="w-full h-auto" />
                    <button onClick={() => onUpload('')} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110" title="Eliminar imagen">
                        <XCircle size={16} />
                    </button>
                </div>
            )}
            <div className="flex gap-4 items-center">
                <label className="flex-1 cursor-pointer">
                    <div className="bg-white/5 border border-white/10 border-dashed hover:border-spartan-yellow/50 hover:bg-white/10 rounded-2xl p-4 flex items-center justify-center gap-3 transition-all">
                        {uploading ? <RefreshCw className="animate-spin text-spartan-yellow" size={24} /> : <Upload className="text-gray-400" size={24} />}
                        <span className="text-sm font-bold text-gray-300">{uploading ? "Subiendo..." : (currentUrl ? "Cambiar Imagen" : "Subir Imagen")}</span>
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                    </div>
                </label>
            </div>
        </div>
    );
}

const PromptCard = ({ title, description, tipo, promptValue, staticValue, mode, onSave, onModeChange, saving, variables, lockMode, provider, apiKeys, onProviderChange }: any) => {
    const [localPrompt, setLocalPrompt] = useState(promptValue);
    const [localStatic, setLocalStatic] = useState(staticValue);
    const [showPreview, setShowPreview] = useState(false);
    const [previewText, setPreviewText] = useState("");
    const [generating, setGenerating] = useState(false);
    const [editMode, setEditMode] = useState<'prompt' | 'static'>((mode === 'static' || lockMode === 'static') ? 'static' : 'prompt');
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    useEffect(() => { setLocalPrompt(promptValue); setLocalStatic(staticValue); }, [promptValue, staticValue]);
    useEffect(() => {
        setEditMode(mode === 'static' ? 'static' : 'prompt');
    }, [mode, lockMode]);

    const generateText = async () => {
        setGenerating(true); setPreviewText("");
        try {
            const demoVars: any = { "Nombre": "Leonidas", "FechaVencimiento": "mañana", "DíasInactividad": "7" };
            const apiKey = apiKeys[provider];
            console.log("DEBUG FRONTEND AI:", { provider, hasKey: !!apiKey });
            const response = await axios.post('/api/ai/preview', { provider, apiKey, prompt: localPrompt, variables: demoVars });
            setPreviewText(response.data.result);
        } catch (error: any) { 
            console.error("DEBUG FRONTEND AI ERROR:", error.response?.data || error);
            const detail = error.response?.data?.error || error.message || 'Error desconocido';
            setPreviewText(`Error: ${detail}`); 
        }
        finally { setGenerating(false); }
    };

    const handleSave = async (forceStatic?: string) => {
        const key = forceStatic ? `prompt_${tipo}_static` : (editMode === 'prompt' ? `prompt_${tipo}` : `prompt_${tipo}_static`);
        const val = forceStatic || (editMode === 'prompt' ? localPrompt : localStatic);
        setSaveStatus("Guardando...");
        await onSave(key, val);
        setSaveStatus("¡Guardado!");
        setTimeout(() => setSaveStatus(null), 2000);
    };

    return (
        <div className="bg-spartan-charcoal/30 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg group-hover:text-spartan-yellow transition-colors">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[150px]">
                    {variables.map((v: string) => (
                        <span key={v} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 font-mono">{"{{"}{v}{"}}"}</span>
                    ))}
                </div>
            </div>

            {/* Mode Selector */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 self-start">
                <button onClick={() => onModeChange('ai')} disabled={lockMode === 'static'}
                    className={`px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${mode === 'ai' ? 'bg-spartan-yellow text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    Cerebro IA (Groq)
                </button>
                <button onClick={() => onModeChange('static')}
                    className={`px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${mode === 'static' ? 'bg-spartan-yellow text-black' : 'text-gray-500 hover:text-white'}`}
                >
                    Texto Fijo
                </button>
            </div>

            <div className="flex gap-2 mb-2">
                <button onClick={() => setEditMode('prompt')} className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all ${editMode === 'prompt' ? 'border-spartan-yellow text-spartan-yellow bg-spartan-yellow/5' : 'border-white/5 text-gray-500'}`}>⚙️ Instrucciones IA</button>
                <button onClick={() => setEditMode('static')} className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-all ${editMode === 'static' ? 'border-orange-500 text-orange-500 bg-orange-500/5' : 'border-white/5 text-gray-500'}`}>📝 Mensaje Fijo</button>
            </div>

            {editMode === 'prompt' ? (
                <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Prompt / Instrucciones para el Coach</label>
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-spartan-yellow/50 transition-all min-h-[120px]" value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} placeholder="Define la personalidad del Coach..." />
                </div>
            ) : (
                <div className="space-y-2 animate-in slide-in-from-right-2 duration-200">
                    <label className="text-[10px] text-orange-500/70 font-bold uppercase">Mensaje Fijo que se enviará a todos</label>
                    <textarea className="w-full bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 text-sm text-orange-100/90 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all min-h-[120px]" value={localStatic} onChange={(e) => setLocalStatic(e.target.value)} placeholder="Escribe el mensaje exacto..." />
                    <p className="text-[10px] text-orange-500/50 italic">* En este modo el mensaje es fijo (no IA). Se enviará tal cual cambiando {"{{Nombre}}"}.</p>
                </div>
            )}

            {showPreview && (
                <div className="animate-in zoom-in-95 duration-200 space-y-4">
                    <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-spartan-yellow/20">
                        <span className="text-xs text-spartan-yellow font-mono">🤖 Borrador de la IA (Editable)</span>
                        <button onClick={generateText} disabled={generating} className="text-[10px] font-bold uppercase text-gray-400 hover:text-white flex items-center gap-1">
                            <RefreshCw size={12} className={generating ? "animate-spin" : ""} /> Generar de nuevo
                        </button>
                    </div>
                    <textarea className="w-full bg-black/60 p-4 rounded-2xl border border-white/10 text-gray-300 text-sm italic leading-relaxed min-h-[120px] focus:outline-none focus:ring-1 focus:ring-white/20" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder={generating ? "Coach pensando..." : "El mensaje aparecerá aquí..."} />
                    {previewText && !generating && (
                        <button onClick={() => { setLocalStatic(previewText); setEditMode('static'); if (!lockMode) onModeChange('static'); handleSave(previewText); }}
                            className="w-full bg-orange-500/10 text-orange-500 border border-orange-500/30 py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                        ><CheckCircle size={14} /> Fijar este mensaje para todos (Activa Plantilla)</button>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center gap-4">
                <button onClick={() => { if (!showPreview) { setShowPreview(true); if (!previewText) generateText(); } else { setShowPreview(false); } }}
                    className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase transition-all"
                ><Eye size={14} /> {showPreview ? 'Ocultar Borrador' : 'Ver Borrador IA'}</button>
                <div className="flex items-center gap-3">
                    {saveStatus && <span className="text-xs text-spartan-yellow font-bold animate-pulse">{saveStatus}</span>}
                    <button onClick={() => handleSave()} disabled={saving}
                        className={`py-2.5 px-6 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 ${editMode === 'prompt' ? 'spartan-gradient text-black bg-spartan-yellow' : 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'}`}
                    ><Save size={14} /> {saving ? 'Guardando...' : `Guardar ${editMode === 'prompt' ? 'Instrucciones' : 'Plantilla'}`}</button>
                </div>
            </div>
        </div>
    );
}
