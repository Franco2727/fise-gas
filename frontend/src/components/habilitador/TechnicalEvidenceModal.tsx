'use client';

import { X, MapPin, Ruler, ImageIcon } from 'lucide-react';

interface Job {
    cliente_nombre: string;
    cliente_direccion: string;
    foto_gabinete?: string;
    foto_red_interna?: string;
    foto_punto_consumo?: string;
    foto_hermeticidad?: string;
    metraje_tuberia_2025?: number;
    metraje_tuberia_1216?: number;
    observaciones_tecnico?: string;
}

export default function TechnicalEvidenceModal({ job, onClose }: { job: Job; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-500 z-50 bg-black/50 p-2 rounded-full">
                <X className="h-8 w-8" />
            </button>

            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">Evidencia Técnica</h3>
                        <p className="text-slate-400 text-sm">{job.cliente_nombre}</p>
                    </div>
                </div>

                <div className="overflow-y-auto p-6 space-y-6">
                    {/* Measurements Section */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                            <Ruler className="h-5 w-5" /> Medidas Declaradas
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-slate-900 p-3 rounded-lg">
                                <span className="text-slate-500 block">Tubería 2025</span>
                                <span className="text-white font-mono text-lg">{job.metraje_tuberia_2025 || 0} m</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-lg">
                                <span className="text-slate-500 block">Tubería 1216</span>
                                <span className="text-white font-mono text-lg">{job.metraje_tuberia_1216 || 0} m</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-lg col-span-2">
                                <span className="text-slate-500 block">Observaciones</span>
                                <p className="text-white italic">{job.observaciones_tecnico || 'Sin observaciones'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Photos Grid */}
                    <div>
                        <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" /> Registro Fotográfico
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'Gabinete', url: job.foto_gabinete },
                                { title: 'Red Interna', url: job.foto_red_interna },
                                { title: 'Punto Consumo', url: job.foto_punto_consumo },
                                { title: 'Hermeticidad', url: job.foto_hermeticidad }
                            ].map((photo, i) => (
                                photo.url ? (
                                    <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-700 bg-black">
                                        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-bold text-white z-10 backdrop-blur-md">
                                            {photo.title}
                                        </div>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo.url} alt={photo.title} className="w-full h-64 object-cover hover:scale-105 transition-transform duration-500" />
                                    </div>
                                ) : null
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950 text-center">
                    <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg font-bold w-full md:w-auto">
                        Cerrar Revisión
                    </button>
                </div>
            </div>
        </div>
    );
}
