'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Check, FileText, Loader2, ArrowRight, Search } from 'lucide-react';
import ValidationModal from './ValidationModal';

interface Operation {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    fecha_creacion: string;
    foto_fachada: string;
    foto_contrato?: string;
    foto_izquierda?: string;
    foto_derecha?: string;
    latitud?: number;
    longitud?: number;
    estado_fise: string;
    porcentaje_financiamiento?: number;
}

export default function ValidationList() {
    const [operations, setOperations] = useState<Operation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOperations = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('operaciones_maestra')
            .select('*')
            .eq('estado_fise', 'Pendiente')
            .order('fecha_creacion', { ascending: false });

        if (!error && data) {
            setOperations(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOperations();
    }, []);

    const handleResolve = async (id_dni: string, approved: boolean, financing: number, rejectionReason?: string) => {
        setSelectedOp(null); // Close modal
        setOperations(prev => prev.filter(op => op.id_dni !== id_dni)); // Optimistic remove

        const updates: any = {
            estado_fise: approved ? 'Aprobado' : 'Rechazado'
        };
        if (approved) {
            updates.porcentaje_financiamiento = financing;
        }
        if (rejectionReason) {
            updates.motivo_rechazo = rejectionReason;
        }

        const { error } = await supabase
            .from('operaciones_maestra')
            .update(updates)
            .eq('id_dni', id_dni);

        if (error) {
            console.error('Error updating:', error);
            fetchOperations(); // Revert
        }
    };

    const filteredOperations = operations.filter(op =>
        op.id_dni.includes(searchTerm) ||
        op.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <>
            {/* Search Bar */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Buscar validación por DNI o Nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500 outline-none shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20"
                />
            </div>

            {filteredOperations.length === 0 ? (
                <div className="text-center p-12 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">
                        {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'No hay validaciones pendientes.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredOperations.map((op) => (
                        <div key={op.id_dni} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between border border-slate-700 hover:border-slate-500 transition-colors shadow-sm group">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 font-bold text-lg uppercase">
                                    {op.cliente_nombre?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{op.cliente_nombre}</h3>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">DNI: {op.id_dni}</span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span>{new Date(op.fecha_creacion).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedOp(op)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 shadow-lg shadow-blue-900/20"
                            >
                                Revisar
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedOp && (
                <ValidationModal
                    op={selectedOp}
                    onClose={() => setSelectedOp(null)}
                    onResolve={handleResolve}
                />
            )}
        </>
    );
}
