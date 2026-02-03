'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'login' | 'forgot_password'>('login');
    const [resetSent, setResetSent] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Trying password login first
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Redirect based on role (mock logic for now, or check metadata)
            const role = data.user.user_metadata.role || 'tecnico';

            if (role === 'admin') router.push('/admin/dashboard');
            else if (role === 'tecnico') router.push('/technician/dashboard');
            else if (role === 'habilitador') router.push('/habilitador/dashboard');
            else if (role === 'vendedor') router.push('/vendedor/dashboard');
            else if (role === 'supervisor') router.push('/supervisor/dashboard');
            else router.push('/'); // Fallback

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Se usa el redirect a la página que acabamos de crear
            // IMPORTANTE: En producción usar la URL real, en local localhost
            const redirectTo = window.location.origin + '/update-password';

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo,
            });

            if (error) throw error;

            setResetSent(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">FISE GAS</h1>
                    <p className="text-slate-400">
                        {view === 'login' ? 'Acceso al Sistema Operativo' : 'Recuperar Contraseña'}
                    </p>
                </div>

                {view === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>

                        <div className="mt-6 text-center text-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setView('forgot_password');
                                    setError(null);
                                }}
                                className="text-slate-400 hover:text-blue-400 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {!resetSent ? (
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div className="text-sm text-slate-400 mb-4">
                                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Correo Electrónico
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-500 transition-all"
                                            placeholder="usuario@ejemplo.com"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        'Enviar Enlace'
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-green-500/10 text-green-400 rounded-lg">
                                    ¡Correo enviado! Revisa tu bandeja de entrada.
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Hemos enviado un enlace a <strong>{email}</strong>
                                </p>
                            </div>
                        )}

                        <div className="text-center text-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setView('login');
                                    setResetSent(false);
                                    setError(null);
                                }}
                                className="text-slate-400 hover:text-blue-400 transition-colors"
                            >
                                Volver al inicio de sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
