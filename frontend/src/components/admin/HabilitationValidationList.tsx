'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, FileText, Loader2, RefreshCw, User, Calendar, MapPin, Eye, Search } from 'lucide-react';

import ConformityUploadModal from './ConformityUploadModal';
import HabilitationReviewModal from './HabilitationReviewModal';

export default function HabilitationValidationList() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal / Lightbox for Acta
    const [selectedActa, setSelectedActa] = useState<string | null>(null);

    // Detailed Review Modal
    const [reviewingOp, setReviewingOp] = useState<any | null>(null);

    // Approval Upload Modal
    const [approvingOp, setApprovingOp] = useState<{ id: string, dni: string } | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('operaciones_maestra')
            .select('*')
            .eq('estado_operativo', 'Por Aprobar Habilitacion')
            .order('fecha_habilitacion', { ascending: false });

        if (error) console.error('Error fetching habilitations:', error);
        else setRequests(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Called from ReviewModal -> Reject
    const handleReject = async (dni: string, reason: string) => {
        setActionLoading(dni);
        setReviewingOp(null); // Close modal
        try {
            const { error } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Instalado',
                    motivo_rechazo: `OBSERVACIÓN ADMIN HABILITACIÓN: ${reason}`
                })
                .eq('id_dni', dni);

            if (error) throw error;
            setRequests(prev => prev.filter(r => r.id_dni !== dni));
        } catch (err: any) {
            alert('Error al observar: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // Called from ReviewModal -> Approve to proceed to Upload
    const handleReviewApprove = (dni: string) => {
        const op = requests.find(r => r.id_dni === dni);
        if (op) {
            setReviewingOp(null); // Close Review
            setApprovingOp({ id: op.uid || op.id_dni, dni }); // Open Upload
        }
    };

    const handleQuickReject = async (id: string, dni: string) => {
        const reason = prompt('Ingrese el motivo del rechazo/observación (esto devolverá el expediente al habilitador):');
        if (!reason) return;

        setActionLoading(id);
        try {
            const { error } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Instalado',
                    motivo_rechazo: `OBSERVACIÓN ADMIN HABILITACIÓN: ${reason}`
                })
                .eq('id_dni', dni);

            if (error) throw error;
            setRequests(prev => prev.filter(r => r.id_dni !== dni));
        } catch (err: any) {
            alert('Error al observar: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUploadSuccess = async (url: string) => {
        if (!approvingOp) return;
        const { id, dni } = approvingOp;

        // Now finalize
        try {
            const { error } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Habilitado',
                    foto_conformidad_inspeccion: url
                })
                .eq('id_dni', dni);

            if (error) throw error;
            setRequests(prev => prev.filter(r => r.id_dni !== dni));
            setApprovingOp(null);
        } catch (err: any) {
            alert('Error finalizando aprobación: ' + err.message);
        }
    };

    const filteredRequests = requests.filter(req =>
        req.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id_dni?.includes(searchTerm)
    );

    if (loading) return <div className="text-slate-400 p-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Cargando solicitudes...</div>;

    return (
        <>
            {/* Search Bar */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar habilitación por DNI o Nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-purple-500 outline-none shadow-sm transition-all focus:ring-2 focus:ring-purple-500/20"
                />
            </div>

            {filteredRequests.length === 0 ? (
                <div className="text-center p-12 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">
                        {searchTerm ? 'No se encontraron resultados.' : 'No hay habilitaciones pendientes de aprobación.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map((req) => (
                        <div key={req.id_dni} className="bg-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between border border-slate-700 hover:border-slate-500 transition-colors shadow-sm gap-4 group">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-300 font-bold text-lg uppercase border border-purple-500/30">
                                    {req.cliente_nombre?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        {req.cliente_nombre}
                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/20">
                                            Habilitación
                                        </span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                        <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">DNI: {req.id_dni}</span>
                                        <span className="hidden sm:inline w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Registrado: {new Date(req.fecha_habilitacion).toLocaleDateString()}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(Date.now() - new Date(req.fecha_habilitacion).getTime()) > 24 * 60 * 60 * 1000
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-slate-700 text-slate-300'
                                            }`}>
                                            ⏱ Espera: {Math.floor((Date.now() - new Date(req.fecha_habilitacion).getTime()) / (1000 * 60 * 60))}h
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                {/* Acta Preview - Compact Button */}
                                {req.foto_acta_habilitacion && (
                                    <button
                                        onClick={() => setSelectedActa(req.foto_acta_habilitacion)}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors border border-slate-600"
                                        title="Ver Acta"
                                    >
                                        <FileText className="h-5 w-5" />
                                    </button>
                                )}

                                <div className="flex gap-2 flex-1 md:flex-none">
                                    <button
                                        onClick={() => handleQuickReject(req.uid || req.id_dni, req.id_dni)}
                                        disabled={actionLoading === (req.uid || req.id_dni)}
                                        className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="h-4 w-4" /> Observar
                                    </button>
                                    <button
                                        onClick={() => setReviewingOp(req)}
                                        disabled={actionLoading === (req.uid || req.id_dni)}
                                        className="flex-1 md:flex-none px-6 py-2 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Revisar y Aprobar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedActa && (
                <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedActa(null)}>
                    <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center">
                        <img src={selectedActa} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg" />
                        <div className="absolute top-0 right-0 p-4">
                            <button className="bg-black/50 text-white p-2 rounded-full hover:bg-white/20 transition-colors">
                                <XCircle className="h-8 w-8" />
                            </button>
                        </div>
                        <p className="text-white mt-4 font-bold">Acta de Habilitación</p>
                    </div>
                </div>
            )}

            {reviewingOp && (
                <HabilitationReviewModal
                    op={reviewingOp}
                    onClose={() => setReviewingOp(null)}
                    onReject={handleReject}
                    onApprove={handleReviewApprove}
                />
            )}

            {approvingOp && (
                <ConformityUploadModal
                    dni={approvingOp.dni}
                    onClose={() => setApprovingOp(null)}
                    onSuccess={handleUploadSuccess}
                />
            )}
        </>
    );
}
