'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Loader2, Eye, MapPin, AlertTriangle, Camera, FileText } from 'lucide-react';
import TechnicalEvidenceModal from './TechnicalEvidenceModal';

interface Job {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    fecha_instalacion: string;
    latitud?: number;
    longitud?: number;
    // Evidencia Técnica
    foto_gabinete?: string;
    foto_red_interna?: string;
    foto_punto_consumo?: string;
    foto_hermeticidad?: string;
    metraje_tuberia_2025?: number;
    metraje_tuberia_1216?: number;
    observaciones_tecnico?: string;
}

export default function HabilitationCard({ job, onComplete }: { job: Job; onComplete: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showEvidence, setShowEvidence] = useState(false);
    const [locationVerified, setLocationVerified] = useState(false);
    const [checkingLoc, setCheckingLoc] = useState(false);
    const [locError, setLocError] = useState('');

    // Calculate time elapsed
    const installDate = new Date(job.fecha_instalacion);
    const now = new Date();
    const diffMs = now.getTime() - installDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // Priority Check: > 48 hours
    const isPriority = diffHours > 48;

    const timeElapsedString = diffDays > 0
        ? `${diffDays} días y ${diffHours % 24} horas`
        : `${diffHours} horas`;

    // Technical Check: Ensure at least some technical evidence exists
    const hasTechnicalEvidence = !!(job.foto_gabinete || job.foto_red_interna || job.foto_punto_consumo);

    const checkLocation = () => {
        if (!navigator.geolocation) {
            setLocError('GPS no soportado');
            // If no GPS support, maybe allow manual override or just warn?
            // For strict requirement, we block.
            return;
        }
        setCheckingLoc(true);
        setLocError('');

        navigator.geolocation.getCurrentPosition((pos) => {
            const currentLat = pos.coords.latitude;
            const currentLng = pos.coords.longitude;

            const jobLat = job.latitud || 0;
            const jobLng = job.longitud || 0;

            if (jobLat === 0 && jobLng === 0) {
                // If no job coords, we allow with warning (legacy data)
                setLocationVerified(true);
            } else {
                // Simple Euclidean distance approx
                const dist = Math.sqrt(Math.pow(currentLat - jobLat, 2) + Math.pow(currentLng - jobLng, 2));
                // 0.003 degrees is roughly 300m tolerance
                if (dist < 0.003) {
                    setLocationVerified(true);
                } else {
                    setLocError('Estás demasiado lejos del domicilio del cliente (Geocerca).');
                    setLocationVerified(false);
                }
            }
            setCheckingLoc(false);
        }, (err) => {
            setLocError('Para habilitar, debes permitir el acceso al GPS.');
            console.error(err);
            setCheckingLoc(false);
        }, { enableHighAccuracy: true });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            // Format Validation
            if (!selected.type.includes('image') && !selected.type.includes('pdf')) {
                alert('Solo se permiten imágenes (JPG/PNG) o PDF.');
                return;
            }
            setFile(selected);
            if (selected.type.includes('image')) {
                setPreview(URL.createObjectURL(selected));
            } else {
                setPreview(null);
            }

            // Trigger GPS check
            checkLocation();
        }
    };

    const handleSubmit = async () => {
        if (!file || !locationVerified) return;
        setUploading(true);

        try {
            const ext = file.name.split('.').pop();
            const fileName = `${job.id_dni}/acta_habilitacion_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('evidencias-fise').upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('evidencias-fise').getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Por Aprobar Habilitacion',
                    fecha_habilitacion: new Date().toISOString(),
                    foto_acta_habilitacion: publicUrl
                })
                .eq('id_dni', job.id_dni);

            if (dbError) throw dbError;

            onComplete();
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar acta. Intente nuevamente.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className={`bg-slate-800 rounded-xl p-6 border shadow-md mb-4 transition-all relative overflow-hidden ${isPriority ? 'border-red-500/50 shadow-red-900/20 animate-critical' : 'border-slate-700'}`}>

                {isPriority && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg shadow-lg">
                        ¡Prioridad +48h!
                    </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-purple-900/50 p-3 rounded-lg text-purple-400">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{job.cliente_nombre}</h3>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> {job.cliente_direccion}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Instalado: {new Date(job.fecha_instalacion).toLocaleString()}</p>
                        <div className={`text-xs font-bold mt-1 px-2 py-1 rounded w-fit ${isPriority ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                            ⏱ Tiempo en espera: {timeElapsedString}
                        </div>
                    </div>
                </div>

                {/* Double Checklist Button */}
                <button
                    onClick={() => setShowEvidence(true)}
                    className="w-full mb-6 bg-slate-700 hover:bg-slate-600 text-blue-300 py-3 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-600 transition-colors shadow-sm hover:shadow-md"
                >
                    <Eye className="h-5 w-5" />
                    Validar Evidencia Técnica (Checklist)
                </button>

                {!hasTechnicalEvidence && (
                    <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs p-2 rounded flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Alerta: Técnico no subió evidencia completa.
                    </div>
                )}

                {/* Upload Section */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Cargar Acta de Habilitación</label>
                    <label className={`
                        block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all relative overflow-hidden group
                        ${file ? 'border-green-500/50 bg-green-500/5' : 'border-slate-600 hover:border-purple-500 hover:bg-slate-700/50'}
                    `}>
                        <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />

                        {preview ? (
                            <div className="flex flex-col items-center animate-in zoom-in-95">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt="Acta Preview" className="h-40 object-contain rounded mb-2 shadow-lg ring-1 ring-slate-700" />
                                <span className="text-green-400 text-sm font-bold flex items-center gap-1"><Check className="h-4 w-4" /> Archivo Listo</span>
                                <span className="text-xs text-slate-500 mt-1">Click para cambiar</span>
                            </div>
                        ) : file ? (
                            <div className="flex flex-col items-center animate-in zoom-in-95">
                                <FileText className="h-12 w-12 text-purple-400 mb-2" />
                                <span className="text-purple-300 font-bold">{file.name}</span>
                                <span className="text-xs text-slate-500 mt-1">Documento PDF detectado</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-4">
                                <div className="bg-slate-800 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <Camera className="h-8 w-8 text-slate-300" />
                                </div>
                                <span className="text-slate-300 font-bold text-lg">Subir Acta</span>
                                <span className="text-xs text-slate-500 mt-1">Escanear documento o tomar foto</span>
                            </div>
                        )}
                    </label>
                </div>

                {/* GPS Status & Action */}
                <div className="flex flex-col gap-3">
                    {file && checkingLoc && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm justify-center py-2 animate-pulse">
                            <Loader2 className="animate-spin h-4 w-4" /> Verificando ubicación GPS...
                        </div>
                    )}

                    {file && !checkingLoc && locationVerified && (
                        <div className="flex items-center gap-2 text-green-400 text-sm justify-center bg-green-500/10 p-2 rounded border border-green-500/20 animate-in fade-in slide-in-from-top-2">
                            <MapPin className="h-4 w-4" /> Ubicación GPS Validada
                        </div>
                    )}

                    {file && !checkingLoc && !locationVerified && locError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center space-y-2 animate-in shake">
                            <p className="text-red-400 text-sm font-bold flex justify-center items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Error de Geocerca
                            </p>
                            <p className="text-red-300 text-xs">{locError}</p>
                            <button onClick={checkLocation} className="text-xs underline text-red-400 hover:text-white">
                                Reintentar GPS
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={!file || uploading || (file && !locationVerified)}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                            ${!file || (file && !locationVerified)
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40 transform hover:scale-[1.02]'
                            }
                        `}
                    >
                        {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : <Check className="h-5 w-5" />}
                        {uploading ? 'Validando...' : 'Finalizar Habilitación'}
                    </button>
                </div>
            </div>

            {showEvidence && (
                <TechnicalEvidenceModal
                    job={job}
                    onClose={() => setShowEvidence(false)}
                />
            )}
        </>
    );
}
