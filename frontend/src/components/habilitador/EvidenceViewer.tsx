'use client';

import { FileImage, X } from 'lucide-react';

export default function EvidenceViewer({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
    if (!imageUrl) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400">
                <X className="h-8 w-8" />
            </button>

            <div className="max-w-3xl w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <FileImage className="h-5 w-5 text-blue-500" />
                        Evidencia de Instalación
                    </h3>
                </div>
                <div className="p-1 bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Evidencia" className="w-full h-auto max-h-[70vh] object-contain" />
                </div>
                <div className="p-4 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
