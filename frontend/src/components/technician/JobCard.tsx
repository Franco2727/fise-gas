'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, Check, MapPin, Loader2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Job {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    cliente_telefono: string;
    estado_operativo: string;
    latitud?: number;
    longitud?: number;
}

export default function JobCard({ job, onComplete }: { job: Job; onComplete: () => void }) {
    // Files State
    const [files, setFiles] = useState<{
        gabinete: File | null;
        redInterna: File | null;
        puntoConsumo: File | null;
        hermeticidad: File | null;
    }>({ gabinete: null, redInterna: null, puntoConsumo: null, hermeticidad: null });

    const [previews, setPreviews] = useState<{
        gabinete: string | null;
        redInterna: string | null;
        puntoConsumo: string | null;
        hermeticidad: string | null;
    }>({ gabinete: null, redInterna: null, puntoConsumo: null, hermeticidad: null });

    // Data State
    const [measurements, setMeasurements] = useState({
        tuberia2025: '',
        tuberia1216: ''
    });
    const [observations, setObservations] = useState('');

    // UI State
    const [uploading, setUploading] = useState(false);
    const [activeSection, setActiveSection] = useState<'medidas' | 'fotos' | 'resumen'>('medidas');
    const [isExpanded, setIsExpanded] = useState(false);

    // Watermark Helper
    const addWatermark = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(file); return; }

                    canvas.width = img.width;
                    canvas.height = img.height;

                    ctx.drawImage(img, 0, 0);

                    // Overlay
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(0, canvas.height - 150, canvas.width, 150);

                    // Text
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 30px Arial';
                    const date = new Date().toLocaleString();
                    ctx.fillText(`FECHA: ${date}`, 20, canvas.height - 100);

                    // Simple Geo placeholder if navigator.geolocation not used here (to keep it fast)
                    // Or implement real geo inside. For simplicity, just Date + basic info.
                    // If we want coordinates, we need permission.

                    navigator.geolocation.getCurrentPosition((pos) => {
                        ctx.fillText(`GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`, 20, canvas.height - 50);
                        canvas.toBlob((blob) => {
                            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                            else resolve(file);
                        }, 'image/jpeg', 0.8);
                    }, () => {
                        ctx.fillText('GPS: No Disponible', 20, canvas.height - 50);
                        canvas.toBlob((blob) => {
                            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                            else resolve(file);
                        }, 'image/jpeg', 0.8);
                    });
                };
            };
        });
    };

    const handleFileChange = async (field: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            let file = e.target.files[0];

            // Process Watermark
            try {
                file = await addWatermark(file);
            } catch (err) {
                console.error("Watermark failed", err);
            }

            setFiles(prev => ({ ...prev, [field]: file }));
            setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
        }
    };

    const handleSubmit = async () => {
        if (!files.gabinete || !files.redInterna || !files.puntoConsumo || !files.hermeticidad) {
            alert('Debes subir TODAS las 4 fotos obligatorias (incluyendo Hermeticidad).');
            return;
        }
        setUploading(true);

        try {
            // Get Current Technician Logic
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No hay sesión de usuario activa");

            const uploadPhoto = async (file: File, prefix: string) => {
                const fileName = `${job.id_dni}/${prefix}_${Date.now()}.jpg`;
                const { error: upErr } = await supabase.storage.from('evidencias-fise').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('evidencias-fise').getPublicUrl(fileName);
                return publicUrl;
            };

            const [urlGabinete, urlRed, urlPunto, urlHermeticidad] = await Promise.all([
                uploadPhoto(files.gabinete, 'gabinete'),
                uploadPhoto(files.redInterna, 'red_interna'),
                uploadPhoto(files.puntoConsumo, 'punto_consumo'),
                uploadPhoto(files.hermeticidad, 'hermeticidad')
            ]);

            const m2025 = parseFloat(measurements.tuberia2025) || 0;
            const m1216 = parseFloat(measurements.tuberia1216) || 0;

            const { error: dbError } = await supabase
                .from('operaciones_maestra')
                .update({
                    estado_operativo: 'Instalado',
                    tecnico_id: user.id, // Save Technician ID
                    foto_gabinete: urlGabinete,
                    foto_red_interna: urlRed,
                    foto_punto_consumo: urlPunto,
                    foto_hermeticidad: urlHermeticidad,
                    metraje_tuberia_2025: m2025,
                    metraje_tuberia_1216: m1216,
                    observaciones_tecnico: observations,
                    metros_lineales: m2025 + m1216,
                    fecha_instalacion: new Date().toISOString()
                })
                .eq('id_dni', job.id_dni);

            if (dbError) throw dbError;

            onComplete();
        } catch (error: any) {
            console.error('Error:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };


    const PhotoInput = ({ label, field, requiredText }: { label: string, field: keyof typeof files, requiredText?: string }) => (
        <div className="mb-4">
            <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-slate-300">{label}</label>
                {requiredText && <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1 rounded">{requiredText}</span>}
            </div>
            <label className={`
              block w-full border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all relative overflow-hidden group
              ${previews[field] ? 'border-green-500/50' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-700'}
            `}>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => handleFileChange(field, e)}
                />

                {previews[field] ? (
                    <div className="relative h-32 w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previews[field]!} alt="Preview" className="h-full w-full object-cover rounded-md" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <RefreshCw className="text-white h-6 w-6" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 rounded text-[10px] text-white">
                            Watermarked
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center">
                        <Camera className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-xs text-slate-400 font-bold uppercase">Tomar Foto</span>
                        <span className="text-[10px] text-slate-500 mt-1">Cámara Obligatoria</span>
                    </div>
                )}
            </label>
        </div>
    );

    const mapsUrl = job.latitud && job.longitud
        ? `https://www.google.com/maps/search/?api=1&query=${job.latitud},${job.longitud}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.cliente_direccion || '')}`;

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg mb-4 overflow-hidden transition-all">
            {/* Header - Clickable Trigger */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 bg-slate-900/50 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex justify-between items-center text-left">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-lg">{job.cliente_nombre}</h3>
                            <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-600">
                                DNI: {job.id_dni}
                            </span>
                        </div>
                        <div className="flex items-center text-slate-400 text-sm">
                            <MapPin className="h-3 w-3 mr-1" /> {job.cliente_direccion}
                        </div>
                    </div>
                    <div className="text-slate-500 ml-4">
                        {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <>
                    {/* Client Info Section */}
                    <div className="bg-slate-900 p-4 border-b border-slate-700 animate-in slide-in-from-top-2">
                        {/* Name & DNI Row */}
                        <div className="flex items-center gap-3 mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Cliente Titular</span>
                                <span className="text-white font-bold text-lg leading-tight">{job.cliente_nombre}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href={`tel:${job.cliente_telefono}`}
                                className="bg-green-600/10 border border-green-600/30 hover:bg-green-600/20 p-3 rounded-lg flex flex-col items-center justify-center gap-1 text-center transition-colors group"
                            >
                                <span className="p-2 bg-green-600 text-white rounded-full mb-1 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                </span>
                                <span className="text-green-400 font-bold text-sm">Llamar</span>
                                <span className="text-xs text-slate-400">{job.cliente_telefono || "Sin número"}</span>
                            </a>

                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600/10 border border-blue-600/30 hover:bg-blue-600/20 p-3 rounded-lg flex flex-col items-center justify-center gap-1 text-center transition-colors group"
                            >
                                <span className="p-2 bg-blue-600 text-white rounded-full mb-1 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                </span>
                                <span className="text-blue-400 font-bold text-sm">Ver Mapa</span>
                                <span className="text-xs text-slate-400 truncate max-w-full px-1">
                                    {job.latitud ? 'Usando GPS' : 'Dirección'}
                                </span>
                            </a>
                        </div>
                    </div>
                    {/* Segmented Controls */}
                    <div className="flex border-b border-slate-700 sticky top-16 bg-slate-800 z-10">
                        {[
                            { id: 'medidas', label: '1. Medidas' },
                            { id: 'fotos', label: '2. Fotos' },
                            { id: 'resumen', label: '3. Finalizar' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id as any)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeSection === tab.id ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-5 pb-20"> {/* Padding bottom for sticky footer */}
                        {activeSection === 'medidas' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tubería Pe-Al-Pe 2025 (m)</label>
                                    <input type="number" step="0.1" inputMode="decimal"
                                        value={measurements.tuberia2025} onChange={e => setMeasurements({ ...measurements, tuberia2025: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white text-lg focus:border-blue-500 outline-none" placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tubería Pe-Al-Pe 1216 (m)</label>
                                    <input type="number" step="0.1" inputMode="decimal"
                                        value={measurements.tuberia1216} onChange={e => setMeasurements({ ...measurements, tuberia1216: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white text-lg focus:border-blue-500 outline-none" placeholder="0.0"
                                    />
                                </div>
                            </div>
                        )}

                        {activeSection === 'fotos' && (
                            <div className="animate-in fade-in slide-in-from-right-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500 mb-2 inline-block mr-2" />
                                <span className="text-xs text-yellow-500 font-bold mb-4 block">FOTOS CON MARCA DE AGUA AUTOMÁTICA (GPS + FECHA)</span>

                                <div className="grid grid-cols-2 gap-3">
                                    <PhotoInput label="Gabinete Instalado" field="gabinete" requiredText="Obligatorio" />
                                    <PhotoInput label="Red Interna" field="redInterna" requiredText="Obligatorio" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <PhotoInput label="Punto Consumo" field="puntoConsumo" requiredText="Obligatorio" />
                                    <PhotoInput label="Prueba Hermeticidad" field="hermeticidad" requiredText="Manómetro" />
                                </div>
                            </div>
                        )}

                        {activeSection === 'resumen' && (
                            <div className="animate-in fade-in slide-in-from-right-2 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Observaciones</label>
                                    <textarea
                                        value={observations} onChange={e => setObservations(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                                        placeholder="Comentarios adicionales del técnico..."
                                    />
                                </div>

                                <div className="bg-slate-900/80 p-4 rounded-xl text-sm space-y-3 border border-slate-700 shadow-inner">
                                    <h4 className="text-white font-bold border-b border-slate-700 pb-2 mb-2">Resumen de Valorización</h4>

                                    <div className="flex justify-between text-slate-400">
                                        <span>Metros Totales:</span>
                                        <span className="text-white font-mono">
                                            {((parseFloat(measurements.tuberia2025) || 0) + (parseFloat(measurements.tuberia1216) || 0)).toFixed(2)} m
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 items-center">
                                        <span>Evidencias:</span>
                                        <span className={`px-2 py-0.5 rounded textxs font-bold ${files.gabinete && files.redInterna && files.puntoConsumo && files.hermeticidad ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {Object.values(files).filter(Boolean).length}/4 Completas
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* STICKY FOOTER ACTIONS */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur border-t border-slate-800 z-50 flex gap-3 shadow-2xl">
                        {activeSection === 'medidas' && (
                            <button onClick={() => setActiveSection('fotos')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20">
                                Siguiente: Fotos
                            </button>
                        )}
                        {activeSection === 'fotos' && (
                            <>
                                <button onClick={() => setActiveSection('medidas')} className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl border border-slate-700">
                                    Atrás
                                </button>
                                <button onClick={() => setActiveSection('resumen')} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20">
                                    Siguiente: Finalizar
                                </button>
                            </>
                        )}
                        {activeSection === 'resumen' && (
                            <>
                                <button onClick={() => setActiveSection('fotos')} className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl border border-slate-700">
                                    Atrás
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={uploading}
                                    className={`flex-[2] font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg ${uploading ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'}`}
                                >
                                    {uploading ? <Loader2 className="animate-spin" /> : <Check />}
                                    {uploading ? 'Enviando...' : 'Finalizar Trabajo'}
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
