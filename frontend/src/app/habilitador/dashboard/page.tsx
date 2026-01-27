'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardList, LogOut, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import JobDetailView from '@/components/habilitador/JobDetailView';
import HistoryDetailModal from '@/components/shared/HistoryDetailModal';

export default function HabilitadorDashboard() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [reviewJob, setReviewJob] = useState<any | null>(null); // For history details
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    // Filters for History
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [searchTerm, setSearchTerm] = useState('');

    const { signOut } = useAuth();

    const fetchJobs = async () => {
        setLoading(true);

        // Fetch Pending (Instalado)
        const { data: pendingData } = await supabase
            .from('operaciones_maestra')
            .select('*')
            .eq('estado_operativo', 'Instalado')
            .order('fecha_instalacion', { ascending: true });

        // Fetch History (Habilitado OR Por Aprobar) with Filters
        let query = supabase
            .from('operaciones_maestra')
            .select('*')
            .in('estado_operativo', ['Habilitado', 'Por Aprobar Habilitacion']) // Updated to simple IN filter
            .order('fecha_habilitacion', { ascending: false });

        if (filterMonth) {
            const startDate = `${filterMonth}-01`;
            const [year, month] = filterMonth.split('-');
            const nextMonth = new Date(parseInt(year), parseInt(month), 1);
            const endDate = nextMonth.toISOString().slice(0, 10);
            query = query.gte('fecha_habilitacion', startDate).lt('fecha_habilitacion', endDate);
        }

        if (searchTerm) {
            query = query.or(`cliente_nombre.ilike.%${searchTerm}%,id_dni.ilike.%${searchTerm}%`);
        }

        const { data: historyData } = await query;

        if (pendingData) setJobs(pendingData);
        if (historyData) setHistory(historyData);

        setLoading(false);
    };

    useEffect(() => {
        fetchJobs();
    }, [filterMonth, searchTerm]); // Re-fetch history when filters change

    // Allow closing modal
    const closeDetail = () => {
        setSelectedJob(null);
        fetchJobs(); // Refresh data after closing (in case of updates)
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <header className="mb-8 flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList className="text-purple-500 h-6 w-6" />
                        Panel de Habilitación
                    </h1>
                    <p className="text-slate-400 text-sm pl-8">Gestión de Expedientes</p>
                </div>
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg transition-colors font-medium border border-red-500/10"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden md:inline">Cerrar Sesión</span>
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'pending'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    <ClipboardList className="h-5 w-5" />
                    Pendientes
                    {jobs.length > 0 && <span className="ml-2 bg-white text-purple-600 text-xs px-2 py-0.5 rounded-full font-bold">{jobs.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'history'
                        ? 'bg-slate-700 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    <LogOut className="h-5 w-5 rotate-180" /> {/* History icon substitute */}
                    Historial
                </button>
            </div>

            <main>
                {activeTab === 'pending' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {loading ? (
                            <div className="text-center py-12 text-slate-500">Cargando expedientes...</div>
                        ) : jobs.length === 0 ? (
                            <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800 border-dashed">
                                <div className="bg-slate-800 inline-block p-4 rounded-full mb-4">
                                    <ClipboardList className="h-8 w-8 text-slate-500" />
                                </div>
                                <p className="text-slate-400 text-lg">No hay instalaciones pendientes de habilitación.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {jobs.map(job => (
                                    <div key={job.id_dni} className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-purple-500/50 transition-colors shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 font-bold text-lg border border-purple-500/20">
                                                {job.cliente_nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{job.cliente_nombre}</h3>
                                                <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                                    <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-xs">DNI: {job.id_dni}</span>
                                                    <span>•</span>
                                                    <span>Instalado: {new Date(job.fecha_instalacion).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{job.cliente_direccion}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedJob(job)}
                                            className="w-full md:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all transform group-hover:translate-x-1"
                                        >
                                            Revisar Expediente
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        {/* Filters Bar */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                            {/* Search */}
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Buscar por DNI o Cliente..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-4 py-2 text-white focus:border-purple-500 outline-none transition-colors"
                                />
                            </div>
                            {/* Month Filter */}
                            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                                <input
                                    type="month"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="bg-transparent text-white outline-none text-sm"
                                />
                            </div>
                        </div>

                        {history.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">No se encontraron habilitaciones en este periodo.</div>
                        ) : (
                            <div className="grid gap-4">
                                {history.map(job => (
                                    <div key={job.id_dni} className="bg-slate-900 border border-slate-800 p-5 rounded-xl opacity-75 hover:opacity-100 transition-opacity">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <h3 className="font-bold text-white">{job.cliente_nombre}</h3>
                                                <span className="text-xs text-slate-500">
                                                    {job.estado_operativo === 'Habilitado'
                                                        ? `Habilitado el: ${new Date(job.fecha_habilitacion).toLocaleDateString()}`
                                                        : `Enviado el: ${new Date(job.fecha_habilitacion).toLocaleDateString()}`
                                                    }
                                                </span>
                                            </div>
                                            {job.estado_operativo === 'Habilitado' ? (
                                                <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                                                    HABILITADO
                                                </div>
                                            ) : (
                                                <div className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                                    EN APROBACIÓN
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setReviewJob(job)}
                                            className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700"
                                        >
                                            <Eye className="h-3 w-3" /> Ver Acta y Evidencias
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Detail View Modal (Pending) */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-8 animate-in fade-in">
                    <div className="bg-slate-950 w-full max-w-5xl h-full md:h-[90vh] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
                        <button
                            onClick={closeDetail}
                            className="absolute top-4 right-4 z-[60] bg-slate-800/80 text-white p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors border border-slate-700"
                        >
                            <LogOut className="h-5 w-5" /> {/* Close Icon */}
                        </button>

                        <JobDetailView
                            job={selectedJob}
                            onComplete={closeDetail}
                        />
                    </div>
                </div>
            )}

            {/* History Detail Modal */}
            {reviewJob && (
                <HistoryDetailModal
                    job={reviewJob}
                    role="habilitador"
                    onClose={() => setReviewJob(null)}
                />
            )}
        </div>
    );
}
