'use client';

import { useState } from 'react';
import { X, Check, FileText, MapPin, Maximize2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Operation {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    fecha_creacion: string;
    foto_fachada: string;
    foto_contrato?: string;
    foto_contrato_2?: string;
    foto_contrato_3?: string;
    foto_contrato_4?: string;
    foto_contrato_5?: string;
    foto_contrato_6?: string;
    foto_izquierda?: string;
    foto_derecha?: string;
    doc_carta_autorizacion?: string;
    doc_listado_comercial?: string;
    doc_formato_firmas?: string;
    doc_dj_propiedad?: string;
    doc_bonogas?: string;
    latitud?: number;
    longitud?: number;
    estado_fise: string;
}

export default function ValidationModal({ op, onClose, onResolve }: { op: Operation; onClose: () => void; onResolve: (dni: string, approved: boolean, financing: number, rejectionReason?: string) => void }) {
    const [financing, setFinancing] = useState(100);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const COMMON_REASONS = [
        'Foto de contrato ilegible',
        'Falta foto de fachada',
        'Dirección no coincide con DNI',
        'Cliente ya cuenta con gas',
        'Firma no coincide'
    ];

    const handleConfirmReject = () => {
        const finalReason = rejectionReason === 'Otro' ? customReason : rejectionReason;
        if (!finalReason) return alert('Debes especificar un motivo');
        onResolve(op.id_dni, false, financing, finalReason);
    };

    const ImageCard = ({ title, src }: { title: string, src?: string }) => (
        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden group relative h-40">
            {src ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => setSelectedImage(src)}>
                        <Maximize2 className="text-white h-6 w-6" />
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-700">
                    <span className="text-xs">Sin {title}</span>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center">
                <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">{title}</span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
            <div className="bg-slate-900 w-full max-w-6xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]">

                {/* Left: Images Grid */}
                <div className="md:w-3/5 p-6 bg-slate-950/50 overflow-y-auto h-full border-r border-slate-800 custom-scrollbar">
                    <h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2 sticky top-0 bg-slate-950/80 backdrop-blur py-2 z-10">
                        <FileText className="h-4 w-4" /> Evidencias Multimedia
                    </h3>

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Principal</h4>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <ImageCard title="Fachada" src={op.foto_fachada} />
                        <ImageCard title="Lat. Izquierda" src={op.foto_izquierda} />
                        <ImageCard title="Lat. Derecha" src={op.foto_derecha} />
                    </div>

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Contrato (6 Páginas)</h4>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <ImageCard title="Pág 1" src={op.foto_contrato} />
                        <ImageCard title="Pág 2" src={op.foto_contrato_2} />
                        <ImageCard title="Pág 3" src={op.foto_contrato_3} />
                        <ImageCard title="Pág 4" src={op.foto_contrato_4} />
                        <ImageCard title="Pág 5" src={op.foto_contrato_5} />
                        <ImageCard title="Pág 6" src={op.foto_contrato_6} />
                    </div>

                    {(op.doc_carta_autorizacion || op.doc_listado_comercial || op.doc_formato_firmas || op.doc_dj_propiedad || op.doc_bonogas) && (
                        <>
                            <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 mt-4">Documentación Adicional</h4>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {op.doc_carta_autorizacion && <ImageCard title="Carta Autorización" src={op.doc_carta_autorizacion} />}
                                {op.doc_listado_comercial && <ImageCard title="Listado Comercial" src={op.doc_listado_comercial} />}
                                {op.doc_formato_firmas && <ImageCard title="Formato Firmas" src={op.doc_formato_firmas} />}
                                {op.doc_dj_propiedad && <ImageCard title="DJ Propiedad" src={op.doc_dj_propiedad} />}
                                {op.doc_bonogas && <ImageCard title="BonoGas" src={op.doc_bonogas} />}
                            </div>
                        </>
                    )}

                    {/* Map Placeholder */}
                    <div className="mt-6 p-4 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Geolocalización del Vendedor
                        </div>
                        {op.latitud ? (
                            <div className="text-sm text-blue-400">
                                Lat: {op.latitud}, Lng: {op.longitud} <br />
                                <a href={`https://www.google.com/maps?q=${op.latitud},${op.longitud}`} target="_blank" className="underline hover:text-blue-300">Ver en Google Maps</a>
                            </div>
                        ) : <div className="text-sm text-yellow-600">No se capturó GPS</div>}
                    </div>
                </div>

                {/* Right: Info & Actions */}
                <div className="md:w-2/5 flex flex-col h-full bg-slate-900 min-h-0">
                    {/* Header - Fixed */}
                    <div className="p-6 flex justify-between items-start border-b border-slate-800 shrink-0">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{op.cliente_nombre}</h2>
                            <p className="text-slate-400 text-sm">DNI: {op.id_dni}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
                        {isRejecting ? (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-red-500 font-bold mb-4">Motivo del Rechazo</h3>
                                <div className="space-y-2 mb-4">
                                    {COMMON_REASONS.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setRejectionReason(reason)}
                                            className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${rejectionReason === reason ? 'bg-red-500/20 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setRejectionReason('Otro')}
                                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${rejectionReason === 'Otro' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        Otro motivo...
                                    </button>
                                </div>

                                {rejectionReason === 'Otro' && (
                                    <textarea
                                        value={customReason}
                                        onChange={e => setCustomReason(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm h-24 resize-none focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="Escribe el motivo del rechazo..."
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Dirección</label>
                                    <p className="text-white bg-slate-800 p-3 rounded-lg border border-slate-700 mt-1 text-sm">{op.cliente_direccion}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Fecha Captación</label>
                                    <p className="text-white text-sm mt-1">{new Date(op.fecha_creacion).toLocaleString()}</p>
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <label className="text-sm font-semibold text-orange-500 block mb-2">Porcentaje Financiamiento</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[100, 75, 50].map(pct => (
                                            <button
                                                key={pct}
                                                onClick={() => setFinancing(pct)}
                                                className={`py-2 rounded-lg text-sm font-bold border transition-all ${financing === pct ? 'bg-orange-600 text-white border-orange-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions - Fixed */}
                    <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
                        {isRejecting ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRejecting(false)}
                                    className="flex-1 py-3 text-slate-400 hover:text-white font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmReject}
                                    className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-900/20"
                                >
                                    Confirmar Rechazo
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRejecting(true)}
                                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-900/30 text-red-500 border border-red-500/20 rounded-xl font-bold transition-colors"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => onResolve(op.id_dni, true, financing)}
                                    className="flex-[2] py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 flex justify-center items-center gap-2 transition-colors"
                                >
                                    <Check className="h-5 w-5" />
                                    Aprobar Expediente
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] bg-black p-4 flex items-center justify-center" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} alt="Zoom" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white"><X className="h-8 w-8" /></button>
                </div>
            )}
        </div>
    );
}
