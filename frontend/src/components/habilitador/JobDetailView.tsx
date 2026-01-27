'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Calendar, CheckCircle, AlertTriangle, XCircle, Camera, Loader2, Maximize2 } from 'lucide-react';

interface Job {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    cliente_telefono?: string;
    fecha_instalacion: string;
    foto_gabinete?: string;
    foto_red_interna?: string;
    foto_punto_consumo?: string;
    foto_hermeticidad?: string;
    latitud?: number;
    longitud?: number;
    metraje_tuberia_2025?: number;
    metraje_tuberia_1216?: number;
    observaciones_tecnico?: string;
}

export default function JobDetailView({ job, onComplete }: { job: Job; onComplete: () => void }) {
    const [uploading, setUploading] = useState(false);
    const [actaFile, setActaFile] = useState<File | null>(null);
    const [actaPreview, setActaPreview] = useState<string | null>(null);
    const [geoStatus, setGeoStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
    const [geoError, setGeoError] = useState('');

    // Observation Modal State
    const [showObserveModal, setShowObserveModal] = useState(false);
    const [observationReason, setObservationReason] = useState('');

    const evidencePhotos = [
        { title: 'Gabinete', url: job.foto_gabinete },
        { title: 'Red Interna', url: job.foto_red_interna },
        { title: 'Punto Consumo', url: job.foto_punto_consumo },
        { title: 'Hermeticidad', url: job.foto_hermeticidad },
    ].filter(p => p.url);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setActaFile(file);
            setActaPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
            setGeoStatus('idle'); // Reset geo check on new file
        }
    };

    const verifyLocation = () => {
        if (!navigator.geolocation) {
            setGeoError('GPS no soportado');
            setGeoStatus('error');
            return;
        }

        setGeoStatus('checking');
        setGeoError('');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const currentLat = pos.coords.latitude;
                const currentLng = pos.coords.longitude;
                const jobLat = job.latitud || 0;
                const jobLng = job.longitud || 0;

                // Simple validation: If legacy data (0,0), allow. If valid, check distance.
                if (jobLat === 0 && jobLng === 0) {
                    setGeoStatus('verified');
                    return;
                }

                const dist = Math.sqrt(Math.pow(currentLat - jobLat, 2) + Math.pow(currentLng - jobLng, 2));
                // ~50m tolerance (approx 0.0005 degrees)
                if (dist < 0.0005) {
                    setGeoStatus('verified');
                } else {
                    setGeoError('Ubicación incorrecta (>50m del domicilio)');
                    setGeoStatus('error');
                }
            },
            (err) => {
                setGeoError('Error obteniendo GPS');
                setGeoStatus('error');
            },
            { enableHighAccuracy: true }
        );
    };

    const handleFinalize = async () => {
        if (!actaFile || geoStatus !== 'verified') return;
        setUploading(true);

        try {
            // Unify logic later, duplicate for speed now
            const ext = actaFile.name.split('.').pop();
            const fileName = `${job.id_dni}/acta_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage.from('evidencias-fise').upload(fileName, actaFile);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('evidencias-fise').getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Por Aprobar Habilitacion', // Changed from 'Habilitado'
                    fecha_habilitacion: new Date().toISOString(),
                    foto_acta_habilitacion: publicUrl
                })
                .eq('id_dni', job.id_dni);

            if (dbError) throw dbError;

            alert('¡Expediente enviado a aprobación exitosamente!');
            onComplete();

        } catch (error) {
            alert('Error al procesar habilitación');
        } finally {
            setUploading(false);
        }
    };

    const handleObserve = async () => {
        if (!observationReason.trim()) return;
        setUploading(true);
        try {
            const { error } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Por instalar', // Send back to technician
                    // observacion_admin: observationReason // Ideally use a specific field
                    motivo_rechazo: `OBSERVACIÓN HABILITADOR: ${observationReason}`
                })
                .eq('id_dni', job.id_dni);

            if (error) throw error;
            setShowObserveModal(false);
            onComplete();
        } catch (e) {
            alert('Error al observar');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900 flex justify-between items-center shadow-sm z-10">
                <div>
                    <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
                        {job.cliente_nombre}
                        <span className="text-xs font-mono font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">DNI: {job.id_dni}</span>
                    </h1>
                    <div className="flex items-center gap-4 text-slate-400 text-xs">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.cliente_direccion}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Instalado: {new Date(job.fecha_instalacion).toLocaleDateString()}</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowObserveModal(true)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg font-bold text-xs transition-colors flex items-center gap-2"
                >
                    <XCircle className="h-4 w-4" /> Observar
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-700">

                <div className="flex flex-col gap-6">
                    {/* Top Row: Data & Evidence */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Technical Data Card */}
                        <section className="bg-slate-900 p-4 rounded-xl border border-slate-800 h-full">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Maximize2 className="h-3 w-3" /> Datos Técnicos
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-800">
                                    <span className="text-slate-400 text-xs">Tubería 2025</span>
                                    <span className="text-white font-mono font-bold">{job.metraje_tuberia_2025 || 0} m</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-800">
                                    <span className="text-slate-400 text-xs">Tubería 1216</span>
                                    <span className="text-white font-mono font-bold">{job.metraje_tuberia_1216 || 0} m</span>
                                </div>
                                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                                    <span className="block text-slate-400 text-xs mb-1">Observaciones</span>
                                    <p className="text-slate-300 text-xs italic line-clamp-3">{job.observaciones_tecnico || "Ninguna"}</p>
                                </div>
                            </div>
                        </section>

                        {/* Evidence Scroll (Spans 2 cols) */}
                        <section className="lg:col-span-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Camera className="h-3 w-3" /> Evidencia Fotográfica
                            </h3>
                            {evidencePhotos.length === 0 ? (
                                <div className="h-32 border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-500 text-xs">
                                    Sin fotos disponibles
                                </div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
                                    {evidencePhotos.map((photo, i) => (
                                        <div key={i} className="shrink-0 w-40 h-32 relative bg-black rounded-lg overflow-hidden border border-slate-700 group cursor-zoom-in">
                                            <img src={photo.url} alt={photo.title} className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/90 to-transparent">
                                                <span className="text-[10px] font-bold text-white truncate w-full">{photo.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Habilitation Action Area (Unified) */}
                    <section className="bg-gradient-to-br from-slate-900 to-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                        <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <h3 className="font-bold text-white text-sm">Validación y Cierre</h3>
                        </div>

                        <div className="p-5 flex flex-col md:flex-row gap-6 items-stretch">
                            {/* Upload Area */}
                            <div className="flex-1 relative group cursor-pointer border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-slate-800/50 rounded-xl transition-all flex items-center justify-center p-4">
                                <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {actaPreview ? (
                                    <div className="flex items-center gap-3 w-full justify-center">
                                        <div className="h-16 w-16 bg-slate-950 rounded-lg border border-slate-700 p-1">
                                            <img src={actaPreview} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-green-400 font-bold text-sm mb-0.5">Acta Cargada</p>
                                            <p className="text-slate-500 text-xs truncate max-w-[150px]">{actaFile?.name}</p>
                                            <p className="text-blue-400 text-[10px] underline mt-1">Cambiar archivo</p>
                                        </div>
                                    </div>
                                ) : actaFile ? (
                                    // PDF Case
                                    <div className="text-center">
                                        <div className="bg-green-500/20 p-2 rounded-full inline-block mb-2"><CheckCircle className="h-5 w-5 text-green-500" /></div>
                                        <p className="text-white font-bold text-sm truncate max-w-[200px]">{actaFile.name}</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="bg-slate-800 p-2 rounded-full inline-block mb-2 group-hover:scale-110 transition-transform">
                                            <Camera className="h-5 w-5 text-slate-400 group-hover:text-blue-400" />
                                        </div>
                                        <p className="text-slate-300 font-bold text-sm group-hover:text-blue-300">Subir Acta Firmada</p>
                                        <p className="text-slate-500 text-[10px]">Click para examinar o tomar foto</p>
                                    </div>
                                )}
                            </div>

                            {/* Divider with Arrow */}
                            <div className="hidden md:flex flex-col justify-center items-center text-slate-600">
                                <div className="w-[1px] h-full bg-slate-700 mb-2"></div>
                                {/* <span className="bg-slate-900 border border-slate-700 rounded-full p-1 text-[10px]">+</span> */}
                                <div className="w-[1px] h-full bg-slate-700 mt-2"></div>
                            </div>

                            {/* Geo & Finalize */}
                            <div className="flex-1 flex flex-col justify-center gap-3">
                                {geoStatus === 'idle' ? (
                                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-xs">Ubicación GPS no verificada</span>
                                        <button onClick={verifyLocation} className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded-md border border-slate-700 transition-colors font-medium">Validar Ahora</button>
                                    </div>
                                ) : geoStatus === 'checking' ? (
                                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 flex items-center justify-center gap-2 text-blue-400 text-xs">
                                        <Loader2 className="animate-spin h-4 w-4" /> Obteniendo coordenadas...
                                    </div>
                                ) : geoStatus === 'error' ? (
                                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex items-center justify-between text-red-400 text-xs">
                                        <span className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {geoError}</span>
                                        <button onClick={verifyLocation} className="underline hover:text-white">Reintentar</button>
                                    </div>
                                ) : (
                                    <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex items-center justify-center gap-2 text-green-400 text-xs font-bold">
                                        <CheckCircle className="h-4 w-4" /> Ubicación Coincidente
                                    </div>
                                )}

                                <button
                                    onClick={handleFinalize}
                                    disabled={!actaFile || geoStatus !== 'verified' || uploading}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all
                                        ${(!actaFile || geoStatus !== 'verified')
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/40 hover:scale-[1.02]'
                                        }
                                    `}
                                >
                                    {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                    {uploading ? 'Procesando...' : 'Finalizar Proceso'}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Observe Modal */}
            {showObserveModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="text-yellow-500" /> Observar Expediente</h3>
                        <p className="text-slate-400 text-sm mb-4">El expediente será devuelto al técnico para su corrección.</p>

                        <textarea
                            value={observationReason}
                            onChange={e => setObservationReason(e.target.value)}
                            placeholder="Motivo de la observación (ej: Fotos borrosas, medidas incorrectas...)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white h-32 mb-4 focus:border-red-500 outline-none resize-none"
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button onClick={() => setShowObserveModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">Cancelar</button>
                            <button onClick={handleObserve} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-900/20">Confirmar Observación</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
