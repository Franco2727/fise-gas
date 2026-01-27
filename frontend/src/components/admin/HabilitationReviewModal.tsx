'use client';

import { useState } from 'react';
import { X, Check, FileText, MapPin, Maximize2, AlertTriangle, Printer } from 'lucide-react';

interface Operation {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    fecha_habilitacion: string;
    // Habilitador photos
    foto_acta_habilitacion: string;
    foto_gabinete?: string;
    foto_red_interna?: string;
    foto_punto_consumo?: string;
    foto_hermeticidad?: string;
    // Context
    latitud?: number;
    longitud?: number;
    observaciones_tecnico?: string;
}

interface HabilitationReviewModalProps {
    op: Operation;
    onClose: () => void;
    onReject: (dni: string, reason: string) => void;
    onApprove: (dni: string) => void;
}

export default function HabilitationReviewModal({ op, onClose, onReject, onApprove }: HabilitationReviewModalProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const COMMON_REASONS = [
        'Acta ilegible o incompleta',
        'Faltan fotos de evidencias',
        'Firma del usuario no coincide',
        'Datos del acta no coinciden con sistema',
        'Fecha de habilitación errónea'
    ];

    const handleConfirmReject = () => {
        const finalReason = rejectionReason === 'Otro' ? customReason : rejectionReason;
        if (!finalReason) return alert('Debes especificar un motivo');
        onReject(op.id_dni, finalReason);
    };

    const ImageCard = ({ title, src }: { title: string, src?: string }) => (
        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden group relative h-48">
            {src ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer gap-2"
                        onClick={() => setSelectedImage(src)}>
                        <Maximize2 className="text-white h-6 w-6" />
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-700 flex-col gap-2">
                    <FileText className="h-8 w-8 opacity-20" />
                    <span className="text-xs">Sin {title}</span>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center backdrop-blur-sm">
                <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">{title}</span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-7xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">

                {/* Left: Evidence Grid */}
                <div className="md:w-3/5 p-6 bg-slate-950/50 overflow-y-auto h-full border-r border-slate-800 custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 font-medium flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-500" /> Evidencias de Habilitación
                        </h3>
                    </div>

                    {/* Main Document: Acta */}
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider border-l-2 border-purple-500 pl-3">Documento Principal</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageCard title="Acta de Habilitación" src={op.foto_acta_habilitacion} />
                            {op.foto_hermeticidad && <ImageCard title="Prueba Hermeticidad" src={op.foto_hermeticidad} />}
                        </div>
                    </div>

                    {/* Technical Evidence */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider border-l-2 border-blue-500 pl-3">Evidencias Técnicas</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <ImageCard title="Gabinete" src={op.foto_gabinete} />
                            <ImageCard title="Red Interna" src={op.foto_red_interna} />
                            <ImageCard title="Punto Consumo" src={op.foto_punto_consumo} />
                        </div>
                    </div>

                    {/* Map Info */}
                    <div className="mt-8 p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-800 p-2 rounded-lg">
                                <MapPin className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Ubicación Registrada</p>
                                {op.latitud ? (
                                    <a href={`https://www.google.com/maps?q=${op.latitud},${op.longitud}`} target="_blank" className="text-sm text-blue-400 hover:underline">
                                        Ver en Google Maps
                                    </a>
                                ) : <span className="text-sm text-slate-500">Sin datos GPS</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions & Info */}
                <div className="md:w-2/5 flex flex-col h-full bg-slate-900 min-h-0 relative z-10">
                    <div className="p-6 border-b border-slate-800 bg-slate-900">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-bold text-white">{op.cliente_nombre}</h2>
                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs font-bold rounded border border-purple-500/20">HABILITACIÓN</span>
                                </div>
                                <p className="text-slate-400 text-sm font-mono">DNI: {op.id_dni}</p>
                            </div>
                            <button onClick={onClose} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {isRejecting ? (
                            <div className="animate-in fade-in slide-in-from-right-4 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" /> Motivo de Observación
                                </h3>
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
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm h-32 resize-none focus:ring-2 focus:ring-red-500 outline-none placeholder:text-slate-600"
                                        placeholder="Describa detalladamente el motivo de la observación..."
                                        autoFocus
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección de Suministro</label>
                                    <p className="text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-800">{op.cliente_direccion}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Habilitación</label>
                                        <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                                            <Printer className="h-4 w-4 text-slate-500" />
                                            {new Date(op.fecha_habilitacion).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Técnico/Habilitador</label>
                                        <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                                            <Maximize2 className="h-4 w-4 text-slate-500" />
                                            {/* Assuming we might have technician name later, for now prompt logic kept simple */}
                                            <span>Verificar en Acta</span>
                                        </div>
                                    </div>
                                </div>

                                {op.observaciones_tecnico && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                        <h4 className="text-blue-400 text-xs font-bold uppercase mb-2">Nota del Habilitador</h4>
                                        <p className="text-slate-300 text-sm italic">"{op.observaciones_tecnico}"</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-800 bg-slate-900 space-y-3">
                        {isRejecting ? (
                            <div className="flex gap-3 animate-in slide-in-from-bottom-2">
                                <button
                                    onClick={() => setIsRejecting(false)}
                                    className="flex-1 py-3 text-slate-400 hover:text-white font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmReject}
                                    className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all active:scale-[0.98]"
                                >
                                    Confirmar Observación
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRejecting(true)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl font-bold transition-all"
                                >
                                    Observar
                                </button>
                                <button
                                    onClick={() => onApprove(op.id_dni)}
                                    className="flex-[2] py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <Check className="h-5 w-5" />
                                    Continuar Aprobación
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox for Zoom */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} alt="Zoom" className="max-w-full max-h-[95vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-50 duration-200" />
                    <button className="absolute top-4 right-4 bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
            )}
        </div>
    );
}
