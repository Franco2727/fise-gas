'use client';

import { useState } from 'react';
import ValidationList from '@/components/admin/ValidationList';
import RequestsHistory from '@/components/admin/RequestsHistory';
import { LogOut, ListFilter, FileCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SupervisorDashboard() {
    const [activeTab, setActiveTab] = useState<'validation' | 'history'>('validation');
    const { signOut, user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Panel de Supervisión</h1>
                    <p className="text-slate-400">Bienvenido, {user?.user_metadata?.full_name || 'Supervisor'}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg transition-colors font-medium border border-red-500/10"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </header>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('validation')}
                    className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all shrink-0 ${activeTab === 'validation'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    <FileCheck className="h-5 w-5" />
                    Validar Ventas
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all shrink-0 ${activeTab === 'history'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                >
                    <ListFilter className="h-5 w-5" />
                    Historial
                </button>
            </div>

            <main>
                {activeTab === 'validation' && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Ventas por Validar</h2>
                            <span className="text-sm text-slate-500">Filtrado por: Estado = Pendiente</span>
                        </div>
                        <ValidationList />
                    </section>
                )}

                {activeTab === 'history' && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Historial de Validaciones</h2>
                            <span className="text-sm text-slate-500">Todos los estados</span>
                        </div>
                        <RequestsHistory />
                    </section>
                )}
            </main>
        </div>
    );
}
