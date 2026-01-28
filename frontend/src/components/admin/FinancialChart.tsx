'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function FinancialChart() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch last 6 months of habilitated operations
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                const { data: operations, error } = await supabase
                    .from('operaciones_maestra')
                    .select('ingreso_total, costo_materiales, fecha_habilitacion')
                    .not('fecha_habilitacion', 'is', null)
                    .gte('fecha_habilitacion', sixMonthsAgo.toISOString());

                if (error) throw error;

                // Group by month
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const grouped: Record<string, any> = {};

                operations.forEach(op => {
                    const date = new Date(op.fecha_habilitacion);
                    const monthName = months[date.getMonth()];
                    const key = `${monthName}`;

                    if (!grouped[key]) {
                        grouped[key] = { name: monthName, ingresos: 0, costo: 0, sort: date.getMonth() };
                    }
                    grouped[key].ingresos += Number(op.ingreso_total) || 0;
                    grouped[key].costo += Number(op.costo_materiales) || 0;
                });

                const chartData = Object.values(grouped)
                    .sort((a: any, b: any) => a.sort - b.sort)
                    .map(item => ({
                        ...item,
                        utilidad: item.ingresos - item.costo
                    }));

                setData(chartData);
            } catch (err) {
                console.error('Error fetching financial data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return (
        <div className="h-[400px] w-full bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500 h-8 w-8" />
        </div>
    );

    return (
        <div className="h-[400px] w-full bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Rentabilidad Mensual</h3>
                <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20 font-bold uppercase">Real-Time</span>
            </div>
            {data.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 pb-12">
                    <p>No hay datos financieros habilitados aún.</p>
                    <p className="text-xs">Los ingresos se registran al completar la habilitación.</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', border: '1px solid #475569' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Legend />
                        <Bar dataKey="ingresos" fill="#3b82f6" name="Ingresos (S/.)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="costo" fill="#ef4444" name="Costos (S/.)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="utilidad" fill="#10b981" name="Utilidad Neta" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
