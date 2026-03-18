'use client';

import { useState } from 'react';
import { X, Check, FileText, MapPin, Maximize2, Download, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Operation {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    fecha_creacion: string;
    foto_fachada: string;
    foto_fachada_panoramica?: string;
    foto_contrato?: string;
    foto_contrato_2?: string;
    foto_contrato_3?: string;
    foto_contrato_4?: string;
    foto_contrato_5?: string;
    foto_contrato_6?: string;
    foto_izquierda?: string;
    foto_derecha?: string;
    foto_cocina?: string;
    doc_carta_autorizacion?: string;
    doc_listado_comercial?: string;
    doc_formato_firmas?: string;
    doc_dj_propiedad?: string;
    doc_bonogas?: string;
    foto_dni_frontal?: string;
    foto_dni_reverso?: string;
    foto_recibo_servicio?: string;
    foto_propietario_dni_frontal?: string;
    foto_propietario_dni_reverso?: string;
    fotos_opcionales?: { nombre: string; url: string }[];
    latitud?: number;
    longitud?: number;
    estado_fise: string;
}

interface ValidationModalProps {
    op: Operation;
    role?: string | null;
    onClose: () => void;
    onResolve: (dni: string, status: string, financing: number, rejectionReason?: string) => void;
}

export default function ValidationModal({ op, role, onClose, onResolve }: ValidationModalProps) {
    const [financing, setFinancing] = useState(100);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'reject' | 'observe' | null>(null);
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Helper: add a page with title label + image
            const addFullPage = (imgData: string | undefined, title: string) => {
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                doc.text(title, 10, 8);
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                if (!imgData) {
                    doc.text(`[Sin imagen: ${title}]`, 20, 20);
                    return;
                }
                const props = doc.getImageProperties(imgData);
                const ratio = props.width / props.height;
                const imgW = pageWidth - 20;
                const imgH = imgW / ratio;
                const maxH = pageHeight - 20;
                doc.addImage(imgData, 'JPEG', 10, 12, imgW, imgH > maxH ? maxH : imgH);
            };

            // Helper: add two small images side by side on one page
            const addTwoSideBySide = (left: string | undefined, leftTitle: string, right: string | undefined, rightTitle: string, pageTitle: string) => {
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                doc.text(pageTitle, 10, 8);
                const half = (pageWidth - 30) / 2;
                if (left) {
                    const p = doc.getImageProperties(left);
                    const h = half / (p.width / p.height);
                    doc.addImage(left, 'JPEG', 10, 14, half, h > 100 ? 100 : h);
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(leftTitle, 10, h > 100 ? 118 : 16 + h);
                }
                if (right) {
                    const p = doc.getImageProperties(right);
                    const h = half / (p.width / p.height);
                    doc.addImage(right, 'JPEG', 20 + half, 14, half, h > 100 ? 100 : h);
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(rightTitle, 20 + half, h > 100 ? 118 : 16 + h);
                }
            };

            const fetchImage = async (url: string | undefined) => {
                if (!url) return undefined;
                try {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error('Error fetching image', e);
                    return undefined;
                }
            };

            // ── Cover / Summary Page ──
            doc.setFontSize(18);
            doc.setTextColor(30, 30, 30);
            doc.text('EXPEDIENTE FISE GAS', pageWidth / 2, 30, { align: 'center' });
            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            doc.text(`Cliente: ${op.cliente_nombre}`, 20, 50);
            doc.text(`DNI: ${op.id_dni}`, 20, 60);
            doc.text(`Dirección: ${op.cliente_direccion}`, 20, 70);
            doc.text(`Fecha Captación: ${new Date(op.fecha_creacion).toLocaleString('es-PE')}`, 20, 80);
            if (op.latitud && op.longitud) {
                doc.text(`Coordenadas GPS: ${op.latitud.toFixed(5)}, ${op.longitud.toFixed(5)}`, 20, 90);
                doc.text(`Google Maps: maps.google.com/maps?q=${op.latitud},${op.longitud}`, 20, 100);
            } else {
                doc.setTextColor(180, 80, 80);
                doc.text('GPS: No capturado', 20, 90);
            }

            // ── Fetch all images in parallel ──
            const [
                c1, c2, c3, c4, c5, c6,
                dniF, dniR,
                propDniF, propDniR,
                recibo,
                fachada, fachadaPan, izq, der, cocina,
                carta, listado, firmas, dj, bono
            ] = await Promise.all([
                fetchImage(op.foto_contrato), fetchImage(op.foto_contrato_2),
                fetchImage(op.foto_contrato_3), fetchImage(op.foto_contrato_4),
                fetchImage(op.foto_contrato_5), fetchImage(op.foto_contrato_6),
                fetchImage(op.foto_dni_frontal), fetchImage(op.foto_dni_reverso),
                fetchImage(op.foto_propietario_dni_frontal), fetchImage(op.foto_propietario_dni_reverso),
                fetchImage(op.foto_recibo_servicio),
                fetchImage(op.foto_fachada), fetchImage(op.foto_fachada_panoramica),
                fetchImage(op.foto_izquierda), fetchImage(op.foto_derecha), fetchImage(op.foto_cocina),
                fetchImage(op.doc_carta_autorizacion), fetchImage(op.doc_listado_comercial),
                fetchImage(op.doc_formato_firmas), fetchImage(op.doc_dj_propiedad), fetchImage(op.doc_bonogas)
            ]);

            // Fotos opcionales (may vary)
            const fotosOpcData: { nombre: string; data: string | undefined }[] = [];
            if (op.fotos_opcionales && op.fotos_opcionales.length > 0) {
                for (const f of op.fotos_opcionales) {
                    const data = await fetchImage(f.url);
                    fotosOpcData.push({ nombre: f.nombre || 'Foto Opcional', data });
                }
            }

            // ── Contrato (6 páginas) ──
            if (c1) { doc.addPage(); addFullPage(c1, 'CONTRATO — Pág. 1'); }
            if (c2) { doc.addPage(); addFullPage(c2, 'CONTRATO — Pág. 2'); }
            if (c3) { doc.addPage(); addFullPage(c3, 'CONTRATO — Pág. 3'); }
            if (c4) { doc.addPage(); addFullPage(c4, 'CONTRATO — Pág. 4'); }
            if (c5) { doc.addPage(); addFullPage(c5, 'CONTRATO — Pág. 5'); }
            if (c6) { doc.addPage(); addFullPage(c6, 'CONTRATO — Pág. 6'); }

            // ── DNI Solicitante (lado a lado) ──
            if (dniF || dniR) {
                doc.addPage();
                addTwoSideBySide(dniF, 'DNI Frontal', dniR, 'DNI Reverso', 'IDENTIDAD SOLICITANTE');
            }

            // ── Recibo de Servicio ──
            if (recibo) { doc.addPage(); addFullPage(recibo, 'RECIBO DE SERVICIO'); }

            // ── DNI Propietario (si existe, lado a lado) ──
            if (propDniF || propDniR) {
                doc.addPage();
                addTwoSideBySide(propDniF, 'DNI Propietario Frontal', propDniR, 'DNI Propietario Reverso', 'DOCUMENTOS DEL PROPIETARIO (Opcional)');
            }

            // ── Evidencias Visuales ──
            if (fachada) { doc.addPage(); addFullPage(fachada, 'EVIDENCIA — Fachada'); }
            if (fachadaPan) { doc.addPage(); addFullPage(fachadaPan, 'EVIDENCIA — Fachada Panorámica'); }
            if (izq) { doc.addPage(); addFullPage(izq, 'EVIDENCIA — Lateral Izquierdo'); }
            if (der) { doc.addPage(); addFullPage(der, 'EVIDENCIA — Lateral Derecho'); }
            if (cocina) { doc.addPage(); addFullPage(cocina, 'EVIDENCIA — Ambiente Cocina'); }

            // ── Documentos Adicionales opcionales ──
            if (carta) { doc.addPage(); addFullPage(carta, 'DOC. ADICIONAL — Carta de Autorización'); }
            if (listado) { doc.addPage(); addFullPage(listado, 'DOC. ADICIONAL — Listado Comercial'); }
            if (firmas) { doc.addPage(); addFullPage(firmas, 'DOC. ADICIONAL — Formato de Firmas'); }
            if (dj) { doc.addPage(); addFullPage(dj, 'DOC. ADICIONAL — DJ Propiedad'); }
            if (bono) { doc.addPage(); addFullPage(bono, 'DOC. ADICIONAL — BonoGas'); }

            // ── Fotos Opcionales (con nombre personalizado) ──
            for (const foto of fotosOpcData) {
                if (foto.data) {
                    doc.addPage();
                    addFullPage(foto.data, `FOTO OPCIONAL — ${foto.nombre}`);
                }
            }

            doc.save(`Expediente_${op.id_dni}_${op.cliente_nombre.replace(/\s+/g, '_')}.pdf`);

        } catch (error) {
            console.error(error);
            alert('Error al generar PDF. Revise que las imágenes carguen correctamente.');
        } finally {
            setDownloading(false);
        }
    };

    const COMMON_REASONS = [
        'Foto de contrato ilegible',
        'Falta foto de fachada',
        'Dirección no coincide con DNI',
        'Cliente ya cuenta con gas',
        'Firma no coincide'
    ];

    const handleConfirmAction = () => {
        const finalReason = reason === 'Otro' ? customReason : reason;
        if (!finalReason) return alert('Debes especificar un motivo');

        const status = actionType === 'reject' ? 'Rechazado' : 'Observado';
        onResolve(op.id_dni, status, financing, finalReason);
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

    const isSupervisor = role === 'supervisor';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
            <div className="bg-slate-900 w-full max-w-6xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]">

                {/* Left: Images Grid */}
                <div className="md:w-3/5 p-6 bg-slate-950/50 overflow-y-auto h-full border-r border-slate-800 custom-scrollbar">
                    <h3 className="text-slate-400 font-medium mb-4 flex items-center gap-2 sticky top-0 bg-slate-950/80 backdrop-blur py-2 z-10">
                        <FileText className="h-4 w-4" /> Evidencias Multimedia
                    </h3>

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Marcación y Fachada</h4>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <ImageCard title="Fachada" src={op.foto_fachada} />
                        {op.foto_fachada_panoramica && <ImageCard title="Fachada Panorámica" src={op.foto_fachada_panoramica} />}
                        <ImageCard title="Lat. Izquierda" src={op.foto_izquierda} />
                        <ImageCard title="Lat. Derecha" src={op.foto_derecha} />
                        <ImageCard title="Ambiente Cocina" src={op.foto_cocina} />
                    </div>

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Identidad Solicitante (DNI y Recibo)</h4>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <ImageCard title="DNI Frontal" src={op.foto_dni_frontal} />
                        <ImageCard title="DNI Reverso" src={op.foto_dni_reverso} />
                        <ImageCard title="Recibo Servicio" src={op.foto_recibo_servicio} />
                    </div>

                    {(op.foto_propietario_dni_frontal || op.foto_propietario_dni_reverso) && (
                        <>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">DNI Propietario</h4>
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                {op.foto_propietario_dni_frontal && <ImageCard title="DNI Propietario Frontal" src={op.foto_propietario_dni_frontal} />}
                                {op.foto_propietario_dni_reverso && <ImageCard title="DNI Propietario Reverso" src={op.foto_propietario_dni_reverso} />}
                            </div>
                        </>
                    )}

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

                    {op.fotos_opcionales && op.fotos_opcionales.length > 0 && (
                        <>
                            <h4 className="text-xs font-bold text-orange-400 uppercase mb-2 mt-4">Fotos Opcionales</h4>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {op.fotos_opcionales.map((f, i) => (
                                    <ImageCard key={i} title={f.nombre || `Foto ${i + 1}`} src={f.url} />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Mini-Mapa GPS */}
                    <div className="mt-6 rounded-xl overflow-hidden border border-slate-700">
                        <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-800">
                            <MapPin className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Geolocalización del Vendedor</span>
                            {op.latitud && (
                                <span className="ml-auto text-[10px] text-slate-500">
                                    {op.latitud.toFixed(5)}, {op.longitud?.toFixed(5)}
                                </span>
                            )}
                        </div>
                        {op.latitud && op.longitud ? (
                            <>
                                <iframe
                                    src={`https://maps.google.com/maps?q=${op.latitud},${op.longitud}&z=17&output=embed`}
                                    width="100%"
                                    height="220"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Mapa de ubicación del solicitante"
                                />
                                <div className="bg-slate-950 px-3 py-1.5 flex justify-end">
                                    <a
                                        href={`https://www.google.com/maps?q=${op.latitud},${op.longitud}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                                    >
                                        <MapPin className="h-3 w-3" /> Abrir en Google Maps
                                    </a>
                                </div>
                            </>
                        ) : (
                            <div className="bg-slate-950 px-4 py-4 text-xs text-yellow-600 flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> GPS no capturado en este registro
                            </div>
                        )}
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
                        {actionType ? (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h3 className={`font-bold mb-4 flex items-center gap-2 ${actionType === 'reject' ? 'text-red-500' : 'text-yellow-500'}`}>
                                    {actionType === 'reject' ? <AlertTriangle className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                                    {actionType === 'reject' ? 'Motivo del Rechazo' : 'Observaciones / Correcciones'}
                                </h3>
                                <div className="space-y-2 mb-4">
                                    {COMMON_REASONS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setReason(r)}
                                            className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${reason === r ?
                                                (actionType === 'reject' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-yellow-500/20 border-yellow-500 text-white')
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setReason('Otro')}
                                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${reason === 'Otro' ?
                                            (actionType === 'reject' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-yellow-500/20 border-yellow-500 text-white')
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        Otro motivo...
                                    </button>
                                </div>

                                {reason === 'Otro' && (
                                    <textarea
                                        value={customReason}
                                        onChange={e => setCustomReason(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Escribe el detalle..."
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

                                {!isSupervisor && (
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
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions - Fixed */}
                    <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
                        {actionType ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setActionType(null)}
                                    className="flex-1 py-3 text-slate-400 hover:text-white font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmAction}
                                    className={`flex-[2] py-3 text-white rounded-xl font-bold shadow-lg transition-colors ${actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/20'
                                        }`}
                                >
                                    {actionType === 'reject' ? 'Confirmar Rechazo' : 'Enviar Observación'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActionType('reject')}
                                    className="px-4 py-3 bg-red-500/10 hover:bg-red-900/30 text-red-500 border border-red-500/20 rounded-xl font-bold transition-colors"
                                    title="Rechazar definitivamente"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <button
                                    onClick={() => setActionType('observe')}
                                    className="flex-1 py-3 bg-yellow-500/10 hover:bg-yellow-900/30 text-yellow-500 border border-yellow-500/20 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    Observar
                                </button>

                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                    className="px-4 py-3 bg-blue-500/10 hover:bg-blue-900/30 text-blue-400 border border-blue-500/20 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
                                    title="Descargar PDF"
                                >
                                    {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                                </button>

                                <button
                                    onClick={() => onResolve(op.id_dni, 'Aprobado', financing)}
                                    className="flex-[2] py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 flex justify-center items-center gap-2 transition-colors"
                                >
                                    <Check className="h-5 w-5" />
                                    Aprobar
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
