import { set, get, del, keys } from 'idb-keyval';
import { supabase } from '@/lib/supabase';

export type OfflineActionType = 'UPLOAD_INSTALLATION' | 'UPLOAD_HABILITATION';

export interface OfflineItem {
    id: string; // Unique ID (e.g., job ID + timestamp)
    type: OfflineActionType;
    payload: any;
    timestamp: number;
}

const QUEUE_KEY = 'offline-queue';

export const OfflineService = {
    async addToQueue(item: OfflineItem) {
        const queue = (await get<OfflineItem[]>(QUEUE_KEY)) || [];
        queue.push(item);
        await set(QUEUE_KEY, queue);
        return queue.length;
    },

    async getQueue() {
        return (await get<OfflineItem[]>(QUEUE_KEY)) || [];
    },

    async clearQueue() {
        await del(QUEUE_KEY);
    },

    async syncQueue() {
        const queue = (await get<OfflineItem[]>(QUEUE_KEY)) || [];
        if (queue.length === 0) return;

        console.log(`Syncing ${queue.length} items...`);

        const failedItems: OfflineItem[] = [];

        for (const item of queue) {
            try {
                if (item.type === 'UPLOAD_INSTALLATION') {
                    await processUpload(item.payload, 'instalacion');
                } else if (item.type === 'UPLOAD_HABILITATION') {
                    await processUpload(item.payload, 'acta_habilitacion');
                }
            } catch (error) {
                console.error('Sync failed for item', item, error);
                failedItems.push(item); // Keep retrying? Logic depends on error. 
                // For now, if it fails, we keep it. Ideally we should have retry limits.
            }
        }

        // Update queue with only failed items
        if (failedItems.length > 0) {
            await set(QUEUE_KEY, failedItems);
        } else {
            await del(QUEUE_KEY);
        }
    }
};

async function processUpload(payload: any, typeField: string) {
    const { id_dni, fileBlob, fileName, metros_lineales } = payload;

    // 1. Upload File
    // Note: fileBlob needs to be a Blob/File. IndexedDB stores them fine.
    const { error: uploadError } = await supabase.storage
        .from('evidencias-fise')
        .upload(fileName, fileBlob);

    if (uploadError) {
        // If error is "duplicate", maybe we proceed?
        // simple retry logic: throw to keep in queue
        throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('evidencias-fise')
        .getPublicUrl(fileName);

    // 2. Update Record
    const updateData: any = { estado_operativo: typeField === 'instalacion' ? 'Instalado' : 'Habilitado' };
    if (typeField === 'instalacion') {
        updateData.foto_instalacion = publicUrl;
        if (metros_lineales) updateData.metros_lineales = metros_lineales;
    }
    else updateData.foto_acta_habilitacion = publicUrl;

    const { error: dbError } = await supabase
        .from('operaciones_maestra')
        .update(updateData)
        .eq('id_dni', id_dni);

    if (dbError) throw dbError;
}
