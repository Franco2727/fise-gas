'use client';

import { X, Download, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface Evidence {
    title: string;
    url?: string;
    type: 'image' | 'pdf';
}

interface HistoryDetailModalProps {
    job: any;
    role: 'technician' | 'habilitador' | 'vendedor';
    onClose: () => void;
}

export default function HistoryDetailModal({ job, role, onClose }: HistoryDetailModalProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const getEvidenceList = (): Evidence[] => {
        const list: Evidence[] = [];

        // Habilitador ONLY sees Habilitacion
        if (role === 'habilitador') {
            if (job.foto_acta_habilitacion) list.push({ title: 'Acta de Habilitación', url: job.foto_acta_habilitacion, type: 'image' });
            // NOTE: Depending on requirement, they might also need to see Tech photos to validate? 
            // User specifically asked "El vendedor no puede ver lo que envio el habilitador o el tecnico, y asi para cada usuario"
            // BUT usually Habilitador validates Tech work. 
            // Assuming strict separation as requested: "cada usuario solo tenga acceso a lo que el envió"
            // Use stricter rule.
        }

        // Vendedor ONLY sees Sales Photos
        if (role === 'vendedor') {
            if (job.foto_fachada) list.push({ title: 'Fachada', url: job.foto_fachada, type: 'image' });
            if (job.foto_contrato) list.push({ title: 'Contrato', url: job.foto_contrato, type: 'image' });
            if (job.foto_izquierda) list.push({ title: 'Lateral Izq.', url: job.foto_izquierda, type: 'image' });
            if (job.foto_derecha) list.push({ title: 'Lateral Der.', url: job.foto_derecha, type: 'image' });
        }

        // Technician ONLY sees Installation Photos
        if (role === 'technician') {
            if (job.foto_gabinete) list.push({ title: 'Foto Gabinete', url: job.foto_gabinete, type: 'image' });
            if (job.foto_red_interna) list.push({ title: 'Foto Red Interna', url: job.foto_red_interna, type: 'image' });
            if (job.foto_punto_consumo) list.push({ title: 'Foto Punto Consumo', url: job.foto_punto_consumo, type: 'image' });
            if (job.foto_hermeticidad) list.push({ title: 'Foto Hermeticidad', url: job.foto_hermeticidad, type: 'image' });
        }

        return list;
    };

    const evidenceList = getEvidenceList();

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed', error);
            window.open(url, '_blank'); // Fallback
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-white max-w-[250px] md:max-w-none truncate">{job.cliente_nombre}</h2>
                        <p className="text-sm text-slate-400">Expediente: {job.id_dni}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
                    {evidenceList.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            No hay documentos disponibles para este registro.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {evidenceList.map((item, idx) => (
                                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group hover:border-blue-500/50 transition-colors shadow-lg">
                                    <div
                                        className="aspect-video bg-black relative cursor-pointer overflow-hidden"
                                        onClick={() => setSelectedImage(item.url!)}
                                    >
                                        <img
                                            src={item.url}
                                            alt={item.title}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                            <ExternalLink className="text-white h-8 w-8 drop-shadow-lg" />
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                                        <p className="text-xs text-slate-500 mb-3 truncate">{item.url?.split('/').pop()}</p>

                                        <button
                                            onClick={() => handleDownload(item.url!, `${job.id_dni}-${item.title}.jpg`)}
                                            className="w-full py-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Download className="h-3 w-3" /> Descargar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 text-center text-xs text-slate-500">
                    Archivos almacenados en Supabase Storage
                </div>
            </div>

            {/* Lightbox Overlay */}
            {selectedImage && (
                <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} className="max-w-full max-h-screen object-contain shadow-2xl" />
                    <button className="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full hover:bg-white/20">
                        <X className="h-8 w-8" />
                    </button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(selectedImage, `evidencia.jpg`);
                            }}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-xl flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" /> Guardar Imagen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
