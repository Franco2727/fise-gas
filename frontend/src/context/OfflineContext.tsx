'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { OfflineService } from '@/services/OfflineService';

interface OfflineContextType {
    isOnline: boolean;
    pendingItems: number;
    syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingItems, setPendingItems] = useState(0);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);
        updatePendingCount();

        const handleOnline = () => {
            setIsOnline(true);
            OfflineService.syncQueue().then(() => updatePendingCount());
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial sync attempt if online
        if (navigator.onLine) {
            OfflineService.syncQueue().then(() => updatePendingCount());
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updatePendingCount = async () => {
        const queue = await OfflineService.getQueue();
        setPendingItems(queue.length);
    };

    const syncNow = async () => {
        if (isOnline) {
            await OfflineService.syncQueue();
            await updatePendingCount();
        }
    };

    return (
        <OfflineContext.Provider value={{ isOnline, pendingItems, syncNow }}>
            {children}
            {/* Offline Indicator / Sync Status */}
            {!isOnline && (
                <div className="fixed bottom-0 left-0 right-0 bg-yellow-600 text-white text-center py-1 text-xs font-bold z-50">
                    Modo Sin Conexión - Los datos se guardarán localmente
                </div>
            )}
            {isOnline && pendingItems > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white text-center py-1 text-xs font-bold z-50 animate-pulse">
                    Sincronizando {pendingItems} operaciones pendientes...
                </div>
            )}
        </OfflineContext.Provider>
    );
}

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};
