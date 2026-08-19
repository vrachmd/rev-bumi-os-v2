import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeliveryItem } from '../types';

const KEY_QUEUE = 'rev_offline_queue';
const KEY_DELETE_QUEUE = 'rev_offline_delete_queue';

/**
 * Offline queue Fase 1 — menyimpan delivery yang gagal / dibuat saat offline
 * ke AsyncStorage, lalu replay saat `isOnline` kembali true.
 * Struktur ringan: tidak pakai Expo SQLite, cukup JSON array.
 */

export interface QueuedDelivery {
  delivery: DeliveryItem;
  queuedAt: string;
  attempts: number;
}

// Mutex sederhana untuk load→save atomic (hindari last-write-wins saat toggle cepat)
let queueLock: Promise<void> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queueLock.then(fn, fn);
  // jangan biarkan lock macet bila fn gagal
  queueLock = next.then(
    () => {},
    () => {}
  );
  return next;
}

export async function loadQueue(): Promise<QueuedDelivery[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedDelivery[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveQueue(items: QueuedDelivery[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_QUEUE, JSON.stringify(items));
  } catch {}
}

export async function enqueueDelivery(delivery: DeliveryItem): Promise<void> {
  return withQueueLock(async () => {
    const q = await loadQueue();
    // ganti entry lama dengan id sama (update terbaru), reset attempts
    const next = [...q.filter((x) => x.delivery.id !== delivery.id), { delivery, queuedAt: new Date().toISOString(), attempts: 0 }];
    await saveQueue(next);
  });
}

export async function dequeueDelivery(deliveryId: string): Promise<void> {
  return withQueueLock(async () => {
    const q = await loadQueue();
    await saveQueue(q.filter((x) => x.delivery.id !== deliveryId));
  });
}

// Dipakai replay untuk increment attempts + cap 5x gagal (hindari loop selamanya)
export async function bumpAttempts(deliveryId: string): Promise<number> {
  return withQueueLock(async () => {
    const q = await loadQueue();
    const idx = q.findIndex((x) => x.delivery.id === deliveryId);
    if (idx === -1) return -1;
    q[idx]!.attempts += 1;
    const attempts = q[idx]!.attempts;
    if (attempts >= 5) {
      // drop setelah 5 gagal (RLS/validasi) — sudah log di audit lokal
      await saveQueue(q.filter((x) => x.delivery.id !== deliveryId));
    } else {
      await saveQueue(q);
    }
    return attempts;
  });
}

// Delete queue — id ritase yang dihapus saat offline (SCHEDULED only)
export async function loadDeleteQueue(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DELETE_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let deleteLock: Promise<void> = Promise.resolve();
function withDeleteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = deleteLock.then(fn, fn);
  deleteLock = next.then(
    () => {},
    () => {}
  );
  return next;
}

export async function enqueueDelete(deliveryId: string): Promise<void> {
  return withDeleteLock(async () => {
    const q = await loadDeleteQueue();
    if (q.includes(deliveryId)) return;
    q.push(deliveryId);
    await AsyncStorage.setItem(KEY_DELETE_QUEUE, JSON.stringify(q));
  });
}

export async function dequeueDelete(deliveryId: string): Promise<void> {
  return withDeleteLock(async () => {
    const q = await loadDeleteQueue();
    await AsyncStorage.setItem(KEY_DELETE_QUEUE, JSON.stringify(q.filter((x) => x !== deliveryId)));
  });
}

export async function clearDeleteQueue(): Promise<void> {
  await AsyncStorage.removeItem(KEY_DELETE_QUEUE);
}
