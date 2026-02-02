'use client';

import { useState } from 'react';
import { X, Check, FileText, MapPin, Maximize2, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';

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
    foto_cocina?: string;
    doc_carta_autorizacion?: string;
    doc_listado_comercial?: string;
    doc_formato_firmas?: string;
    doc_dj_propiedad?: string;
    doc_bonogas?: string;
    foto_dni_frontal?: string;
    foto_dni_reverso?: string;
    foto_recibo_servicio?: string;
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
    const [downloading, setDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const addImageToPage = (imgData: string | undefined, title: string) => {
                if (!imgData) {
                    // Only print placeholder if missing
                    doc.setFontSize(10);
                    doc.text(`[Falta: ${title}]`, 20, 20);
                    return;
                }
                const props = doc.getImageProperties(imgData);
                const ratio = props.width / props.height;
                // Use full page width minus small margin
                const imgWidth = pageWidth - 20;
                const imgHeight = imgWidth / ratio;

                // Center logic if needed, but for now top-left with margin is fine.
                // REMOVED TITLE TEXT logic as requested. 
                // Images will be cleaner.

                if (imgHeight > pageHeight - 20) {
                    // Scale to fit height if too tall
                    doc.addImage(imgData, 'JPEG', 10, 10, imgWidth, pageHeight - 20);
                } else {
                    doc.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
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

            // 1. Download all images relative to order
            // Structure:
            // 1-6: Contract (6 pages)
            // 7: DNI Front + DNI Back
            // 8: Service Bill
            // 9: Facade
            // 10: Left
            // 11: Right
            // 12+: Optionals

            // Load images in parallel to speed up
            const [
                c1, c2, c3, c4, c5, c6,
                dniF, dniR,
                recibo,
                fachada, izq, der, cocina,
                carta, listado, firmas, dj, bono
            ] = await Promise.all([
                fetchImage(op.foto_contrato), fetchImage(op.foto_contrato_2), fetchImage(op.foto_contrato_3), fetchImage(op.foto_contrato_4), fetchImage(op.foto_contrato_5), fetchImage(op.foto_contrato_6),
                fetchImage(op.foto_dni_frontal), fetchImage(op.foto_dni_reverso),
                fetchImage(op.foto_recibo_servicio),
                fetchImage(op.foto_fachada), fetchImage(op.foto_izquierda), fetchImage(op.foto_derecha), fetchImage(op.foto_cocina),
                fetchImage(op.doc_carta_autorizacion), fetchImage(op.doc_listado_comercial), fetchImage(op.doc_formato_firmas), fetchImage(op.doc_dj_propiedad), fetchImage(op.doc_bonogas)
            ]);

            // Page 1-6: Contract
            if (c1) { addImageToPage(c1, 'Contrato - Pág. 1'); } else { doc.text('Falta Contrato Pág. 1', 20, 20); }

            if (c2) { doc.addPage(); addImageToPage(c2, 'Contrato - Pág. 2'); }
            if (c3) { doc.addPage(); addImageToPage(c3, 'Contrato - Pág. 3'); }
            if (c4) { doc.addPage(); addImageToPage(c4, 'Contrato - Pág. 4'); }
            if (c5) { doc.addPage(); addImageToPage(c5, 'Contrato - Pág. 5'); }
            if (c6) { doc.addPage(); addImageToPage(c6, 'Contrato - Pág. 6'); }

            // Page 7: DNI Front + Back
            doc.addPage();
            doc.text('Documento de Identidad (DNI)', 10, 10);
            if (dniF) {
                const props = doc.getImageProperties(dniF);
                const ratio = props.width / props.height;
                const w = pageWidth - 40;
                const h = w / ratio;
                doc.addImage(dniF, 'JPEG', 20, 20, w, h);

                if (dniR) {
                    const propsR = doc.getImageProperties(dniR);
                    const ratioR = propsR.width / propsR.height;
                    const hR = w / ratioR;
                    doc.addImage(dniR, 'JPEG', 20, 20 + h + 10, w, hR);
                }
            } else {
                doc.text('Falta DNI', 20, 30);
            }

            // Page 8: Service Bill
            doc.addPage();
            addImageToPage(recibo, 'Recibo de Servicio');

            // Page 9: Facade
            doc.addPage();
            addImageToPage(fachada, 'Fachada');

            // Page 10: Left
            doc.addPage();
            addImageToPage(izq, 'Lateral Izquierdo');

            // Page 11: Right
            doc.addPage();
            addImageToPage(der, 'Lateral Derecho');

            // Page 12: Kitchen
            doc.addPage();
            addImageToPage(cocina, 'Ambiente Cocina');

            // Optionals
            if (carta) { doc.addPage(); addImageToPage(carta, 'Carta de Autorización'); }
            if (listado) { doc.addPage(); addImageToPage(listado, 'Listado Comercial'); }
            if (firmas) { doc.addPage(); addImageToPage(firmas, 'Formato de Firmas'); }
            if (dj) { doc.addPage(); addImageToPage(dj, 'DJ Propiedad'); }
            if (bono) { doc.addPage(); addImageToPage(bono, 'BonoGas'); }

            doc.save(`Expediente_${op.id_dni}.pdf`);

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

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Marcación y Fachada</h4>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <ImageCard title="Fachada" src={op.foto_fachada} />
                        <ImageCard title="Lat. Izquierda" src={op.foto_izquierda} />
                        <ImageCard title="Lat. Derecha" src={op.foto_derecha} />
                        <ImageCard title="Ambiente Cocina" src={op.foto_cocina} />
                    </div>

                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Identidad (DNI y Recibo)</h4>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <ImageCard title="DNI Frontal" src={op.foto_dni_frontal} />
                        <ImageCard title="DNI Reverso" src={op.foto_dni_reverso} />
                        <ImageCard title="Recibo Servicio" src={op.foto_recibo_servicio} />
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
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                    className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-900/30 text-blue-400 border border-blue-500/20 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
                                >
                                    {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                                    PDF
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
