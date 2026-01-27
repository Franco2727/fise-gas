'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function RequestsHistory() {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, [month]); // Refetch when month changes

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [year, monthPart] = month.split('-');
            const startDate = `${month}-01`;

            // Calculate first day of next month
            const nextMonth = new Date(parseInt(year), parseInt(monthPart), 1);
            const endDate = nextMonth.toISOString().slice(0, 10); // YYYY-MM-DD of next month first day

            console.log('Fetching from', startDate, 'to', endDate);

            const { data, error } = await supabase
                .from('operaciones_maestra')
                .select('*')
                .gte('fecha_creacion', startDate)
                .lt('fecha_creacion', endDate) // Strictly less than next month start
                //.neq('estado_fise', 'Incompleto') 
                .order('fecha_creacion', { ascending: false });

            if (error) throw error;
            console.log('Data found:', data?.length);
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    // Client-side search filtering
    const filteredRequests = requests.filter(req =>
        req.id_dni.includes(searchTerm) ||
        req.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (estado: string) => {
        if (estado === 'Pendiente') return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        if (['Aprobado', 'Instalado', 'Habilitado'].includes(estado)) return 'bg-green-500/20 text-green-500 border-green-500/30';
        if (['Rechazado', 'Observado'].includes(estado)) return 'bg-red-500/20 text-red-500 border-red-500/30';
        return 'bg-slate-700 text-slate-400';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">

                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por DNI o Cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-transparent text-white outline-none text-sm"
                    />
                </div>
            </div>

            {/* Loading / Empty States */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Cargando registros...</div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay solicitudes en este mes.'}
                </div>
            ) : (
                /* List */
                <div className="grid gap-4">
                    {filteredRequests.map(req => (
                        <div key={req.id_dni} className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{req.cliente_nombre}</h3>
                                    <div className="text-sm text-slate-400 flex items-center gap-2">
                                        <span className="font-mono bg-slate-800 px-1.5 rounded">{req.id_dni}</span>
                                        <span>• {new Date(req.fecha_creacion).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusColor(req.estado_fise)}`}>
                                    {req.estado_fise}
                                </div>
                            </div>

                            <div className="text-sm text-slate-500 mb-2">
                                {req.cliente_direccion}
                            </div>

                            {/* Rejection Reason */}
                            {req.estado_fise === 'Rechazado' && req.motivo_rechazo && (
                                <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-lg flex items-start gap-3 mt-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                    <div>
                                        <p className="text-red-400 text-sm font-bold">Solicitud Rechazada</p>
                                        <p className="text-slate-300 text-sm">{req.motivo_rechazo}</p>
                                    </div>
                                </div>
                            )}

                            {/* Finance Info if Approved */}
                            {req.estado_fise === 'Aprobado' && (
                                <div className="flex gap-4 mt-3 text-sm">
                                    <div className="bg-blue-900/20 text-blue-300 px-3 py-1 rounded border border-blue-500/20">
                                        Financiamiento: <span className="font-bold text-white">{req.porcentaje_financiamiento}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
