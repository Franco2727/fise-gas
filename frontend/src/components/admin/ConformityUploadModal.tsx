'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Upload, Loader2, CheckCircle, FileText } from 'lucide-react';

interface ConformityUploadModalProps {
    dni: string;
    onClose: () => void;
    onSuccess: (url: string) => void;
}

export default function ConformityUploadModal({ dni, onClose, onSuccess }: ConformityUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            if (f.type.startsWith('image/')) {
                setPreview(URL.createObjectURL(f));
            } else {
                setPreview(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        try {
            const ext = file.name.split('.').pop();
            const fileName = `${dni}/conformidad_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage.from('evidencias-fise').upload(fileName, file);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from('evidencias-fise').getPublicUrl(fileName);
            onSuccess(publicUrl);
        } catch (error: any) {
            alert('Error subiendo archivo: ' + error.message);
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <CheckCircle className="text-green-500" /> Aprobar y Finalizar
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                    Para aprobar esta habilitación, debes subir la <strong>Conformidad de Inspección</strong> de la empresa externa.
                </p>

                <div className="mb-6">
                    <label className="block w-full border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                        <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />

                        {file ? (
                            <div className="text-center">
                                {preview ? (
                                    <div className="w-20 h-20 bg-slate-800 rounded-lg mb-3 mx-auto overflow-hidden border border-slate-600">
                                        <img src={preview} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                                )}
                                <span className="text-green-400 font-bold block">{file.name}</span>
                                <span className="text-slate-500 text-xs">Click para cambiar</span>
                            </div>
                        ) : (
                            <>
                                <div className="bg-slate-800 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="h-6 w-6 text-blue-400" />
                                </div>
                                <span className="text-slate-300 font-medium">Subir Documento</span>
                                <span className="text-slate-500 text-xs mt-1">Imagen o PDF</span>
                            </>
                        )}
                    </label>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                >
                    {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                    {uploading ? 'Subiendo y Aprobando...' : 'Confirmar Aprobación'}
                </button>
            </div>
        </div>
    );
}
