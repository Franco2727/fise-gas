'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import JobCard from '@/components/technician/JobCard';
import { Wrench, RefreshCw, LogOut, Check, History, ListTodo, Calendar, MapPin, Search, Eye } from 'lucide-react';
import HistoryDetailModal from '@/components/shared/HistoryDetailModal';
import { useAuth } from '@/context/AuthContext';

export default function TechnicianDashboard() {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [jobs, setJobs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);

    // Filters
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');

    const [reviewJob, setReviewJob] = useState<any | null>(null);
    const { signOut } = useAuth();

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const fetchJobs = async () => {
        setLoading(true);

        // Get Current User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch Pending (Logic remains: pending jobs are pool-based or assigned? 
        // If pool based, no filter. If assigned, maybe filter. Assuming pool for now based on current code)
        const { data: pendingData } = await supabase
            .from('operaciones_maestra')
            .select('*')
            .eq('estado_operativo', 'Por instalar')
            .order('fecha_aprobacion', { ascending: true });

        // Fetch History with Filters (YOUR JOBS ONLY)
        let query = supabase
            .from('operaciones_maestra')
            .select('*')
            .eq('estado_operativo', 'Instalado')
            .eq('tecnico_id', user.id) // Filter by logged in technician
            .order('fecha_instalacion', { ascending: false });

        // Date Filter
        if (filterMonth) {
            const startDate = `${filterMonth}-01`;
            const [year, month] = filterMonth.split('-');
            const nextMonth = new Date(parseInt(year), parseInt(month) + 1, 1); // Month is 0-indexed for Date object
            const endDate = nextMonth.toISOString().slice(0, 10);

            query = query.gte('fecha_instalacion', startDate).lt('fecha_instalacion', endDate);
        }

        // Search Filter (DNI or Name)
        if (searchTerm) {
            query = query.or(`cliente_nombre.ilike.%${searchTerm}%,id_dni.ilike.%${searchTerm}%`);
        }

        const { data: historyData } = await query;

        if (pendingData) setJobs(pendingData || []);
        if (historyData) setHistory(historyData || []);

        setLoading(false);
    };

    // Re-fetch when filters change (only if history tab is active)
    useEffect(() => {
        if (activeTab === 'history') {
            fetchJobs();
        }
    }, [filterMonth, searchTerm, activeTab]); // Added activeTab to dependencies to ensure it refetches when switching to history tab with filters already set.

    useEffect(() => {
        fetchJobs();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 p-4 pb-24">
            <header className="flex justify-between items-center mb-6 sticky top-0 bg-slate-950/80 backdrop-blur-md py-4 z-10 border-b border-slate-800">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wrench className="text-blue-500 h-6 w-6" />
                        Agenda Técnica
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-xs text-slate-400 font-medium">
                            {isOnline ? 'Online - Sincronizado' : 'Offline - Guardado Local'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchJobs} className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white">
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => signOut()} className="p-2 bg-red-500/10 rounded-full text-red-500 hover:bg-red-500/20">
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-800">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ListTodo className="h-4 w-4" /> Pendientes
                    {jobs.length > 0 && <span className="ml-2 bg-white text-blue-600 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{jobs.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <History className="h-4 w-4" /> Historial
                </button>
            </div>

            <main>
                {activeTab === 'pending' && (
                    <>
                        {loading && jobs.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">Cargando tareas...</div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="bg-slate-900 inline-block p-4 rounded-full mb-4">
                                    <Check className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="text-slate-400">¡Todo al día! No hay instalaciones pendientes.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {jobs.map(job => (
                                    <JobCard key={job.id_dni} job={job} onComplete={fetchJobs} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        {/* Filters Bar */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 transition-all">

                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por DNI o Cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>

                            {/* Month Filter */}
                            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                                <Calendar className="h-5 w-5 text-slate-400" />
                                <input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="bg-transparent text-white outline-none text-sm"
                                />
                            </div>
                        </div>
                        {history.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                Aún no has completado ninguna instalación.
                            </div>
                        ) : (
                            history.map(job => (
                                <div key={job.id_dni} className="bg-slate-900 border border-slate-800 rounded-xl p-4 opacity-75 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{job.cliente_nombre}</h3>
                                            <div className="text-sm text-slate-400 flex items-center gap-2 mb-2">
                                                <MapPin className="h-3 w-3 text-slate-500" /> {job.cliente_direccion}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md text-[10px] font-bold border border-green-500/20 uppercase tracking-wide">
                                            <Check className="h-3 w-3" /> Instalado
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                            <span className="text-slate-500 block mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Fecha</span>
                                            <span className="text-slate-300 font-mono">
                                                {new Date(job.fecha_instalacion).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                            <span className="text-slate-500 block mb-1">Metros</span>
                                            <span className="text-green-400 font-bold font-mono text-sm">{job.metros_lineales} m</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setReviewJob(job)}
                                        className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700"
                                    >
                                        <Eye className="h-3 w-3" /> Ver Evidencias
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {reviewJob && (
                <HistoryDetailModal
                    job={reviewJob}
                    role="technician"
                    onClose={() => setReviewJob(null)}
                />
            )}
        </div>
    );
}
