'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';

export default function AdminStatsCards() {
    const [stats, setStats] = useState({
        pendingValidation: 0,
        pendingHabilitation: 0,
        criticalHabilitation: 0,
        monthlyRevenue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // 1. Pending Validation
                const { count: pvCount } = await supabase
                    .from('operaciones_maestra')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado_fise', 'Pendiente');

                // 2. Pending Habilitation (estado_operativo = Instalado)
                const { data: phData } = await supabase
                    .from('operaciones_maestra')
                    .select('fecha_instalacion')
                    .eq('estado_operativo', 'Instalado');

                const criticalCount = phData?.filter(job => {
                    const diff = Date.now() - new Date(job.fecha_instalacion).getTime();
                    return diff > 48 * 60 * 60 * 1000;
                }).length || 0;

                // 3. Revenue MTD
                const firstDayMonth = new Date();
                firstDayMonth.setDate(1);
                firstDayMonth.setHours(0, 0, 0, 0);

                const { data: revData } = await supabase
                    .from('operaciones_maestra')
                    .select('ingreso_total')
                    .not('fecha_habilitacion', 'is', null)
                    .gte('fecha_habilitacion', firstDayMonth.toISOString());

                const totalRevenue = revData?.reduce((acc, curr) => acc + (Number(curr.ingreso_total) || 0), 0) || 0;

                setStats({
                    pendingValidation: pvCount || 0,
                    pendingHabilitation: phData?.length || 0,
                    criticalHabilitation: criticalCount,
                    monthlyRevenue: totalRevenue
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const Card = ({ title, value, icon: Icon, color, subtext, critical }: any) => (
        <div className={`bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden transition-all hover:border-slate-700 ${critical ? 'animate-critical border-red-500/50 shadow-red-900/10' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 ${color}`}>
                    <Icon className="h-6 w-6" />
                </div>
                {critical && (
                    <span className="bg-red-600 text-[10px] font-bold text-white px-2 py-1 rounded uppercase animate-pulse">
                        Urgente
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
                <p className="text-3xl font-bold text-white tracking-tight">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-700" /> : value}
                </p>
                {subtext && <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">{subtext}</p>}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card
                title="Ventas x Validar"
                value={stats.pendingValidation}
                icon={AlertCircle}
                color="text-blue-400"
                subtext="Paso 1: Filtro FISE"
            />
            <Card
                title="Pend. Habilitación"
                value={stats.pendingHabilitation}
                icon={Clock}
                color="text-purple-400"
                subtext="Instalaciones sin acta"
            />
            <Card
                title="Alerta Crítica"
                value={stats.criticalHabilitation}
                icon={AlertCircle}
                color="text-red-500"
                critical={stats.criticalHabilitation > 0}
                subtext="+48h sin habilitar"
            />
            <Card
                title="Ingresos del Mes"
                value={`S/. ${stats.monthlyRevenue.toLocaleString()}`}
                icon={TrendingUp}
                color="text-green-500"
                subtext="Ingresos Habilitados"
            />
        </div>
    );
}
