'use client';

import Link from 'next/link';
import { ShieldCheck, Zap, BarChart3, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="p-6 flex justify-between items-center border-b border-slate-900">
        <h1 className="text-2xl font-bold text-white tracking-tight">FISE GAS</h1>
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
        >
          Acceso Coporativo
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
              Gestión Operativa <span className="text-blue-500">Inteligente</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Plataforma integral para masificación de gas. Control total desde captación hasta habilitación.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
              <ShieldCheck className="h-12 w-12 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold text-white mb-2">Validación Segura</h3>
              <p className="text-slate-500">Control de contratos y aprobación centralizada.</p>
            </div>
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-green-500/50 transition-colors group">
              <Zap className="h-12 w-12 text-green-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold text-white mb-2">Operaciones en Campo</h3>
              <p className="text-slate-500">Gestión técnica móvil con evidencia fotográfica.</p>
            </div>
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-colors group">
              <BarChart3 className="h-12 w-12 text-purple-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold text-white mb-2">Analítica Real</h3>
              <p className="text-slate-500">Métricas financieras y operativas al instante.</p>
            </div>
          </div>

          <div className="pt-12">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              Ir al portal de empleados <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-600 text-sm border-t border-slate-900">
        © 2024 FISE Gas Project. Sistema confidencial.
      </footer>
    </div>
  );
}
