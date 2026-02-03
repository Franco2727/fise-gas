'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Save, Loader2, LogOut, MapPin, AlertTriangle, CheckCircle, Clock, Camera, RefreshCw, Eye, Paperclip, ScanLine, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import HistoryDetailModal from '@/components/shared/HistoryDetailModal';
import ScannerModal from '@/components/shared/ScannerModal';

export default function VendedorDashboard() {
    const { signOut, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'registro' | 'incompletos' | 'ventas'>('registro');
    const [loading, setLoading] = useState(false);

    // Lists
    const [sales, setSales] = useState<any[]>([]);

    const [incompleteSales, setIncompleteSales] = useState<any[]>([]);

    // For viewing history details
    const [reviewJob, setReviewJob] = useState<any | null>(null);

    // Scanner State
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerImage, setScannerImage] = useState<File | null>(null);
    const [scannerTargetField, setScannerTargetField] = useState<keyof typeof files | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        dni: '',
        nombre: '',
        telefono: '',
        direccion: '',
        lat: null as number | null,
        lng: null as number | null
    });

    const [files, setFiles] = useState<{
        contrato: File | null;
        contrato2: File | null;
        contrato3: File | null;
        contrato4: File | null;
        contrato5: File | null;
        contrato6: File | null;
        fachada: File | null;
        izquierda: File | null;
        derecha: File | null;
        cocina: File | null;
        cartaAutorizacion: File | null;
        listadoComercial: File | null;
        formatoFirmas: File | null;
        djPropiedad: File | null;
        bonogas: File | null;
        dniFrontal: File | null;
        dniReverso: File | null;
        reciboServicio: File | null;
    }>({
        contrato: null, contrato2: null, contrato3: null, contrato4: null, contrato5: null, contrato6: null,
        fachada: null, izquierda: null, derecha: null, cocina: null,
        cartaAutorizacion: null, listadoComercial: null, formatoFirmas: null, djPropiedad: null, bonogas: null,
        dniFrontal: null, dniReverso: null, reciboServicio: null
    });

    const [existingPhotos, setExistingPhotos] = useState<{
        contrato: string | null;
        contrato2: string | null;
        contrato3: string | null;
        contrato4: string | null;
        contrato5: string | null;
        contrato6: string | null;
        fachada: string | null;
        izquierda: string | null;
        derecha: string | null;
        cocina: string | null;
        cartaAutorizacion: string | null;
        listadoComercial: string | null;
        formatoFirmas: string | null;
        djPropiedad: string | null;
        bonogas: string | null;
        dniFrontal: string | null;
        dniReverso: string | null;
        reciboServicio: string | null;
    }>({
        contrato: null, contrato2: null, contrato3: null, contrato4: null, contrato5: null, contrato6: null,
        fachada: null, izquierda: null, derecha: null, cocina: null,
        cartaAutorizacion: null, listadoComercial: null, formatoFirmas: null, djPropiedad: null, bonogas: null,
        dniFrontal: null, dniReverso: null, reciboServicio: null
    });

    const fetchSales = async () => {
        let query = supabase
            .from('operaciones_maestra')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (user) {
            // Filter by ID (New) OR Name (Legacy)
            const userName = user.user_metadata?.full_name || '';
            // Note: .or() requires the column names to be qualified if complex, but simple version:
            // "vendedor_id.eq.UUID,vendedor_nombre.eq.NAME"
            if (userName) {
                query = query.or(`vendedor_id.eq.${user.id},vendedor_nombre.eq.${userName}`);
            } else {
                query = query.eq('vendedor_id', user.id);
            }
        }

        const { data } = await query;

        if (data) {
            setSales(data.filter(s => s.estado_fise !== 'Incompleto'));
            setIncompleteSales(data.filter(s => s.estado_fise === 'Incompleto'));
        }
    };

    useEffect(() => {
        fetchSales();
    }, [activeTab]);

    const handleGeo = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setFormData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
            }, (err) => alert('Error GPS: ' + err.message));
        } else {
            alert('GPS no disponible');
        }
    };

    const handleSave = async (partial: boolean) => {
        if (!formData.dni || !formData.nombre || !formData.direccion) {
            alert('DNI, Nombre y Dirección son obligatorios.');
            return;
        }

        if (!partial) {
            // Validate photos (New Files OR Existing URLs)
            const check = (field: keyof typeof files) => files[field] || existingPhotos[field];

            const required = ['contrato', 'contrato2', 'contrato3', 'contrato4', 'contrato5', 'contrato6', 'fachada', 'izquierda', 'derecha'] as const;
            const missing = required.filter(f => !check(f));

            if (missing.length > 0) {
                alert(`Faltan fotos obligatorias: ${missing.join(', ')}`);
                return;
            }
        }

        setLoading(true);

        try {
            const uploadFile = async (file: File | null, prefix: string) => {
                if (!file) return null;
                const fileName = `${formData.dni}/${prefix}_${Date.now()}`;
                const { error: upErr } = await supabase.storage.from('evidencias-fise').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from('evidencias-fise').getPublicUrl(fileName);
                return publicUrl;
            };

            // Map fields to prefixes
            const fieldMap: Record<keyof typeof files, string> = {
                contrato: 'contrato', contrato2: 'contrato_2', contrato3: 'contrato_3', contrato4: 'contrato_4', contrato5: 'contrato_5', contrato6: 'contrato_6',
                fachada: 'fachada', izquierda: 'izquierda', derecha: 'derecha', cocina: 'cocina',
                cartaAutorizacion: 'doc_carta', listadoComercial: 'doc_listado', formatoFirmas: 'doc_firmas', djPropiedad: 'doc_dj', bonogas: 'doc_bono',
                dniFrontal: 'dni_frontal', dniReverso: 'dni_reverso', reciboServicio: 'recibo_servicio'
            };

            // Upload all new files
            const uploads: Partial<Record<keyof typeof files, string>> = {};
            await Promise.all(Object.keys(files).map(async (key) => {
                const k = key as keyof typeof files;
                if (files[k]) {
                    uploads[k] = await uploadFile(files[k], fieldMap[k]) || undefined;
                }
            }));

            // Check if exists to update or insert
            const { data: existing } = await supabase.from('operaciones_maestra').select('id_dni').eq('id_dni', formData.dni).maybeSingle();

            const payload: any = {
                id_dni: formData.dni,
                cliente_nombre: formData.nombre,
                cliente_telefono: formData.telefono,
                cliente_direccion: formData.direccion,
                latitud: formData.lat,
                longitud: formData.lng,
                vendedor_nombre: user?.user_metadata?.full_name || 'Vendedor Desconocido',
                vendedor_id: user?.id,
                estado_fise: partial ? 'Incompleto' : 'Pendiente'
            };

            // Helper to set payload field - favors new upload, falls back to existing, or clears if null
            const setField = (payloadKey: string, stateKey: keyof typeof files) => {
                payload[payloadKey] = uploads[stateKey] || existingPhotos[stateKey] || null;
            };

            setField('foto_contrato', 'contrato');
            setField('foto_contrato_2', 'contrato2');
            setField('foto_contrato_3', 'contrato3');
            setField('foto_contrato_4', 'contrato4');
            setField('foto_contrato_5', 'contrato5');
            setField('foto_contrato_6', 'contrato6');
            setField('foto_fachada', 'fachada');
            setField('foto_izquierda', 'izquierda');
            setField('foto_derecha', 'derecha');
            setField('foto_cocina', 'cocina');
            setField('doc_carta_autorizacion', 'cartaAutorizacion');
            setField('doc_listado_comercial', 'listadoComercial');
            setField('doc_formato_firmas', 'formatoFirmas');
            setField('doc_dj_propiedad', 'djPropiedad');
            setField('doc_bonogas', 'bonogas');
            setField('foto_dni_frontal', 'dniFrontal');
            setField('foto_dni_reverso', 'dniReverso');
            setField('foto_recibo_servicio', 'reciboServicio');

            let error;
            if (existing) {
                const { error: upErr } = await supabase.from('operaciones_maestra').update(payload).eq('id_dni', formData.dni);
                error = upErr;
            } else {
                const { error: inErr } = await supabase.from('operaciones_maestra').insert(payload);
                error = inErr;
            }

            if (error) throw error;

            alert(partial ? 'Guardado parcial exitoso.' : '¡Captación enviada correctamente!');
            resetForm();
            setActiveTab(partial ? 'incompletos' : 'ventas');
            fetchSales();

        } catch (error: any) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (field: keyof typeof files, file: File) => {
        // Condition: Exclude Facade/Laterals/Kitchen from Scanner
        const noScanFields = ['fachada', 'izquierda', 'derecha', 'cocina'];
        if (noScanFields.includes(field)) {
            setFiles(prev => ({ ...prev, [field]: file }));
        } else {
            // Open Scanner
            setScannerTargetField(field);
            setScannerImage(file);
            setScannerOpen(true);
        }
    };

    const handleScanned = (file: File) => {
        if (scannerTargetField) {
            setFiles(prev => ({ ...prev, [scannerTargetField]: file }));
        }
        setScannerTargetField(null);
        setScannerImage(null);
    };

    const resetForm = () => {
        setFormData({ dni: '', nombre: '', telefono: '', direccion: '', lat: null, lng: null });
        const emptyFiles = {
            contrato: null, contrato2: null, contrato3: null, contrato4: null, contrato5: null, contrato6: null,
            fachada: null, izquierda: null, derecha: null, cocina: null,
            cartaAutorizacion: null, listadoComercial: null, formatoFirmas: null, djPropiedad: null, bonogas: null,
            dniFrontal: null, dniReverso: null, reciboServicio: null
        };
        setFiles(emptyFiles);
        // Cast nulls to correct type for existing photos
        setExistingPhotos(emptyFiles as any);
    }

    const loadIncomplete = (sale: any) => {
        setFormData({
            dni: sale.id_dni,
            nombre: sale.cliente_nombre || '',
            telefono: sale.cliente_telefono || '',
            direccion: sale.cliente_direccion || '',
            lat: sale.latitud,
            lng: sale.longitud
        });

        // Load existing photos from DB
        setExistingPhotos({
            contrato: sale.foto_contrato,
            contrato2: sale.foto_contrato_2,
            contrato3: sale.foto_contrato_3,
            contrato4: sale.foto_contrato_4,
            contrato5: sale.foto_contrato_5,
            contrato6: sale.foto_contrato_6,
            fachada: sale.foto_fachada,
            izquierda: sale.foto_izquierda,
            derecha: sale.foto_derecha,
            cocina: sale.foto_cocina,
            cartaAutorizacion: sale.doc_carta_autorizacion,
            listadoComercial: sale.doc_listado_comercial,
            formatoFirmas: sale.doc_formato_firmas,
            djPropiedad: sale.doc_dj_propiedad,
            bonogas: sale.doc_bonogas,
            dniFrontal: sale.foto_dni_frontal,
            dniReverso: sale.foto_dni_reverso,
            reciboServicio: sale.foto_recibo_servicio
        });

        // Reset new files
        setFiles({
            contrato: null, contrato2: null, contrato3: null, contrato4: null, contrato5: null, contrato6: null,
            fachada: null, izquierda: null, derecha: null, cocina: null,
            cartaAutorizacion: null, listadoComercial: null, formatoFirmas: null, djPropiedad: null, bonogas: null,
            dniFrontal: null, dniReverso: null, reciboServicio: null
        });
        setActiveTab('registro');
    };

    const checkTimeRemaining = (dateStr: string) => {
        const created = new Date(dateStr).getTime();
        const now = Date.now();
        const diffHours = (now - created) / (1000 * 60 * 60);

        if (diffHours > 24) return { expired: true, text: 'Vencido (+24h)' };
        return { expired: false, text: `${Math.round(24 - diffHours)}h restantes` };
    };

    const getStatusColor = (sale: any) => {
        if (sale.estado_operativo === 'Habilitado') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        if (sale.estado_operativo === 'Por Aprobar Habilitacion') return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
        if (sale.estado_operativo === 'Instalado') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        const estado = sale.estado_fise;
        if (estado === 'Pendiente') return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        if (estado === 'Incompleto') return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        if (['Aprobado'].includes(estado)) return 'bg-green-500/20 text-green-500 border-green-500/30';
        if (['Rechazado', 'Observado'].includes(estado)) return 'bg-red-500/20 text-red-500 border-red-500/30';
        return 'bg-slate-700 text-slate-400';
    };

    const getStatusLabel = (sale: any) => {
        if (sale.estado_operativo === 'Habilitado') return 'Habilitado 🎉';
        if (sale.estado_operativo === 'Por Aprobar Habilitacion') return 'Por Aprobar (Habilitación) ⏳';
        if (sale.estado_operativo === 'Instalado') return 'Instalado 🔧';
        return sale.estado_fise;
    }

    const FileInput = ({ label, field }: { label: string, field: keyof typeof files }) => {
        const hasExisting = existingPhotos[field];
        const hasNew = files[field];
        const isComplete = hasExisting || hasNew;
        const noScan = ['fachada', 'izquierda', 'derecha', 'cocina'].includes(field);

        return (
            <div>
                <label className="text-slate-300 text-sm block mb-1">{label}</label>
                <div className={`block w-full border border-dashed rounded-lg p-3 text-center transition-all relative overflow-hidden group ${isComplete ? 'border-green-500/50 bg-green-500/10' : 'border-slate-700 hover:bg-slate-800'}`}>

                    {hasNew ? (
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-sm text-green-400 font-medium flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" /> Nuevo: {files[field]?.name.substring(0, 10)}...
                            </span>
                            <button onClick={() => setFiles(prev => ({ ...prev, [field]: null }))} className="text-xs text-red-500 hover:underline">Eliminar</button>
                        </div>
                    ) : hasExisting ? (
                        <div className="relative h-24 w-full group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={hasExisting} alt="Saved" className="h-full w-full object-cover rounded-md opacity-80" />

                            <div className="absolute top-1 right-1 z-20">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation(); // Prevent triggering file input
                                        setExistingPhotos(prev => ({ ...prev, [field]: null }));
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors"
                                    title="Quitar foto"
                                >
                                    <LogOut className="h-3 w-3" /> {/* Reusing LogOut icon as 'Exit/Remove' or X if available, else X from lucide */}
                                </button>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                                <span className="text-white text-xs font-bold flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-400" /> Guardado
                                </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <span className="text-white text-xs flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" /> Cambiar
                                </span>
                            </div>
                            {/* Overlay Cover inputs below to act as trigger */}
                            <label className="absolute inset-0 cursor-pointer">
                                <input type="file" accept="image/*" className="hidden"
                                    onChange={e => e.target.files?.[0] && handleFileSelect(field, e.target.files[0])}
                                />
                            </label>
                        </div>
                    ) : (
                        <label className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-3 rounded-lg cursor-pointer flex justify-center items-center gap-2 border border-slate-700 transition-all hover:border-slate-500 shadow-sm">
                            <Camera className="h-4 w-4" />
                            <span className="font-semibold text-xs">{noScan ? 'Tomar / Subir Foto' : 'Escanear / Subir'}</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFileSelect(field, e.target.files[0]);
                                }}
                            />
                        </label>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 pb-20">
            <ScannerModal
                isOpen={scannerOpen}
                imageSrc={scannerImage}
                onClose={() => setScannerOpen(false)}
                onScan={handleScanned}
            />
            <header className="flex justify-between items-center mb-6 sticky top-0 bg-slate-950/90 py-2 z-10 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="text-orange-500 h-8 w-8" />
                        Ventas
                    </h1>
                    <p className="text-slate-400 text-xs pl-10">Hola, {user?.user_metadata?.full_name || 'Vendedor'}</p>
                </div>
                <button onClick={() => signOut()} className="bg-slate-800 p-2 rounded-full text-slate-400">
                    <LogOut className="h-5 w-5" />
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button onClick={() => { setActiveTab('registro'); resetForm(); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'registro' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    Nuevo
                </button>
                <button onClick={() => setActiveTab('incompletos')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all relative ${activeTab === 'incompletos' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    Incompletos
                    {incompleteSales.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{incompleteSales.length}</span>}
                </button>
                <button onClick={() => setActiveTab('ventas')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ventas' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    Historial
                </button>
            </div>

            {activeTab === 'registro' && (
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 shadow-xl max-w-lg mx-auto animate-in fade-in zoom-in-95">
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                        <h2 className="text-lg font-bold text-white mb-4">Registro de Cliente</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-slate-400 text-xs uppercase font-bold mb-1 block">DNI *</label>
                                <input required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none" value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} maxLength={8} placeholder="8 dígitos" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-xs uppercase font-bold mb-1 block">Teléfono</label>
                                <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="999..." />
                            </div>
                        </div>
                        <div>
                            <label className="text-slate-400 text-xs uppercase font-bold mb-1 block">Nombre Completo *</label>
                            <input required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre Apellido" />
                        </div>
                        <div>
                            <label className="text-slate-400 text-xs uppercase font-bold mb-1 block">Dirección Exacta *</label>
                            <input required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} placeholder="Av. Calle..." />
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                            <span className="text-sm text-slate-400">Ubicación GPS</span>
                            <button type="button" onClick={handleGeo} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${formData.lat ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                <MapPin className="h-3 w-3" /> {formData.lat ? 'Detectada' : 'Obtener'}
                            </button>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-slate-800 mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-white font-bold text-sm">Evidencias Principales</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FileInput label="Fachada" field="fachada" />
                                <FileInput label="Lateral Izq." field="izquierda" />
                                <FileInput label="Lateral Der." field="derecha" />
                                <FileInput label="Ambiente Cocina" field="cocina" />
                            </div>

                            <div className="mt-4 border-t border-slate-800 pt-3">
                                <p className="text-slate-400 font-bold text-xs uppercase mb-3">Documentos de Identidad (DNI y Recibo) *</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <FileInput label="DNI Frontal" field="dniFrontal" />
                                    <FileInput label="DNI Reverso" field="dniReverso" />
                                    <FileInput label="Recibo Servicio" field="reciboServicio" />
                                </div>
                            </div>

                            {/* Expanded Contract Section */}
                            <div className="mt-4 border-t border-slate-800 pt-3">
                                <p className="text-slate-400 font-bold text-xs uppercase mb-3">Contrato Completo (Obligatorio)</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <FileInput label="Pág. 1" field="contrato" />
                                    <FileInput label="Pág. 2" field="contrato2" />
                                    <FileInput label="Pág. 3" field="contrato3" />
                                    <FileInput label="Pág. 4" field="contrato4" />
                                    <FileInput label="Pág. 5" field="contrato5" />
                                    <FileInput label="Pág. 6" field="contrato6" />
                                </div>
                            </div>

                            {/* Optional Documents Section */}
                            <div className="mt-4 border-t border-slate-800 pt-3 bg-slate-800/20 p-3 rounded-lg">
                                <p className="text-blue-400 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-3 w-3" /> Documentos Adicionales (Opcional)
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <FileInput label="Carta Autorización" field="cartaAutorizacion" />
                                    <FileInput label="Listado Comercial" field="listadoComercial" />
                                    <FileInput label="Formato Firmas" field="formatoFirmas" />
                                    <FileInput label="DJ Propiedad" field="djPropiedad" />
                                    <FileInput label="BonoGas" field="bonogas" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <button onClick={() => handleSave(true)} disabled={loading} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl flex justify-center items-center gap-2 border border-slate-700">
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} Guardar Avance
                            </button>
                            <button onClick={() => handleSave(false)} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-orange-900/20">
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle className="h-4 w-4" />} Finalizar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'incompletos' && (
                <div className="space-y-3">
                    {incompleteSales.length === 0 && <div className="text-center py-12 text-slate-500">No tienes registros pendientes de completar.</div>}
                    {incompleteSales.map(sale => {
                        const timeStatus = checkTimeRemaining(sale.fecha_creacion);
                        return (
                            <div key={sale.id_dni} onClick={() => loadIncomplete(sale)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors">{sale.cliente_nombre}</h3>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${timeStatus.expired ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                        <Clock className="h-3 w-3" /> {timeStatus.text}
                                    </div>
                                </div>
                                <div className="text-sm text-slate-400 mb-1">{sale.cliente_direccion}</div>
                                <div className="flex justify-between items-center text-xs text-slate-500 mt-3 border-t border-slate-800 pt-2">
                                    <span>Creado: {new Date(sale.fecha_creacion).toLocaleDateString()}</span>
                                    <span className="text-orange-500 font-medium flex items-center gap-1">Continuar Registro <CheckCircle className="h-3 w-3" /></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'ventas' && (
                <div className="space-y-3">
                    {sales.map(sale => (
                        <div key={sale.id_dni} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-white text-base">{sale.cliente_nombre}</h3>
                                    <div className="text-xs text-slate-500">{new Date(sale.fecha_creacion).toLocaleDateString()}</div>
                                </div>
                                <div className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${getStatusColor(sale)}`}>
                                    {getStatusLabel(sale)}
                                </div>
                            </div>
                            <div className="text-sm text-slate-400 mb-2 truncate">{sale.cliente_direccion}</div>

                            {sale.estado_fise === 'Rechazado' && sale.motivo_rechazo && (
                                <div className="mt-2 bg-red-950/30 border border-red-900/50 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1"><AlertTriangle className="h-3 w-3" /> Motivo de Rechazo:</div>
                                    <p className="text-xs text-slate-300 ml-5">{sale.motivo_rechazo}</p>
                                </div>
                            )}

                            {sale.estado_operativo === 'Habilitado' && (
                                <div className="mt-2 bg-purple-900/10 border border-purple-500/20 p-2 rounded-lg flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-purple-400" />
                                    <span className="text-xs text-purple-200">¡Cliente Habilitado y Listo!</span>
                                </div>
                            )}

                            {sale.estado_operativo === 'Por Aprobar Habilitacion' && (
                                <div className="mt-2 bg-pink-900/10 border border-pink-500/20 p-2 rounded-lg flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-pink-400" />
                                    <span className="text-xs text-pink-200">Habilitador terminó. Esperando aprobación Admin.</span>
                                </div>
                            )}

                            <button
                                onClick={() => setReviewJob(sale)}
                                className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700"
                            >
                                <Eye className="h-3 w-3" /> Ver Evidencias
                            </button>

                            {/* Edit Button for Pendiente/Rechazado */}
                            {(sale.estado_fise === 'Pendiente' || sale.estado_fise === 'Rechazado' || sale.estado_fise === 'Observado') && (
                                <button
                                    onClick={() => loadIncomplete(sale)}
                                    className="w-full mt-2 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 hover:text-orange-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-orange-500/20"
                                >
                                    <UserPlus className="h-3 w-3" /> Modificar
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {reviewJob && (
                <HistoryDetailModal
                    job={reviewJob}
                    role="vendedor"
                    onClose={() => setReviewJob(null)}
                />
            )}
        </div>
    );
}
