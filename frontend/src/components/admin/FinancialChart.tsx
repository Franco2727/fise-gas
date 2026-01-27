'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock data (replace with real data fetching)
const data = [
    { name: 'Ene', ingresos: 4000, costo: 2400 },
    { name: 'Feb', ingresos: 3000, costo: 1398 },
    { name: 'Mar', ingresos: 2000, costo: 9800 },
    { name: 'Abr', ingresos: 2780, costo: 3908 },
    { name: 'May', ingresos: 1890, costo: 4800 },
    { name: 'Jun', ingresos: 2390, costo: 3800 },
];

// Helper to calculate utility
const calculatedData = data.map(item => ({
    ...item,
    utilidad: item.ingresos - item.costo
}));

export default function FinancialChart() {
    return (
        <div className="h-[400px] w-full bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-6">Rentabilidad Mensual</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={calculatedData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#3b82f6" name="Ingresos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="costo" fill="#ef4444" name="Costos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="utilidad" fill="#10b981" name="Utilidad Neta" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
