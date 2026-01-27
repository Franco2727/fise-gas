'use client';

import { Search, Clock, MapPin, AlertCircle } from 'lucide-react';

interface Job {
    id_dni: string;
    cliente_nombre: string;
    cliente_direccion: string;
    fecha_instalacion: string;
}

interface JobsListSidebarProps {
    jobs: Job[];
    selectedJobId: string | null;
    onSelectJob: (job: Job) => void;
}

export default function JobsListSidebar({ jobs, selectedJobId, onSelectJob }: JobsListSidebarProps) {
    return (
        <div className="w-full md:w-80 flex flex-col bg-slate-900 border-r border-slate-800 h-full">
            <div className="p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                <h2 className="text-white font-bold mb-3 flex items-center justify-between">
                    Pendientes
                    <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">{jobs.length}</span>
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="search"
                        placeholder="Buscar cliente..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {jobs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        No hay instalaciones pendientes.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {jobs.map(job => {
                            // Priority Check: > 48 hours
                            const hoursSinceInstall = (Date.now() - new Date(job.fecha_instalacion).getTime()) / (1000 * 60 * 60);
                            const isPriority = hoursSinceInstall > 48;

                            return (
                                <div
                                    key={job.id_dni}
                                    onClick={() => onSelectJob(job)}
                                    className={`p-4 cursor-pointer hover:bg-slate-800 transition-colors ${selectedJobId === job.id_dni ? 'bg-blue-900/20 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-bold text-sm ${selectedJobId === job.id_dni ? 'text-white' : 'text-slate-300'}`}>{job.cliente_nombre}</h3>
                                        {isPriority && <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2 truncate">{job.cliente_direccion}</p>

                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {isPriority
                                                ? <span className="text-red-400 font-bold">Hace {Math.floor(hoursSinceInstall)}h</span>
                                                : new Date(job.fecha_instalacion).toLocaleDateString()
                                            }
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
